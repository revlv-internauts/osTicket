<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Models\User;
use App\Models\Email;
use App\Models\HelpTopic;
use App\Services\MailtrapService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Carbon\Carbon;

class TicketController extends Controller   
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $allTickets = Ticket::with([
            'user', 
            'assignedToUser', 
            'helpTopicRelation', 
            'ccEmails',
            'recipientEmails',
            'openedByUser',
            'closedByUser'
        ])
        ->orderBy('created_at', 'desc')
        ->get();
       
        $myTickets = Ticket::with([
            'user', 
            'assignedToUser', 
            'helpTopicRelation', 
            'ccEmails',
            'recipientEmails',
            'openedByUser',
            'closedByUser'
        ])
        ->where('user_id', Auth::id())
        ->orderBy('created_at', 'desc')
        ->get();
        
        $users = User::select('id', 'name')->get();
        $emails = Email::select('id', 'email_address', 'name')->get();
        $helpTopics = HelpTopic::select('id', 'name')->get();

        return Inertia::render('ticket', [
            'tickets'    => $allTickets,
            'myTickets'  => $myTickets,
            'users'      => $users,
            'emails'     => $emails,
            'helpTopics' => $helpTopics,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $users = User::select('id', 'name')->get();
        $emails = Email::select('id', 'email_address', 'name')->get();
        $helpTopics = HelpTopic::select('id', 'name')->get();

        return Inertia::render('Tickets/Create', [
            'users'      => $users,
            'emails'     => $emails,
            'helpTopics' => $helpTopics,
        ]);
    }

    /**
     * Generate auto-incrementing ticket name
     */
    private function generateTicketName($helpTopicId)
    {
        $helpTopic = HelpTopic::find($helpTopicId);
        
        if (!$helpTopic) {
            return null;
        }

        $lastTicket = Ticket::where('help_topic', $helpTopicId)
            ->where('ticket_name', 'LIKE', $helpTopic->name . '-%')
            ->orderBy('id', 'desc')
            ->first();

        if ($lastTicket) {
            preg_match('/-(\d+)$/', $lastTicket->ticket_name, $matches);
            $lastNumber = isset($matches[1]) ? (int)$matches[1] : 0;
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return $helpTopic->name . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }   
    
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id'       => 'required|exists:users,id',
            'recipient'     => 'nullable|array',
            'recipient.*'   => 'exists:emails,id',
            'cc'            => 'nullable|array',
            'cc.*'          => 'exists:emails,id',
            'ticket_source' => 'required|string',
            'help_topic'    => 'required|exists:help_topics,id',
            'department'    => 'required|string',
            'downtime'      => 'required|date',
            'assigned_to'   => 'required|exists:users,id',
            'body'          => 'required|string',
            'status'        => 'nullable|string',
            'priority'      => 'required|string',
            'images.*'      => 'nullable|file|mimes:jpeg,jpg,png,gif,pdf,doc,docx|max:8192',
        ], [
            'images.*.mimes' => 'Each file must be a valid image (jpeg, jpg, png, gif) or document (pdf, doc, docx).',
            'images.*.max' => 'Each file must not exceed 8MB in size.',
        ]);

        if (Auth::id() != $validated['user_id']) {
            return back()->withErrors(['user_id' => 'You cannot create tickets for other users.']);
        }

        // Additional validation for total file size
        if ($request->hasFile('images')) {
            $totalSize = 0;
            foreach ($request->file('images') as $file) {
                $totalSize += $file->getSize();
            }
            
            $maxTotalSize = 8 * 1024 * 1024; // 8MB
            if ($totalSize > $maxTotalSize) {
                return back()->withErrors(['images' => 'Total file size must not exceed 8MB.'])->withInput();
            }
        }

        $ticketName = $this->generateTicketName($validated['help_topic']);
        
        if (!$ticketName) {
            return back()->withErrors(['help_topic' => 'Invalid help topic selected.']);
        }

        $validated['ticket_name'] = $ticketName;
        $validated['opened_by'] = Auth::id();
        
        $processedResponse = $validated['body'];
        
        if (!empty($processedResponse)) {
            preg_match_all('/<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/i', $processedResponse, $matches);
            
            foreach ($matches[0] as $index => $fullMatch) {
                $imageType = $matches[1][$index];
                $base64Data = $matches[2][$index];
                
                $imageData = base64_decode($base64Data);
                $fileName = 'ticket-' . uniqid() . '.' . $imageType;
                $path = 'ticket-images/' . $fileName;
                
                Storage::disk('public')->put($path, $imageData);

                $url = asset('storage/' . $path);
                $processedResponse = str_replace($fullMatch, '<img src="' . $url . '" alt="Ticket Image" />', $processedResponse);
            }
        }
        
        $validated['body'] = $processedResponse;
        
        $ccEmails = $validated['cc'] ?? [];
        $recipientEmails = $validated['recipient'] ?? [];
        unset($validated['cc']);
        unset($validated['recipient']);
        unset($validated['images']);
        
        $ticket = Ticket::create($validated);
        
        // Store file attachments in separate table
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $fileName = time() . '-' . uniqid() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('ticket-attachments', $fileName, 'public');
                
                $ticket->attachments()->create([
                    'original_filename' => $file->getClientOriginalName(),
                    'filename' => $fileName,
                    'path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);
            }
        }

        if (!empty($ccEmails)) {
            $ticket->ccEmails()->attach($ccEmails);
        }

        if (!empty($recipientEmails)) {
            $ticket->recipientEmails()->attach($recipientEmails);
        }

        $ticket->load(['user', 'assignedToUser', 'helpTopicRelation', 'ccEmails', 'recipientEmails', 'attachments']);

        try {
            $mailtrapService = new MailtrapService();
            
            if ($ticket->user && $ticket->user->email) {
                $mailtrapService->sendTicketCreated($ticket, $ticket->user->email);
            }

            if ($ticket->recipientEmails && $ticket->recipientEmails->count() > 0) {
                foreach ($ticket->recipientEmails as $recipientEmail) {
                    $mailtrapService->sendTicketCreated($ticket, $recipientEmail->email_address);
                }
            }

            if ($ticket->assigned_to && $ticket->assignedToUser && $ticket->assignedToUser->email) {
                $mailtrapService->sendTicketCreated($ticket, $ticket->assignedToUser->email);
            }

            if ($ticket->ccEmails && $ticket->ccEmails->count() > 0) {
                foreach ($ticket->ccEmails as $ccEmail) {
                    $mailtrapService->sendTicketCreated($ticket, $ccEmail->email_address);
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to send ticket creation email: ' . $e->getMessage());
        }

        return redirect()->route('tickets.index')
            ->with('success', 'Ticket created successfully with ID: ' . $ticketName);
    }

    /**
     * Display the specified resource.
     */
    public function show(Ticket $ticket)
    {
        $ticket->load([
            'user', 
            'assignedToUser', 
            'helpTopicRelation', 
            'ccEmails',
            'recipientEmails',
            'openedByUser',
            'closedByUser'
        ]);
        
        return Inertia::render('Tickets/Show', [
            'ticket' => $ticket
        ]);
    }

    /**
     * Check if the current user can edit/close the ticket.
     */
    private function canEditTicket(Ticket $ticket)
    {
        $userId = Auth::id();
        return $userId === $ticket->opened_by || $userId === $ticket->assigned_to;
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Ticket $ticket)
    {
        if (!$this->canEditTicket($ticket)) {
            return redirect()->route('tickets.index')
                ->with('error', 'You do not have permission to edit this ticket. Only the user who opened it or the assigned user can edit.');
        }

        $ticket->load([
            'user', 
            'assignedToUser', 
            'helpTopicRelation', 
            'ccEmails',
            'recipientEmails',
            'attachments',
            'openedByUser',
            'closedByUser'
        ]);

        $users = User::select('id', 'name')->get();

        return Inertia::render('Tickets/Edit', [
            'ticket' => $ticket,
            'users' => $users,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Ticket $ticket)
    {
        if (!$this->canEditTicket($ticket)) {
            return back()->withErrors(['authorization' => 'You do not have permission to update this ticket. Only the user who opened it or the assigned user can update.']);
        }

        $validated = $request->validate([
            'body' => 'nullable|string',
            'status' => 'nullable|string|in:Open,Closed',
            'assigned_to' => 'nullable|exists:users,id',
            'priority' => 'nullable|string|in:Low,Medium,High',
            'images' => 'nullable|array',
            'images.*' => 'nullable|file|mimes:jpeg,jpg,png,gif,pdf,doc,docx|max:8192',
        ], [
            'images.*.mimes' => 'Each file must be a valid image (jpeg, jpg, png, gif) or document (pdf, doc, docx).',
            'images.*.max' => 'Each file must not exceed 8MB in size.',
        ]);

        // Additional validation for total file size
        if ($request->hasFile('images')) {
            $totalSize = 0;
            foreach ($request->file('images') as $file) {
                $totalSize += $file->getSize();
            }
            
            $maxTotalSize = 8 * 1024 * 1024; // 8MB
            if ($totalSize > $maxTotalSize) {
                return back()->withErrors(['images' => 'Total file size must not exceed 8MB.'])->withInput();
            }
        }

        $updateData = [];
        $changes = [];

        if (isset($validated['assigned_to']) && $validated['assigned_to'] != $ticket->assigned_to) {
            // Log the change to history
            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'field_name' => 'assigned_to',
                'old_value' => $ticket->assigned_to ? User::find($ticket->assigned_to)?->name : 'Unassigned',
                'new_value' => $validated['assigned_to'] ? User::find($validated['assigned_to'])?->name : 'Unassigned',
                'changed_by' => Auth::id(),
            ]);
            
            $updateData['assigned_to'] = $validated['assigned_to'];
            $assignedUser = User::find($validated['assigned_to']);
            $changes['Assigned To'] = $assignedUser ? $assignedUser->name : 'Unassigned';
        }

        if (isset($validated['priority']) && $validated['priority'] != $ticket->priority) {
            // Log the change to history
            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'field_name' => 'priority',
                'old_value' => $ticket->priority,
                'new_value' => $validated['priority'],
                'changed_by' => Auth::id(),
            ]);
            
            $updateData['priority'] = $validated['priority'];
            $changes['Priority'] = $validated['priority'];
        }

        if (isset($validated['body'])) {
            $processedResponse = $validated['body'];
            $imagePaths = json_decode($ticket->image_paths ?? '[]', true);
            
            preg_match_all('/<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/i', $processedResponse, $matches);
            
            foreach ($matches[0] as $index => $fullMatch) {
                $imageType = $matches[1][$index];
                $base64Data = $matches[2][$index];
                
                $imageData = base64_decode($base64Data);
                $fileName = 'ticket-' . uniqid() . '.' . $imageType;
                $path = 'ticket-images/' . $fileName;
                
                Storage::disk('public')->put($path, $imageData);
                $imagePaths[] = $path;
                
                $url = asset('storage/' . $path);
                $processedResponse = str_replace($fullMatch, '<img src="' . $url . '" alt="Ticket Image" />', $processedResponse);
            }
            
            $updateData['body'] = $processedResponse;
            $updateData['image_paths'] = !empty($imagePaths) ? json_encode($imagePaths) : null;
            $changes['Body'] = 'Updated';
        }

        $wasClosing = false;
        if (isset($validated['status'])) {
            $updateData['status'] = $validated['status'];
            
            if ($validated['status'] === 'Closed' && $ticket->status !== 'Closed') {
                $updateData['uptime'] = Carbon::now();
                $updateData['closed_by'] = Auth::id();
                $changes['Status'] = 'Closed';
                $wasClosing = true;

                $closedAt = Carbon::now();
                $openedAt = $ticket->downtime 
                    ? Carbon::parse($ticket->downtime) 
                    : Carbon::parse($ticket->created_at);

                if ($closedAt->lessThan($openedAt)) {
                    $openedAt = Carbon::parse($ticket->created_at);
                }
                
                $updateData['resolution_time'] = (int) round($openedAt->diffInMinutes($closedAt));
            }

            if ($validated['status'] === 'Open' && $ticket->status === 'Closed') {
                $updateData['uptime'] = null;
                $updateData['closed_by'] = null;
                $updateData['resolution_time'] = null;
                $changes['Status'] = 'Reopened';
            }
        }

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $fileName = time() . '-' . uniqid() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('ticket-attachments', $fileName, 'public');
                
                $ticket->attachments()->create([
                    'original_filename' => $file->getClientOriginalName(),
                    'filename' => $fileName,
                    'path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);
            }
            $changes['Attachments'] = 'Added new files';
        }

        if (!empty($updateData)) {
            $ticket->update($updateData);
            $ticket->refresh();
            $ticket->load(['user', 'assignedToUser', 'helpTopicRelation', 'ccEmails', 'recipientEmails', 'attachments', 'closedByUser']);

            try {
                $mailtrapService = new MailtrapService();
                
                if ($wasClosing) {
                    if ($ticket->user && $ticket->user->email) {
                        $mailtrapService->sendTicketClosed($ticket, $ticket->user->email);
                    }
                    if ($ticket->recipientEmails && $ticket->recipientEmails->count() > 0) {
                        foreach ($ticket->recipientEmails as $recipientEmail) {
                            $mailtrapService->sendTicketClosed($ticket, $recipientEmail->email_address);
                        }
                    }
                    if ($ticket->assigned_to && $ticket->assignedToUser && $ticket->assignedToUser->email) {
                        $mailtrapService->sendTicketClosed($ticket, $ticket->assignedToUser->email);
                    }
                    if ($ticket->ccEmails && $ticket->ccEmails->count() > 0) {
                        foreach ($ticket->ccEmails as $ccEmail) {
                            $mailtrapService->sendTicketClosed($ticket, $ccEmail->email_address);
                        }
                    }
                } else {
                    if ($ticket->user && $ticket->user->email) {
                        $mailtrapService->sendTicketUpdated($ticket, $ticket->user->email, $changes);
                    }
                    if ($ticket->recipientEmails && $ticket->recipientEmails->count() > 0) {
                        foreach ($ticket->recipientEmails as $recipientEmail) {
                            $mailtrapService->sendTicketUpdated($ticket, $recipientEmail->email_address, $changes);
                        }
                    }
                    if ($ticket->assigned_to && $ticket->assignedToUser && $ticket->assignedToUser->email) {
                        $mailtrapService->sendTicketUpdated($ticket, $ticket->assignedToUser->email, $changes);
                    }
                    if ($ticket->ccEmails && $ticket->ccEmails->count() > 0) {
                        foreach ($ticket->ccEmails as $ccEmail) {
                            $mailtrapService->sendTicketUpdated($ticket, $ccEmail->email_address, $changes);
                        }
                    }
                }
            } catch (\Exception $e) {
                \Log::error('Failed to send ticket update email: ' . $e->getMessage());
            }
        }

        return back()->with('success', 'Ticket updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Ticket $ticket)
    {
        try {
            $ticket->delete();
            
            return redirect()->back()->with('success', 'Ticket deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete ticket: ' . $e->getMessage());
        }
    }

    
}

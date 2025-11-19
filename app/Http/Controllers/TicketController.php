<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
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
            'images.*'      => 'nullable|file|mimes:jpeg,png,jpg,gif,pdf,doc,docx|max:10240',
        ]);

        if (Auth::id() != $validated['user_id']) {
            return back()->withErrors(['user_id' => 'You cannot create tickets for other users.']);
        }

        $ticketName = $this->generateTicketName($validated['help_topic']);
        
        if (!$ticketName) {
            return back()->withErrors(['help_topic' => 'Invalid help topic selected.']);
        }

        $validated['ticket_name'] = $ticketName;
        $validated['opened_by'] = Auth::id();
        
        $processedResponse = $validated['body'];
        $imagePaths = [];
        
        if (!empty($processedResponse)) {
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
        }
        
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('ticket-images', 'public');
                $imagePaths[] = $path;
            }
        }
        
        $validated['body'] = $processedResponse;
        $validated['image_paths'] = !empty($imagePaths) ? json_encode($imagePaths) : null;
        
        $ccEmails = $validated['cc'] ?? [];
        unset($validated['cc']);
        unset($validated['images']);
        
        $ticket = Ticket::create($validated);

        if (!empty($ccEmails)) {
            $ticket->ccEmails()->attach($ccEmails);
        }

        $ticket->load(['user', 'assignedToUser', 'helpTopicRelation', 'ccEmails']);

        try {
            $mailtrapService = new MailtrapService();
            
            if ($ticket->user && $ticket->user->email) {
                $mailtrapService->sendTicketCreated($ticket, $ticket->user->email);
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
            'openedByUser',
            'closedByUser'
        ]);
        
        return Inertia::render('Tickets/Show', [
            'ticket' => $ticket
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Ticket $ticket)
    {
        $ticket->load([
            'user', 
            'assignedToUser', 
            'helpTopicRelation', 
            'ccEmails',
            'openedByUser',
            'closedByUser'
        ]);

        return Inertia::render('Tickets/Edit', [
            'ticket' => $ticket,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'body' => 'nullable|string',
            'status' => 'nullable|string|in:Open,Closed',
            'images' => 'nullable|array',
            'images.*' => 'image|max:2048',
        ]);

        $updateData = [];
        $changes = [];

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
            $imagePaths = json_decode($ticket->image_paths ?? '[]', true);
            foreach ($request->file('images') as $image) {
                $path = $image->store('ticket-images', 'public');
                $imagePaths[] = $path;
            }
            $updateData['image_paths'] = json_encode($imagePaths);
            $changes['Attachments'] = 'Added new files';
        }

        if (!empty($updateData)) {
            $ticket->update($updateData);
            $ticket->refresh();
            $ticket->load(['user', 'assignedToUser', 'helpTopicRelation', 'ccEmails', 'closedByUser']);

            try {
                $mailtrapService = new MailtrapService();
                
                if ($wasClosing) {
                    if ($ticket->user && $ticket->user->email) {
                        $mailtrapService->sendTicketClosed($ticket, $ticket->user->email);
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

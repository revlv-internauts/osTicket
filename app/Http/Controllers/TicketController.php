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
use Illuminate\Support\Facades\DB;
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
            'closedByUser',
            'attachments',
            'histories.changedBy'
        ])
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function ($ticket) {
            if ($ticket->histories) {
                $ticket->histories = $ticket->histories->map(function ($history) {
                    $history->changed_by_user = $history->changedBy;
                    return $history;
                });
            }
            return $ticket;
        });
       
        $myTickets = Ticket::with([
            'user', 
            'assignedToUser', 
            'helpTopicRelation', 
            'ccEmails',
            'recipientEmails',
            'openedByUser',
            'closedByUser',
            'attachments',
            'histories.changedBy'
        ])
        ->where('user_id', Auth::id())
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function ($ticket) {
            if ($ticket->histories) {
                $ticket->histories = $ticket->histories->map(function ($history) {
                    $history->changed_by_user = $history->changedBy;
                    return $history;
                });
            }
            return $ticket;
        });
        
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
            ->lockForUpdate()
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

        try {
            DB::beginTransaction();

            $ticketName = $this->generateTicketName($validated['help_topic']);
            
            if (!$ticketName) {
                DB::rollBack();
                return back()->withErrors(['help_topic' => 'Invalid help topic selected.'])->withInput();
            }

            $validated['ticket_name'] = $ticketName;
            $validated['opened_by'] = Auth::id();
            
            $ccEmails = $validated['cc'] ?? [];
            $recipientEmails = $validated['recipient'] ?? [];
            unset($validated['cc']);
            unset($validated['recipient']);
            unset($validated['images']);
            
            $ticket = Ticket::create($validated);
            
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

            DB::commit();

            $ticket->load(['user', 'assignedToUser', 'helpTopicRelation', 'ccEmails', 'recipientEmails', 'attachments']);

            // Send emails after successful commit
            try {
                $mailtrapService = new MailtrapService();

                $uniqueEmails = collect();

                if ($ticket->user && $ticket->user->email) {
                    $uniqueEmails->push($ticket->user->email);
                }

                if ($ticket->assigned_to && $ticket->assignedToUser && $ticket->assignedToUser->email) {
                    $uniqueEmails->push($ticket->assignedToUser->email);
                }

                if ($ticket->recipientEmails && $ticket->recipientEmails->count() > 0) {
                    foreach ($ticket->recipientEmails as $recipientEmail) {
                        $uniqueEmails->push($recipientEmail->email_address);
                    }
                }
                
                if ($ticket->ccEmails && $ticket->ccEmails->count() > 0) {
                    foreach ($ticket->ccEmails as $ccEmail) {
                        $uniqueEmails->push($ccEmail->email_address);
                    }
                }
                
                $uniqueEmails->unique()->each(function ($email) use ($mailtrapService, $ticket) {
                    $mailtrapService->sendTicketCreated($ticket, $email);
                });
            } catch (\Exception $e) {
                \Log::error('Failed to send ticket creation email: ' . $e->getMessage());
            }

            return redirect()->route('tickets.index')
                ->with('success', 'Ticket created successfully with ID: ' . $ticketName);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to create ticket: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to create ticket: ' . $e->getMessage()])->withInput();
        }
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
        $user = Auth::user();
        return $user->id === $ticket->user_id || $user->id === $ticket->assigned_to;
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
        // Check authorization first
        if (!$this->canEditTicket($ticket)) {
            abort(403, 'You are not authorized to update this ticket.');
        }

        $validated = $request->validate([
            'body' => 'sometimes|required|string',
            'priority' => 'sometimes|required|string',
            'assigned_to' => 'sometimes|required|exists:users,id',
            'status' => 'sometimes|required|string',
            'images' => 'sometimes|array',
            'images.*' => 'file|mimes:jpeg,jpg,png,gif,pdf,doc,docx|max:8192',
            'attachments_to_delete' => 'sometimes|array',
            'attachments_to_delete.*' => 'exists:ticket_attachments,id',
        ]);

        if ($request->hasFile('images')) {
            $totalSize = 0;
            foreach ($request->file('images') as $file) {
                $totalSize += $file->getSize();
            }
            
            $maxTotalSize = 8 * 1024 * 1024; 
            if ($totalSize > $maxTotalSize) {
                return back()->withErrors(['images' => 'Total file size must not exceed 8MB.'])->withInput();
            }
        }

        try {
            DB::beginTransaction();

            $updateData = [];
            $changes = [];
            $wasClosing = false;

            if (isset($validated['assigned_to']) && $validated['assigned_to'] != $ticket->assigned_to) {
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

            if (isset($validated['body']) && $validated['body'] != $ticket->body) {
                TicketHistory::create([
                    'ticket_id' => $ticket->id,
                    'field_name' => 'body',
                    'old_value' => 'Body',
                    'new_value' => 'Updated content',
                    'changed_by' => Auth::id(),
                ]);

                $updateData['body'] = $validated['body'];
                $changes['Body'] = 'Updated';
            }

            if (isset($validated['status']) && $validated['status'] != $ticket->status) {
                TicketHistory::create([
                    'ticket_id' => $ticket->id,
                    'field_name' => 'status',
                    'old_value' => $ticket->status,
                    'new_value' => $validated['status'],
                    'changed_by' => Auth::id(),
                ]);

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
            }

            DB::commit();

            if (!empty($changes)) {
                $ticket->refresh();
                $ticket->load(['user', 'assignedToUser', 'helpTopicRelation', 'ccEmails', 'recipientEmails', 'attachments', 'closedByUser']);

                // Send emails after successful commit
                try {
                    $mailtrapService = new MailtrapService();
                    
                    $uniqueEmails = collect();
                    
                    if ($ticket->user && $ticket->user->email) {
                        $uniqueEmails->push($ticket->user->email);
                    }
                    
                    if ($ticket->assigned_to && $ticket->assignedToUser && $ticket->assignedToUser->email) {
                        $uniqueEmails->push($ticket->assignedToUser->email);
                    }
                    
                    if ($ticket->recipientEmails && $ticket->recipientEmails->count() > 0) {
                        foreach ($ticket->recipientEmails as $recipientEmail) {
                            $uniqueEmails->push($recipientEmail->email_address);
                        }
                    }
                    
                    if ($ticket->ccEmails && $ticket->ccEmails->count() > 0) {
                        foreach ($ticket->ccEmails as $ccEmail) {
                            $uniqueEmails->push($ccEmail->email_address);
                        }
                    }
                    
                    // Send to unique emails only
                    if ($wasClosing) {
                        $uniqueEmails->unique()->each(function ($email) use ($mailtrapService, $ticket) {
                            $mailtrapService->sendTicketClosed($ticket, $email);
                        });
                    } else {
                        $uniqueEmails->unique()->each(function ($email) use ($mailtrapService, $ticket, $changes) {
                            $mailtrapService->sendTicketUpdated($ticket, $email, $changes);
                        });
                    }
                } catch (\Exception $e) {
                    \Log::error('Failed to send ticket update email: ' . $e->getMessage());
                }
            }

            return back()->with('success', 'Ticket updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to update ticket: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to update ticket: ' . $e->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Ticket $ticket)
    {
        try {
            DB::beginTransaction();

            // Delete attachments from storage
            foreach ($ticket->attachments as $attachment) {
                Storage::disk('public')->delete($attachment->path);
            }
            
            // Delete ticket (cascades will handle relations)
            $ticket->delete();

            DB::commit();
            
            return redirect()->back()->with('success', 'Ticket deleted successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to delete ticket: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to delete ticket: ' . $e->getMessage());
        }
    }

    /**
     * Download a ticket attachment.
     */
    public function downloadAttachment(Ticket $ticket, $attachmentId)
    {
        try {
            $attachment = $ticket->attachments()->where('id', $attachmentId)->firstOrFail();
            $filePath = storage_path('app/public/' . $attachment->path);
            
            if (!file_exists($filePath)) {
                return response()->json(['error' => 'File not found'], 404);
            }

            return response()->download($filePath, $attachment->original_filename, [
                'Content-Type' => $attachment->mime_type,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to download file'], 500);
        }
    }

    /**
     * Preview a ticket attachment (for images).
     */
    public function previewAttachment(Ticket $ticket, $attachmentId)
    {
        try {
            $attachment = $ticket->attachments()->where('id', $attachmentId)->firstOrFail();
            $filePath = storage_path('app/public/' . $attachment->path);
            
            if (!file_exists($filePath)) {
                return response()->json(['error' => 'File not found'], 404);
            }

            return response()->file($filePath, [
                'Content-Type' => $attachment->mime_type,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to load file'], 500);
        }
    }
}

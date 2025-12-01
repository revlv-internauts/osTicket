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
    public function index(Request $request)
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

        $modalTicket = null;
        if ($request->has('modal') && $request->query('modal')) {
            $modalTicket = Ticket::with([
                'user', 
                'assignedToUser', 
                'helpTopicRelation', 
                'ccEmails',
                'recipientEmails',
                'openedByUser',
                'closedByUser',
                'attachments',
                'histories.changedBy'
            ])->find($request->query('modal'));

            if ($modalTicket && $modalTicket->histories) {
                $modalTicket->histories = $modalTicket->histories->map(function ($history) {
                    $history->changed_by_user = $history->changedBy;
                    return $history;
                });
            }
        }

        return Inertia::render('ticket', [
            'tickets'    => $allTickets,
            'myTickets'  => $myTickets,
            'users'      => $users,
            'emails'     => $emails,
            'helpTopics' => $helpTopics,
            'modalTicket' => $modalTicket,
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

            try {
                $this->sendTicketCreatedEmails($ticket);
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

            $hasChanges = false;

            if (isset($validated['assigned_to'])) {
                $this->changeAssignedUser($ticket, $validated['assigned_to']);
                $hasChanges = true;
            }

            if (isset($validated['priority'])) {
                $this->changePriority($ticket, $validated['priority']);
                $hasChanges = true;
            }

            if (isset($validated['body'])) {
                $this->changeBody($ticket, $validated['body']);
                $hasChanges = true;
            }

            if (isset($validated['status'])) {
                $this->changeStatus($ticket, $validated['status']);
                $hasChanges = true;
            }

            if ($request->hasFile('images')) {
                $this->storeAttachments($ticket, $request->file('images'));
                $hasChanges = true;
            }

            DB::commit();

            if ($hasChanges) {
                try {
                    $this->sendTicketUpdatedEmails($ticket);
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
     * Update the assigned user for a ticket.
     */
    public function updateAssignment(Request $request, Ticket $ticket)
    {
        if (!$this->canEditTicket($ticket)) {
            abort(403, 'You are not authorized to update this ticket.');
        }

        $validated = $request->validate([
            'assigned_to' => 'required|exists:users,id',
        ]);

        try {
            DB::beginTransaction();

            $this->changeAssignedUser($ticket, $validated['assigned_to']);

            DB::commit();

            $this->sendTicketUpdatedEmails($ticket);

            return back()->with('success', 'Ticket assignment updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to update assignment: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to update assignment: ' . $e->getMessage()]);
        }
    }

    /**
     * Update the priority of a ticket.
     */
    public function updatePriority(Request $request, Ticket $ticket)
    {
        if (!$this->canEditTicket($ticket)) {
            abort(403, 'You are not authorized to update this ticket.');
        }

        $validated = $request->validate([
            'priority' => 'required|string|in:Low,Medium,High',
        ]);

        try {
            DB::beginTransaction();

            $this->changePriority($ticket, $validated['priority']);

            DB::commit();

            $this->sendTicketUpdatedEmails($ticket);

            return back()->with('success', 'Ticket priority updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to update priority: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to update priority: ' . $e->getMessage()]);
        }
    }

    /**
     * Update the body of a ticket.
     */
    public function updateBody(Request $request, Ticket $ticket)
    {
        if (!$this->canEditTicket($ticket)) {
            abort(403, 'You are not authorized to update this ticket.');
        }

        $validated = $request->validate([
            'body' => 'required|string',
        ]);

        try {
            DB::beginTransaction();

            $this->changeBody($ticket, $validated['body']);

            DB::commit();

            $this->sendTicketUpdatedEmails($ticket);

            return back()->with('success', 'Ticket body updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to update body: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to update body: ' . $e->getMessage()]);
        }
    }

    /**
     * Update the status of a ticket.
     */
    public function updateStatus(Request $request, Ticket $ticket)
    {
        if (!$this->canEditTicket($ticket)) {
            abort(403, 'You are not authorized to update this ticket.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:Open,Closed',
        ]);

        try {
            DB::beginTransaction();

            $this->changeStatus($ticket, $validated['status']);

            DB::commit();

            if ($validated['status'] === 'Closed') {
                $this->sendTicketClosedEmails($ticket);
            } else {
                $this->sendTicketUpdatedEmails($ticket);
            }

            return back()->with('success', 'Ticket status updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to update status: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to update status: ' . $e->getMessage()]);
        }
    }

    /**
     * Close a ticket.
     */
    public function closeTicket(Ticket $ticket)
    {
        if (!$this->canEditTicket($ticket)) {
            abort(403, 'You are not authorized to close this ticket.');
        }

        if ($ticket->status === 'Closed') {
            return back()->withErrors(['error' => 'Ticket is already closed.']);
        }

        try {
            DB::beginTransaction();

            $this->changeStatus($ticket, 'Closed');

            DB::commit();

            $this->sendTicketClosedEmails($ticket);

            return back()->with('success', 'Ticket closed successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to close ticket: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to close ticket: ' . $e->getMessage()]);
        }
    }

    /**
     * Reopen a ticket.
     */
    public function reopenTicket(Ticket $ticket)
    {
        if (!$this->canEditTicket($ticket)) {
            abort(403, 'You are not authorized to reopen this ticket.');
        }

        if ($ticket->status === 'Open') {
            return back()->withErrors(['error' => 'Ticket is already open.']);
        }

        try {
            DB::beginTransaction();

            $this->changeStatus($ticket, 'Open');

            DB::commit();

            $this->sendTicketUpdatedEmails($ticket);

            return back()->with('success', 'Ticket reopened successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to reopen ticket: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to reopen ticket: ' . $e->getMessage()]);
        }
    }

    /**
     * Upload attachments to a ticket.
     */
    public function uploadAttachments(Request $request, Ticket $ticket)
    {
        if (!$this->canEditTicket($ticket)) {
            abort(403, 'You are not authorized to update this ticket.');
        }

        $validated = $request->validate([
            'images' => 'required|array',
            'images.*' => 'file|mimes:jpeg,jpg,png,gif,pdf,doc,docx|max:8192',
        ]);

        $totalSize = 0;
        foreach ($request->file('images') as $file) {
            $totalSize += $file->getSize();
        }
        
        $maxTotalSize = 8 * 1024 * 1024;
        if ($totalSize > $maxTotalSize) {
            return back()->withErrors(['images' => 'Total file size must not exceed 8MB.']);
        }

        try {
            DB::beginTransaction();

            $this->storeAttachments($ticket, $request->file('images'));

            DB::commit();

            $this->sendTicketUpdatedEmails($ticket);

            return back()->with('success', 'Attachments uploaded successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to upload attachments: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to upload attachments: ' . $e->getMessage()]);
        }
    }

    /**
     * Delete a ticket attachment.
     */
    public function deleteAttachment(Ticket $ticket, $attachmentId)
    {
        if (!$this->canEditTicket($ticket)) {
            abort(403, 'You are not authorized to update this ticket.');
        }

        try {
            DB::beginTransaction();

            $attachment = $ticket->attachments()->findOrFail($attachmentId);
            
            Storage::disk('public')->delete($attachment->path);
            
            $attachment->delete();

            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'field_name' => 'attachments',
                'old_value' => $attachment->original_filename,
                'new_value' => 'Deleted',
                'changed_by' => Auth::id(),
            ]);

            DB::commit();

            return back()->with('success', 'Attachment deleted successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to delete attachment: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to delete attachment: ' . $e->getMessage()]);
        }
    }

    private function changeAssignedUser(Ticket $ticket, $assignedToId)
    {
        if ($assignedToId == $ticket->assigned_to) {
            return;
        }

        $oldUser = $ticket->assigned_to ? User::find($ticket->assigned_to) : null;
        $newUser = User::find($assignedToId);

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'field_name' => 'assigned_to',
            'old_value' => $oldUser ? $oldUser->name : 'Unassigned',
            'new_value' => $newUser ? $newUser->name : 'Unassigned',
            'changed_by' => Auth::id(),
        ]);

        $ticket->update(['assigned_to' => $assignedToId]);
    }

    private function changePriority(Ticket $ticket, $priority)
    {
        if ($priority == $ticket->priority) {
            return;
        }

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'field_name' => 'priority',
            'old_value' => $ticket->priority,
            'new_value' => $priority,
            'changed_by' => Auth::id(),
        ]);

        $ticket->update(['priority' => $priority]);
    }

    private function changeBody(Ticket $ticket, $body)
    {
        if ($body == $ticket->body) {
            return;
        }

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'field_name' => 'body',
            'old_value' => 'Body',
            'new_value' => 'Updated content',
            'changed_by' => Auth::id(),
        ]);

        $ticket->update(['body' => $body]);
    }

    private function changeStatus(Ticket $ticket, $status)
    {
        if ($status == $ticket->status) {
            return;
        }

        $oldStatus = $ticket->status;

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'field_name' => 'status',
            'old_value' => $oldStatus,
            'new_value' => $status,
            'changed_by' => Auth::id(),
        ]);

        $updateData = ['status' => $status];

        if ($status === 'Closed' && $oldStatus !== 'Closed') {
            $closedAt = Carbon::now();
            $openedAt = $ticket->downtime 
                ? Carbon::parse($ticket->downtime) 
                : Carbon::parse($ticket->created_at);

            if ($closedAt->lessThan($openedAt)) {
                $openedAt = Carbon::parse($ticket->created_at);
            }

            $updateData['uptime'] = $closedAt;
            $updateData['closed_by'] = Auth::id();
            $updateData['resolution_time'] = (int) round($openedAt->diffInMinutes($closedAt));
        }

        if ($status === 'Open' && $oldStatus === 'Closed') {
            $updateData['uptime'] = null;
            $updateData['closed_by'] = null;
            $updateData['resolution_time'] = null;
        }

        $ticket->update($updateData);
    }

    private function storeAttachments(Ticket $ticket, array $files)
    {
        foreach ($files as $file) {
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

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'field_name' => 'attachments',
            'old_value' => 'Attachments',
            'new_value' => 'Added new files',
            'changed_by' => Auth::id(),
        ]);
    }

    private function collectUniqueEmails(Ticket $ticket)
    {
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

        return $uniqueEmails->unique()->filter();
    }

    private function sendTicketCreatedEmails(Ticket $ticket)
    {
        $mailtrapService = new MailtrapService();
        $uniqueEmails = $this->collectUniqueEmails($ticket);
        
        $uniqueEmails->each(function ($email) use ($mailtrapService, $ticket) {
            $mailtrapService->sendTicketCreated($ticket, $email);
        });
    }

    private function sendTicketUpdatedEmails(Ticket $ticket)
    {
        $ticket->refresh();
        $ticket->load(['user', 'assignedToUser', 'ccEmails', 'recipientEmails', 'attachments']);

        $mailtrapService = new MailtrapService();
        $uniqueEmails = $this->collectUniqueEmails($ticket);
        
        $changes = $this->getRecentChanges($ticket);
        
        $uniqueEmails->each(function ($email) use ($mailtrapService, $ticket, $changes) {
            $mailtrapService->sendTicketUpdated($ticket, $email, $changes);
        });
    }

    private function sendTicketClosedEmails(Ticket $ticket)
    {
        $ticket->refresh();
        $ticket->load(['user', 'assignedToUser', 'ccEmails', 'recipientEmails', 'attachments', 'closedByUser']);

        $mailtrapService = new MailtrapService();
        $uniqueEmails = $this->collectUniqueEmails($ticket);
        
        $uniqueEmails->each(function ($email) use ($mailtrapService, $ticket) {
            $mailtrapService->sendTicketClosed($ticket, $email);
        });
    }

    private function getRecentChanges(Ticket $ticket)
    {
        $recentHistories = $ticket->histories()
            ->where('created_at', '>=', Carbon::now()->subMinutes(1))
            ->orderBy('created_at', 'desc')
            ->get();

        $changes = [];
        foreach ($recentHistories as $history) {
            $fieldName = ucfirst(str_replace('_', ' ', $history->field_name));
            $changes[$fieldName] = $history->new_value;
        }

        return $changes;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Ticket $ticket)
    {
        try {
            DB::beginTransaction();

            foreach ($ticket->attachments as $attachment) {
                Storage::disk('public')->delete($attachment->path);
            }
            
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

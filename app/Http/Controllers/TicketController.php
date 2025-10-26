<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\User;
use App\Models\Email;
use App\Models\HelpTopic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TicketController extends Controller   
{
    

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $allTickets = Ticket::with(['user', 'assignedToUser', 'helpTopicRelation'])
                           ->orderBy('created_at', 'desc')
                           ->get();
       
        $myTickets = Ticket::with(['user', 'assignedToUser', 'helpTopicRelation'])
                          ->where('user_id', Auth::id())
                          ->orderBy('created_at', 'desc')
                          ->get();
        
        $users = User::select('id', 'name')->get();
        $emails = Email::select('id', 'email_address')->get();
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
        $emails = Email::select('id', 'email_address')->get();
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
            'cc'            => 'nullable|exists:emails,id',
            'ticket_source' => 'required|string|max:50',
            'help_topic'    => 'required|exists:help_topics,id',
            'department'    => 'required|string|max:100',
            'sla_plan'      => 'nullable|string|max:100',
            'opened_at'     => 'nullable|date',
            'assigned_to'   => 'nullable|exists:users,id',
            'response'      => 'nullable|string',
            'status'        => 'nullable|string|max:50',
            'priority'      => 'nullable|string|max:50',
        ]);

        if (Auth::id() != $validated['user_id']) {
            return back()->withErrors(['user_id' => 'You cannot create tickets for other users.']);
        }

        // Generate auto-incrementing ticket name
        $ticketName = $this->generateTicketName($validated['help_topic']);
        
        if (!$ticketName) {
            return back()->withErrors(['help_topic' => 'Invalid help topic selected.']);
        }

        // Use transaction to prevent race conditions
        DB::beginTransaction();
        try {
            $validated['ticket_name'] = $ticketName;
            $ticket = Ticket::create($validated);
            DB::commit();

            return redirect()->route('tickets.index')
                ->with('success', 'Ticket created successfully with ID: ' . $ticketName);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to create ticket. Please try again.']);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Ticket $ticket)
    {
        $ticket->load(['user', 'assignedToUser', 'helpTopicRelation', 'ccEmail']);
        
        return Inertia::render('Tickets/Show', [
            'ticket' => $ticket
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Ticket $ticket)
    {
        $users = User::select('id', 'name')->get();
        $emails = Email::select('id', 'email_address')->get();
        $helpTopics = HelpTopic::select('id', 'name')->get();

        return Inertia::render('Tickets/Edit', [
            'ticket'     => $ticket,
            'users'      => $users,
            'emails'     => $emails,
            'helpTopics' => $helpTopics,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'cc'            => 'nullable|exists:emails,id',
            'ticket_source' => 'required|string|max:50',
            'help_topic'    => 'required|exists:help_topics,id',
            'department'    => 'required|string|max:100',
            'sla_plan'      => 'nullable|string|max:100',
            'opened_at'     => 'nullable|date',
            'assigned_to'   => 'nullable|exists:users,id',
            'response'      => 'nullable|string',
            'status'        => 'nullable|string|max:50',
            'priority'      => 'nullable|string|max:50',
        ]);

        // Don't allow changing ticket_name after creation
        $ticket->update($validated);

        return redirect()->route('tickets.show', $ticket->id)
            ->with('success', 'Ticket updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Ticket $ticket)
    {
        $ticket->delete();

        return redirect()->route('tickets.index')
            ->with('success', 'Ticket deleted successfully.');
    }
}

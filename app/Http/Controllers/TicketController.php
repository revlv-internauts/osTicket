<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TicketController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    
    public function index()
    {
        $tickets = Ticket::orderBy('created_at', 'desc')->get();
        
        return Inertia::render('ticket', [
            'tickets' => $tickets
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Tickets/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'cc' => 'nullable|string',
            'ticket_notice' => 'nullable|string|max:50',
            'ticket_source' => 'required|string|max:50',
            'help_topic' => 'required|string|max:100',
            'department' => 'required|string|max:100',
            'sla_plan' => 'nullable|string|max:100',
            'due_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
            'canned_response' => 'nullable|string|max:255',
            'response' => 'nullable|string',
            'status' => 'nullable|string|max:50',
        ]);

        
        if (Auth::id() != $validated['user_id'] ) {
            return back()->withErrors(['user_id' => 'You cannot create tickets for other users.']);
        }

        $ticket = Ticket::create($validated);

        return redirect()->route('tickets.show', $ticket->id)
            ->with('success', 'Ticket created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Ticket $ticket)
    {
        $ticket->load(['user', 'assignedTo']);
        
        return Inertia::render('Tickets/Show', [
            'ticket' => $ticket
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Ticket $ticket)
    {
        $ticket->load(['user', 'assignedTo']);
        
        return Inertia::render('Tickets/Edit', [
            'ticket' => $ticket
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'cc' => 'nullable|string',
            'ticket_notice' => 'nullable|string|max:50',
            'ticket_source' => 'required|string|max:50',
            'help_topic' => 'required|string|max:100',
            'department' => 'required|string|max:100',
            'sla_plan' => 'nullable|string|max:100',
            'due_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
            'canned_response' => 'nullable|string|max:255',
            'response' => 'nullable|string',
            'status' => 'nullable|string|max:50',
        ]);

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

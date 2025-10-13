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
        // Get all tickets
        $allTickets = Ticket::orderBy('created_at', 'desc')->get();
        
        // Get current user's tickets (works inside auth middleware)
        $myTickets = Ticket::where('user_id', Auth::id())
                           ->orderBy('created_at', 'desc')
                           ->get();
        
        return Inertia::render('ticket', [
            'tickets'   => $allTickets,
            'myTickets' => $myTickets,
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

        // Generate ticket_name based on help_topic (slug + sequential number)
        $validated['ticket_name'] = $this->generateTicketNameFromHelpTopic($validated['help_topic']);

        $ticket = Ticket::create($validated);

        // Fallback: if ticket_name wasn't saved (e.g. not fillable previously), ensure it's persisted
        if (($ticket->ticket_name ?? null) !== ($validated['ticket_name'] ?? null)) {
            $ticket->ticket_name = $validated['ticket_name'];
            $ticket->save();
        }

        return redirect()->route('tickets.show', $ticket->id)
            ->with('success', 'Ticket created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Ticket $ticket)
    {
        $ticket->load(['user']);
        
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
            'department' => 'nullable|string|max:100',
            'sla_plan' => 'nullable|string|max:100',
            'due_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
            'canned_response' => 'nullable|string|max:255',
            'response' => 'nullable|string',
            'status' => 'nullable|string|max:50',
        ]);

        // If help_topic changed, regenerate ticket_name based on new help_topic
        if (isset($validated['help_topic']) && $validated['help_topic'] !== $ticket->help_topic) {
            $validated['ticket_name'] = $this->generateTicketNameFromHelpTopic($validated['help_topic']);
        }

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

    /**
     * Generate ticket_name from help topic slug and count.
     *
     */
    private function generateTicketNameFromHelpTopic(string $helpTopic): string
    {
        
        $slug = preg_replace('/[^A-Za-z0-9\-]+/', '-', $helpTopic); 
        $slug = preg_replace('/-+/', '-', $slug); 
        $slug = trim($slug, '-');

        if ($slug === '') {
            $slug = 'GEN';
        }

        // Count existing tickets with the same help_topic value (exact match)
        // Use the raw helpTopic value to count consistent groups
        $count = Ticket::where('help_topic', $helpTopic)->count() + 1;

        return $slug . '-' . $count;
    }
}

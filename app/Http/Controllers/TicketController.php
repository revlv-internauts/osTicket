<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\User;
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
    
        $allTickets = Ticket::orderBy('created_at', 'desc')->get();
       
        $myTickets = Ticket::where('user_id', Auth::id())
                           ->orderBy('created_at', 'desc')
                           ->get();
        
        $users = User::select('id', 'name')->get();

        return Inertia::render('ticket', [
            'tickets'   => $allTickets,
            'myTickets' => $myTickets,
            'users'     => $users,
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

        
        $count = Ticket::where('help_topic', $helpTopic)->count() + 1;

        return $slug . '-' . $count;
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

       
        $validated['ticket_name'] = $this->generateTicketNameFromHelpTopic($validated['help_topic']);

        $ticket = Ticket::create($validated);

        
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
        
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Ticket $ticket)
    {

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

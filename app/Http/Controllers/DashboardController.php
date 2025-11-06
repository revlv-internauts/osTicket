<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\HelpTopic;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $total = Ticket::count();
        $open = Ticket::where('status', 'Open')->count();
        $closed = Ticket::where('status', 'Closed')->count();

       
        $startDate = now()->subDays(value: 90)->startOfDay();
        
        $chartData = Ticket::where(column: 'created_at', operator: '>=', value: $startDate)
            ->orderBy('created_at')
            ->get()
            ->groupBy(function($ticket) {
                return $ticket->created_at->format('Y-m-d');
            })
            ->map(function ($tickets, $date) {
                return [
                    'date' => $date,
                    'opened' => $tickets->where('status', 'Open')->count(),
                    'closed' => $tickets->where('status', 'Closed')->count(),
                ];
            })
            ->values()
            ->toArray();

        // Get Help Topic Stats with names using JOIN
        $helpTopicStats = DB::table('tickets')
            ->join('help_topics', 'tickets.help_topic', '=', 'help_topics.id')
            ->select('help_topics.name as help_topic')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN tickets.status = 'Open' THEN 1 ELSE 0 END) as opened")
            ->selectRaw("SUM(CASE WHEN tickets.status = 'Closed' THEN 1 ELSE 0 END) as closed")
            ->whereNotNull('tickets.help_topic')
            ->where('tickets.help_topic', '>', 0)
            ->groupBy('help_topics.id', 'help_topics.name')
            ->orderBy('total', 'desc')
            ->get()
            ->map(function ($stat) {
                return [
                    'help_topic' => $stat->help_topic,
                    'opened' => (int) $stat->opened,
                    'closed' => (int) $stat->closed,
                    'total' => (int) $stat->total,
                ];
            })
            ->toArray();

        return Inertia::render('dashboard', [
            'totalTickets' => $total,
            'openedTickets' => $open,
            'closedTickets' => $closed,
            'chartData' => $chartData,
            'helpTopicStats' => $helpTopicStats,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}

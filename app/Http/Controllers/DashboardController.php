<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
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

        // Get ticket data for chart (last 90 days) - count tickets created per day by status
        $startDate = now()->subDays(90)->startOfDay();
        
        $chartData = Ticket::where('created_at', '>=', $startDate)
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

        // Get help topic statistics
        $helpTopicStats = Ticket::select('help_topic')
            ->selectRaw("COUNT(CASE WHEN status = 'Open' THEN 1 END) as opened")
            ->selectRaw("COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed")
            ->selectRaw("COUNT(*) as total")
            ->groupBy('help_topic')
            ->orderBy('total', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'help_topic' => $item->help_topic ?? 'Unassigned',
                    'opened' => (int) $item->opened,
                    'closed' => (int) $item->closed,
                    'total' => (int) $item->total,
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

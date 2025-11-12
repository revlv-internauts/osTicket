<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class ComputationController extends Controller
{
    public function index(Request $request)
    {
        $tickets = Ticket::with(['user', 'assignedToUser', 'helpTopicRelation', 'openedByUser', 'closedByUser'])
            ->whereNotNull('closed_at')
            ->orderBy('closed_at', 'desc')
            ->get();

        $ticketsWithResolution = $tickets->map(function ($ticket) {
            $resolutionMinutes = $this->calculateResolutionTime($ticket);
            
            return [
                'id' => $ticket->id,
                'ticket_name' => $ticket->ticket_name,
                'status' => $ticket->status,
                'priority' => $ticket->priority,
                'opened_at' => $ticket->opened_at ? $ticket->opened_at->format('M d, Y h:i A') : ($ticket->created_at ? $ticket->created_at->format('M d, Y h:i A') : 'N/A'),
                'closed_at' => $ticket->closed_at ? $ticket->closed_at->format('M d, Y h:i A') : 'N/A',
                'resolution_time' => $resolutionMinutes,
                'resolution_time_formatted' => $this->formatMinutes($resolutionMinutes),
                'user' => $ticket->user ? $ticket->user->name : 'N/A',
                'assigned_to' => $ticket->assignedToUser ? $ticket->assignedToUser->name : 'Unassigned',
                'help_topic' => $ticket->helpTopicRelation ? $ticket->helpTopicRelation->topic : 'N/A',
                'opened_by' => $ticket->openedByUser ? $ticket->openedByUser->name : 'N/A',
                'closed_by' => $ticket->closedByUser ? $ticket->closedByUser->name : 'N/A',
            ];
        });

        $statistics = $this->calculateStatistics($ticketsWithResolution);

        return Inertia::render('computation', [
            'tickets' => $ticketsWithResolution,
            'statistics' => $statistics,
        ]);
    }

    /**
     * Calculate resolution time in minutes
     */
    private function calculateResolutionTime($ticket): int
    {
        if (!$ticket->closed_at) {
            return 0;
        }

        $closedAt = Carbon::parse($ticket->closed_at);

        $openedAt = $ticket->opened_at 
            ? Carbon::parse($ticket->opened_at) 
            : Carbon::parse($ticket->created_at);

        if ($closedAt->lessThan($openedAt)) {
            $openedAt = Carbon::parse($ticket->created_at);
        }

        return (int) round($openedAt->diffInMinutes($closedAt));
    }

    /**
     * Format minutes into human-readable format
     */
    private function formatMinutes(int $minutes): string
    {
        if ($minutes === 0) {
            return '0 minutes';
        }

        $days = floor($minutes / 1440);
        $hours = floor(($minutes % 1440) / 60);
        $mins = $minutes % 60;

        $parts = [];
        if ($days > 0) {
            $parts[] = $days . ' ' . ($days === 1 ? 'day' : 'days');
        }
        if ($hours > 0) {
            $parts[] = $hours . ' ' . ($hours === 1 ? 'hour' : 'hours');
        }
        if ($mins > 0) {
            $parts[] = $mins . ' ' . ($mins === 1 ? 'minute' : 'minutes');
        }

        return implode(', ', $parts);
    }

    /**
     * Calculate various statistics
     */
    private function calculateStatistics($tickets): array
    {
        $resolutionTimes = $tickets->pluck('resolution_time')->filter(fn($time) => $time > 0);

        if ($resolutionTimes->isEmpty()) {
            return [
                'total_tickets' => 0,
                'average_resolution_time' => 0,
                'average_resolution_time_formatted' => '0 minutes',
                'fastest_resolution_time' => 0,
                'fastest_resolution_time_formatted' => '0 minutes',
                'slowest_resolution_time' => 0,
                'slowest_resolution_time_formatted' => '0 minutes',
                'total_resolution_time' => 0,
                'total_resolution_time_formatted' => '0 minutes',
            ];
        }

        $average = (int) round($resolutionTimes->average());
        $fastest = $resolutionTimes->min();
        $slowest = $resolutionTimes->max();
        $total = $resolutionTimes->sum();

        return [
            'total_tickets' => $tickets->count(),
            'average_resolution_time' => $average,
            'average_resolution_time_formatted' => $this->formatMinutes($average),
            'fastest_resolution_time' => $fastest,
            'fastest_resolution_time_formatted' => $this->formatMinutes($fastest),
            'slowest_resolution_time' => $slowest,
            'slowest_resolution_time_formatted' => $this->formatMinutes($slowest),
            'total_resolution_time' => $total,
            'total_resolution_time_formatted' => $this->formatMinutes($total),
        ];
    }
}

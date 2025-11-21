<?php

namespace Tests\Feature;

use App\Models\HelpTopic;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class ComputationTest extends TestCase
{
    use RefreshDatabase;

    public function test_computation_calculates_resolution_time_correctly(): void
    {

        
        $user = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create();

        Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $user->id,
            'downtime' => now()->subMinutes(120),
            'uptime' => now(),
        ]);
        
        $response = $this->actingAs($user)->get(route('computation.index'));
        
        $response->assertStatus(200);

        $response->assertInertia(fn ($page) => 
            $page->component('computation')
                ->where('tickets.0.resolution_time', 120)
                ->where('tickets.0.resolution_time_formatted', '2 hours')
                ->where('statistics.total_tickets', 1)
                ->where('statistics.average_resolution_time', 120)
        );
    }
}

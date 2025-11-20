<?php

namespace Tests\Feature;

use App\Models\Email;
use App\Models\HelpTopic;
use App\Models\Ticket;
use App\Models\User;
use App\Services\MailtrapService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TicketTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        
        config(['services.mailtrap.api_key' => 'test-api-key']);
        
        $this->partialMock(MailtrapService::class, function ($mock) {
            $mock->shouldReceive('sendTicketCreated')->andReturn(true);
            $mock->shouldReceive('sendTicketUpdated')->andReturn(true);
            $mock->shouldReceive('sendTicketClosed')->andReturn(true);
        });
    }

    public function test_index()
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        
        $helpTopic = HelpTopic::factory()->create();
        
        Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $user->id,
        ]);
        Ticket::factory()->create([
            'user_id' => $otherUser->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $otherUser->id,
        ]);
        
        $response = $this->actingAs($user)->get(route('tickets.index'));
        
        $response->assertStatus(200);
    }

    public function test_store_ticket()
    {
        $user = User::factory()->create();
        $assignedUser = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create(['name' => 'Support']);
        
        $data = [
            'user_id' => $user->id,
            'ticket_source' => 'Web',
            'help_topic' => $helpTopic->id,
            'department' => 'IT',
            'downtime' => now()->toDateTimeString(),
            'assigned_to' => $assignedUser->id,
            'body' => 'Test ticket body',
            'priority' => 'High',
        ];
        
        $response = $this->actingAs($user)->post(route('tickets.store'), $data);
        
        $response->assertRedirect(route('tickets.index'));
        
        $this->assertDatabaseHas('tickets', [
            'user_id' => $user->id,
            'ticket_name' => 'Support-0001',
            'body' => 'Test ticket body',
        ]);
    }

    public function test_store_validates_required_fields()
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)->post(route('tickets.store'), []);
        
        $response->assertSessionHasErrors([
            'user_id',
            'ticket_source',
            'help_topic',
            'department',
            'downtime',
            'assigned_to',
            'body',
            'priority',
        ]);
    }

    public function test_store_prevents_creating_tickets_for_other_users()
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create();
        
        $data = [
            'user_id' => $otherUser->id,
            'ticket_source' => 'Web',
            'help_topic' => $helpTopic->id,
            'department' => 'IT',
            'downtime' => now()->toDateTimeString(),
            'assigned_to' => $user->id,
            'body' => 'Test',
            'priority' => 'High',
        ];
        
        $response = $this->actingAs($user)->post(route('tickets.store'), $data);
        
        $response->assertSessionHasErrors(['user_id']);
    }

    public function test_store_cc_emails()
    {
        $user = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create();
        $ccEmails = Email::factory()->count(2)->create();
        
        $data = [
            'user_id' => $user->id,
            'ticket_source' => 'Web',
            'help_topic' => $helpTopic->id,
            'department' => 'IT',
            'downtime' => now()->toDateTimeString(),
            'assigned_to' => $user->id,
            'body' => 'Test',
            'priority' => 'High',
            'cc' => $ccEmails->pluck('id')->toArray(),
        ];
        
        $response = $this->actingAs($user)->post(route('tickets.store'), $data);
        
        $ticket = Ticket::latest()->first();
        $this->assertNotNull($ticket);
        $this->assertCount(2, $ticket->ccEmails);
    }

    public function test_store_file_attachments()
    {
        Storage::fake('public');
        
        $user = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create();
        
        $data = [
            'user_id' => $user->id,
            'ticket_source' => 'Web',
            'help_topic' => $helpTopic->id,
            'department' => 'IT',
            'downtime' => now()->toDateTimeString(),
            'assigned_to' => $user->id,
            'body' => 'Test',
            'priority' => 'High',
            'images' => [
                UploadedFile::fake()->image('test.jpg', 100, 100)->size(100),
            ],
        ];
        
        $response = $this->actingAs($user)->post(route('tickets.store'), $data);
        
        $ticket = Ticket::latest()->first();
        $this->assertNotNull($ticket);
        $this->assertNotNull($ticket->image_paths);
    }

    public function test_update_changes_ticket_status_and_calculates_resolution_time()
    {
        $user = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create();
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'status' => 'Open',
            'downtime' => now()->subHours(2),
            'assigned_to' => $user->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'status' => 'Closed',
        ]);
        
        $ticket->refresh();
        $this->assertEquals('Closed', $ticket->status);
        $this->assertNotNull($ticket->uptime);
        $this->assertNotNull($ticket->resolution_time);
        $this->assertEquals($user->id, $ticket->closed_by);
    }

    public function test_update_reopens_closed_ticket()
    {
        $user = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create();
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'status' => 'Closed',
            'uptime' => now(),
            'closed_by' => $user->id,
            'resolution_time' => 120,
            'assigned_to' => $user->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'status' => 'Open',
        ]);
        
        $ticket->refresh();
        $this->assertEquals('Open', $ticket->status);
        $this->assertNull($ticket->uptime);
        $this->assertNull($ticket->closed_by);
        $this->assertNull($ticket->resolution_time);
    }

    public function test_update_changes_priority()
    {
        $user = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create();
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'priority' => 'Low',
            'assigned_to' => $user->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'priority' => 'High',
        ]);
        
        $ticket->refresh();
        $this->assertEquals('High', $ticket->priority);
    }

    public function test_update_changes_assigned_user()
    {
        $user = User::factory()->create();
        $newAssignee = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create();
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $user->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'assigned_to' => $newAssignee->id,
        ]);
        
        $ticket->refresh();
        $this->assertEquals($newAssignee->id, $ticket->assigned_to);
    }

    public function test_deletes_ticket()
    {
        $user = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create();
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $user->id,
        ]);
        
        $ticketId = $ticket->id;
        
        $response = $this->actingAs($user)->delete(route('tickets.destroy', $ticket));
        
        $this->assertDatabaseMissing('tickets', ['id' => $ticketId]);
    }

    public function test_generate_ticket_name()
    {
        $user = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create(['name' => 'Support']);
        
        Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'ticket_name' => 'Support-0001',
            'assigned_to' => $user->id,
        ]);
        
        $data = [
            'user_id' => $user->id,
            'ticket_source' => 'Web',
            'help_topic' => $helpTopic->id,
            'department' => 'IT',
            'downtime' => now()->toDateTimeString(),
            'assigned_to' => $user->id,
            'body' => 'Test',
            'priority' => 'High',
        ];
        
        $this->actingAs($user)->post(route('tickets.store'), $data);
        
        $this->assertDatabaseHas('tickets', [
            'ticket_name' => 'Support-0002',
        ]);
    }
}
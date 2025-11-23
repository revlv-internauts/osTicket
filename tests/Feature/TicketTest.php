<?php

namespace Tests\Feature;

use App\Models\Email;
use App\Models\HelpTopic;
use App\Models\Ticket;
use App\Models\User;
use App\Services\MailtrapService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TicketTest extends TestCase
{
    use RefreshDatabase;
    public function bootstrapTicket()
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create();
        $assignedUser = User::factory()->create(['name' => 'Support']);
        $ccEmails = Email::factory()->count(2)->create();

     return [$user, $otherUser, $helpTopic, $assignedUser, $ccEmails];
    }

    

    public function test_can_list_tickets(): void
    {
        [$user, $otherUser, $helpTopic] = $this->bootstrapTicket();
        
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

    public function test_can_create_ticket(): void
    {
        [$user, $assignedUser] = $this->bootstrapTicket();
        $helpTopic = HelpTopic::factory()->create(['name' => 'Support']);
        
        $response = $this->actingAs($user)->post(route('tickets.store'), [
            'user_id' => $user->id,
            'ticket_source' => $ticketSource = 'Web',
            'help_topic' => $helpTopic->id,
            'department' => $department = 'IT',
            'downtime' => $downtime = now()->toDateTimeString(),
            'assigned_to' => $assignedUser->id,
            'body' => $body = 'Test ticket body',
            'priority' => $priority = 'High',
        ]);
        
        $response->assertRedirect(route('tickets.index'));
        
        $this->assertDatabaseHas('tickets', [
            'user_id' => $user->id,
            'ticket_name' => 'Support-0001',
            'body' => $body,
            'ticket_source' => $ticketSource,
            'department' => $department,
            'priority' => $priority,
        ]);
    }

    public function test_validates_required_fields(): void
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

    public function test_shows_ticket_details(): void
    {
        [$user, , $helpTopic] = $this->bootstrapTicket();
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $user->id,
        ]);
        
        $response = $this->actingAs($user)->get(route('tickets.show', $ticket));
        
        $response->assertStatus(200);
    }   

    public function test_prevents_creating_tickets_for_other_users(): void
    {
        [$user, $otherUser, $helpTopic] = $this->bootstrapTicket();
        
        $response = $this->actingAs($user)->post(route('tickets.store'), [
            'user_id' => $otherUser->id,
            'ticket_source' => 'Web',
            'help_topic' => $helpTopic->id,
            'department' => 'IT',
            'downtime' => now()->toDateTimeString(),
            'assigned_to' => $user->id,
            'body' => 'Test',
            'priority' => 'High',
        ]);
        
        $response->assertSessionHasErrors(['user_id']);
    }

    public function test_can_attach_cc_emails(): void
    {
        [$user, ,$helpTopic, $assignedUser, $ccEmails] = $this->bootstrapTicket();
        
        $response = $this->actingAs($user)->post(route('tickets.store'), [
            'user_id' => $user->id,
            'ticket_source' => 'Web',
            'help_topic' => $helpTopic->id,
            'department' => 'IT',
            'downtime' => now()->toDateTimeString(),
            'assigned_to' => $assignedUser->id,
            'body' => 'Test',
            'priority' => 'High',
            'cc' => $ccEmails->pluck('id')->toArray(),
        ]);
        
        $ticket = Ticket::latest()->first();
        $this->assertNotNull($ticket);
        $this->assertCount(2, $ticket->ccEmails);
    }

    public function test_can_close_ticket(): void
    {
        [$user, , $helpTopic] = $this->bootstrapTicket();
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

    public function test_can_reopen_ticket(): void
    {
        [$user, , $helpTopic] = $this->bootstrapTicket();
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

    public function test_can_change_priority(): void
    {
        [$user, , $helpTopic, $assignedUser] = $this->bootstrapTicket();
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'priority' => 'Low',
            'assigned_to' => $assignedUser->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'priority' => $priority = 'High',
        ]);
        
        $ticket->refresh();
        $this->assertEquals($priority, $ticket->priority);
    }

    public function test_can_reassign_ticket(): void
    {        
        [$user, , $helpTopic, $assignedUser] = $this->bootstrapTicket();
        $newAssignee = User::factory()->create();
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $assignedUser->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'assigned_to' => $newAssignee->id,
        ]);
        
        $ticket->refresh();
        $this->assertEquals($newAssignee->id, $ticket->assigned_to);
    }

    public function test_can_delete_ticket(): void
    {
        [$user, , $helpTopic, $assignedUser] = $this->bootstrapTicket();
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $assignedUser->id,
        ]);
        
        $ticketId = $ticket->id;
        
        $response = $this->actingAs($user)->delete(route('tickets.destroy', $ticket));
        
        $response->assertRedirect();
        $this->assertDatabaseMissing('tickets', ['id' => $ticketId]);
    }
    
    public function test_generates_ticket_name_correctly(): void
    {
        [$user, , $helpTopic] = $this->bootstrapTicket();
        
        $response = $this->actingAs($user)->post(route('tickets.store'), [
            'user_id' => $user->id,
            'ticket_source' => 'Web',
            'help_topic' => $helpTopic->id,
            'department' => 'IT',
            'downtime' => now()->toDateTimeString(),
            'assigned_to' => $user->id,
            'body' => 'Test ticket body',
            'priority' => 'High',
        ]);
        
        $response->assertRedirect(route('tickets.index'));
        
        $this->assertDatabaseHas('tickets', [
            'help_topic' => $helpTopic->id,
            'ticket_name' => $helpTopic->name . '-0001',
        ]);
    }
}
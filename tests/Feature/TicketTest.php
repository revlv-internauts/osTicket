<?php

namespace Tests\Feature;

use App\Models\Email;
use App\Models\HelpTopic;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use App\Services\MailtrapService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use App\Mail\TicketCreated;

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

    public function test_can_check_the_auto_increment(): void
    {
        [$user, $assignedUser] = $this->bootstrapTicket();
        $helpTopic = HelpTopic::factory()->create(['name' => 'Support']);
        
        $response1 = $this->actingAs($user)->post(route('tickets.store'), [
            'user_id' => $user->id,
            'ticket_source' => 'Web',
            'help_topic' => $helpTopic->id,
            'department' => 'IT',
            'downtime' => now()->toDateTimeString(),
            'assigned_to' => $assignedUser->id,
            'body' => 'First ticket body',
            'priority' => 'High',
        ]);
        
        $response1->assertRedirect(route('tickets.index'));
        
        $this->assertDatabaseHas('tickets', [
            'ticket_name' => 'Support-0001',
        ]);
        
        $response2 = $this->actingAs($user)->post(route('tickets.store'), [
            'user_id' => $user->id,
            'ticket_source' => 'Web',
            'help_topic' => $helpTopic->id,
            'department' => 'IT',
            'downtime' => now()->toDateTimeString(),
            'assigned_to' => $assignedUser->id,
            'body' => 'Second ticket body',
            'priority' => 'High',
        ]);
        
        $response2->assertRedirect(route('tickets.index'));
        
        $this->assertDatabaseHas('tickets', [
            'ticket_name' => 'Support-0002',
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
        $ticket->load('ccEmails');
        $this->assertEquals(2, $ticket->ccEmails->count());
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
        [$user, , $helpTopic] = $this->bootstrapTicket();
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'priority' => 'Low',
            'assigned_to' => $user->id,
            'opened_by' => $user->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'body' => 'Updated',
            'priority' => $priority = 'High',
        ]);
        
        $ticket->refresh();
        $this->assertEquals($priority, $ticket->priority);


    }

    public function test_can_reassign_ticket(): void
    {        
        [$user, , $helpTopic,] = $this->bootstrapTicket();
        $newAssignee = User::factory()->create();
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $user->id,
            'opened_by' => $user->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'body' => 'Updated',
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
            'status' => 'Open',
        ]);

        $response = $this->actingAs($user)->delete(route('tickets.destroy', $ticket));
        
        $response->assertRedirect();
        $this->assertDatabaseMissing('tickets', ['id' => $ticket->id]);
    }

    public function test_can_create_ticket_with_attachments(): void
    {
        Storage::fake('public');
        [$user, , $helpTopic, $assignedUser] = $this->bootstrapTicket();
        
        $file = \Illuminate\Http\UploadedFile::fake()->image('test.jpg', 100, 100);
        
        $response = $this->actingAs($user)->post(route('tickets.store'), [
            'user_id' => $user->id,
            'ticket_source' => 'Web',
            'help_topic' => $helpTopic->id,
            'department' => 'IT',
            'downtime' => now()->toDateTimeString(),
            'assigned_to' => $assignedUser->id,
            'body' => 'Test ticket with attachment',
            'priority' => 'High',
            'images' => [$file],
        ]);
        
        $response->assertRedirect(route('tickets.index'));
        
        $ticket = Ticket::latest()->first();
        $this->assertNotNull($ticket);
        $ticket->load('attachments');
        $this->assertEquals(1, $ticket->attachments->count());
        
        $attachment = $ticket->attachments->first();
        $this->assertEquals('test.jpg', $attachment->original_filename);
        $this->assertNotNull($attachment->path);
        $this->assertNotNull($attachment->mime_type);
        $this->assertGreaterThan(0, $attachment->size);
    }

    public function test_can_update_ticket_with_new_attachments(): void
    {
        Storage::fake('public');
        [$user, , $helpTopic] = $this->bootstrapTicket();
        
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $user->id,
            'status' => 'Open',
        ]);
        
        $file = \Illuminate\Http\UploadedFile::fake()->create('document.pdf', 100);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'body' => 'Updated body',
            'images' => [$file],
        ]);
        
        $ticket->refresh();
        $ticket->load('attachments');
        $this->assertEquals('Updated body', $ticket->body);
        $this->assertEquals(1, $ticket->attachments->count());
        
        $attachment = $ticket->attachments->first();
        $this->assertEquals('document.pdf', $attachment->original_filename);
    }
     public function test_only_creator_and_assigned_can_close_ticket(): void
    {
        [$user, , $helpTopic, $assignedUser] = $this->bootstrapTicket();
        $unauthorizedUser = User::factory()->create();

        $ticket1 = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $assignedUser->id,
            'status' => 'Open',
            'downtime' => now()->subHours(2),
            'opened_by' => $user->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket1), [
            'status' => 'Closed',
        ]);
        
        $response->assertSessionHasNoErrors();
        $ticket1->refresh();
        $this->assertEquals('Closed', $ticket1->status);
 
        $ticket2 = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $assignedUser->id,
            'status' => 'Open',
            'downtime' => now()->subHours(2),
            'opened_by' => $user->id,
        ]);
        
        $response = $this->actingAs($assignedUser)->put(route('tickets.update', $ticket2), [
            'status' => 'Closed',
        ]);
        
        $response->assertSessionHasNoErrors();
        $ticket2->refresh();
        $this->assertEquals('Closed', $ticket2->status);

        $ticket3 = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $assignedUser->id,
            'status' => 'Open',
            'downtime' => now()->subHours(2),
            'opened_by' => $user->id,
        ]);
        
        $response = $this->actingAs($unauthorizedUser)->put(route('tickets.update', $ticket3), [
            'status' => 'Closed',
        ]);
        
        $response->assertStatus(403);
        $ticket3->refresh();
        $this->assertEquals('Open', $ticket3->status);
    }
    
    public function test_creates_history_for_status_change(): void
    {
        [$user, , $helpTopic] = $this->bootstrapTicket();
        
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $user->id,
            'status' => 'Open',
            'downtime' => now()->subHours(2),
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'status' => 'Closed',
        ]);
        
        $this->assertDatabaseHas('ticket_histories', [
            'ticket_id' => $ticket->id,
            'field_name' => 'status',
            'old_value' => 'Open',
            'new_value' => 'Closed',
            'changed_by' => $user->id,
        ]);
    }

    public function test_creates_history_for_priority_change(): void
    {
        [$user, , $helpTopic] = $this->bootstrapTicket();
        
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'priority' => 'Low',
            'opened_by' => $user->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'body' => 'Test',
            'priority' => 'High',
        ]);
        
        $this->assertDatabaseHas('ticket_histories', [
            'ticket_id' => $ticket->id,
            'field_name' => 'priority',
            'old_value' => 'Low',
            'new_value' => 'High',
            'changed_by' => $user->id,
        ]);
    }

    public function test_creates_history_for_assignment_change(): void
    {
        [$user, , $helpTopic, $assignedUser] = $this->bootstrapTicket();
        $newAssignee = User::factory()->create(['name' => 'New Assignee']);
        
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $assignedUser->id,
            'opened_by' => $user->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'body' => 'Test',
            'assigned_to' => $newAssignee->id,
        ]);
        
        $this->assertDatabaseHas('ticket_histories', [
            'ticket_id' => $ticket->id,
            'field_name' => 'assigned_to',
            'old_value' => $assignedUser->name,
            'new_value' => $newAssignee->name,
            'changed_by' => $user->id,
        ]);
    }

    public function test_creates_history_for_body_update(): void
    {
        [$user, , $helpTopic] = $this->bootstrapTicket();
        
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $user->id,
            'body' => 'Original body',
            'opened_by' => $user->id,
        ]);
        
        $response = $this->actingAs($user)->put(route('tickets.update', $ticket), [
            'body' => 'Updated body',
        ]);
        
        $this->assertDatabaseHas('ticket_histories', [
            'ticket_id' => $ticket->id,
            'field_name' => 'body',
            'changed_by' => $user->id,
        ]);
    }
}
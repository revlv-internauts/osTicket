<?php

namespace Tests\Feature;

use App\Mail\TicketCreated;
use App\Models\Email;
use App\Models\HelpTopic;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TicketMailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_ticket_created_mailable_passes_ticket_data_to_view(): void
    {
        $user = User::factory()->create(['name' => 'John Doe']);
        $helpTopic = HelpTopic::factory()->create(['name' => 'Technical Support']);
        
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'ticket_name' => 'Tech-0001',
            'body' => 'This is a test ticket',
            'priority' => 'High',
        ]);

        $mailable = new TicketCreated($ticket);
        $content = $mailable->content();

        $this->assertArrayHasKey('ticket', $content->with);
        $this->assertEquals($ticket->id, $content->with['ticket']->id);
        $this->assertEquals('Tech-0001', $content->with['ticket']->ticket_name);
    }

    public function test_ticket_created_mailable_includes_attachments(): void
    {
        Storage::fake('public');
        
        $user = User::factory()->create();
        $helpTopic = HelpTopic::factory()->create();
        
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
        ]);

        $file = \Illuminate\Http\UploadedFile::fake()->create('document.pdf', 100);
        $fileName = 'test-document.pdf';
        $path = $file->storeAs('ticket-attachments', $fileName, 'public');

        $ticket->attachments()->create([
            'original_filename' => 'document.pdf',
            'filename' => $fileName,
            'path' => $path,
            'mime_type' => 'application/pdf',
            'size' => 102400,
        ]);

        $mailable = new TicketCreated($ticket->fresh(['attachments']));
        $attachments = $mailable->attachments();

        $this->assertCount(1, $attachments);
        $this->assertEquals('document.pdf', $attachments[0]->as);
    }

    public function test_ticket_created_mailable_contains_ticket_details(): void
    {
        $user = User::factory()->create(['name' => 'Test User']);
        $helpTopic = HelpTopic::factory()->create(['name' => 'Billing']);
        
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'ticket_name' => 'dict-0042',
            'body' => 'I need help with wifi',
            'priority' => 'low',
        ]);

        $mailable = new TicketCreated($ticket);

        $this->assertEquals($ticket->id, $mailable->ticket->id);
        $this->assertEquals('dict-0042', $mailable->ticket->ticket_name);
        $this->assertEquals('I need help with wifi', $mailable->ticket->body);
        $this->assertEquals('low', $mailable->ticket->priority);
    }

    public function test_sends_ticket_created_email_to_creator_and_assigned_user(): void
    {
        \Mail::fake();

        $creator = User::factory()->create(['email' => 'creator@example.com']);
        $assigned = User::factory()->create(['email' => 'assigned@example.com']);
        $helpTopic = HelpTopic::factory()->create();
        
        $ticket = Ticket::factory()->create([
            'user_id' => $creator->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $assigned->id,
        ]);

        \Mail::to($creator->email)->send(new TicketCreated($ticket));
        
        \Mail::to($assigned->email)->send(new TicketCreated($ticket));

        \Mail::assertSent(TicketCreated::class, 2);
        
        \Mail::assertSent(TicketCreated::class, function ($mail) use ($creator) {
            return $mail->hasTo($creator->email);
        });
        
        \Mail::assertSent(TicketCreated::class, function ($mail) use ($assigned) {
            return $mail->hasTo($assigned->email);
        });
    }

    public function test_sends_ticket_created_email_to_all_recipients(): void
    {
        \Mail::fake();

        $creator = User::factory()->create(['email' => 'creator@example.com']);
        $assigned = User::factory()->create(['email' => 'assigned@example.com']);
        $helpTopic = HelpTopic::factory()->create();
        
        $ccEmail1 = Email::factory()->create(['email_address' => 'cc1@example.com']);
        $ccEmail2 = Email::factory()->create(['email_address' => 'cc2@example.com']);
        $recipientEmail1 = Email::factory()->create(['email_address' => 'recipient1@example.com']);
        $recipientEmail2 = Email::factory()->create(['email_address' => 'recipient2@example.com']);
        
        $ticket = Ticket::factory()->create([
            'user_id' => $creator->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $assigned->id,
        ]);

        $ticket->ccEmails()->attach([$ccEmail1->id, $ccEmail2->id]);
        $ticket->recipientEmails()->attach([$recipientEmail1->id, $recipientEmail2->id]);

        \Mail::to($creator->email)->send(new TicketCreated($ticket));
        
        \Mail::to($assigned->email)->send(new TicketCreated($ticket));
        
        \Mail::to($ccEmail1->email_address)->send(new TicketCreated($ticket));
        \Mail::to($ccEmail2->email_address)->send(new TicketCreated($ticket));
        
        \Mail::to($recipientEmail1->email_address)->send(new TicketCreated($ticket));
        \Mail::to($recipientEmail2->email_address)->send(new TicketCreated($ticket));

        \Mail::assertSent(TicketCreated::class, 6);
        
        $allEmails = [
            $creator->email,
            $assigned->email,
            $ccEmail1->email_address,
            $ccEmail2->email_address,
            $recipientEmail1->email_address,
            $recipientEmail2->email_address,
        ];

        foreach ($allEmails as $email) {
            \Mail::assertSent(TicketCreated::class, function ($mail) use ($email) {
                return $mail->hasTo($email);
            });
        }
    }

    public function test_counts_unique_recipients_when_user_in_multiple_roles(): void
    {
        \Mail::fake();

        $user = User::factory()->create(['email' => 'user@example.com']);
        $helpTopic = HelpTopic::factory()->create();
        
        $ccEmail = Email::factory()->create(['email_address' => 'user@example.com']);   
        
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $user->id,
        ]);

        $ticket->ccEmails()->attach($ccEmail->id);

        $recipients = collect([
            $ticket->user->email,
            $ticket->assignedToUser->email ?? null,
        ])->merge(
            $ticket->ccEmails->pluck('email_address')
        )->unique()->filter()->values();

        foreach ($recipients as $email) {
            \Mail::to($email)->send(new TicketCreated($ticket->load(['user', 'assignedToUser', 'ccEmails'])));
        }

        \Mail::assertSent(TicketCreated::class, 1);
    }

    public function test_counts_recipients_with_cc_and_recipient_emails(): void
    {
        \Mail::fake();

        $creator = User::factory()->create(['email' => 'creator@example.com']);
        $helpTopic = HelpTopic::factory()->create();
        
        $ccEmails = Email::factory()->count(3)->create();
        $recipientEmails = Email::factory()->count(2)->create();
        
        $ticket = Ticket::factory()->create([
            'user_id' => $creator->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $creator->id,
        ]);

        $ticket->ccEmails()->attach($ccEmails->pluck('id'));
        $ticket->recipientEmails()->attach($recipientEmails->pluck('id'));

        \Mail::to($creator->email)->send(new TicketCreated($ticket));
        
        foreach ($ccEmails as $cc) {
            \Mail::to($cc->email_address)->send(new TicketCreated($ticket));
        }
        
        foreach ($recipientEmails as $recipient) {
            \Mail::to($recipient->email_address)->send(new TicketCreated($ticket));
        }

        \Mail::assertSent(TicketCreated::class, 6);
    }

    public function test_no_duplicate_emails_sent_to_same_address(): void
    {
        \Mail::fake();

        $user = User::factory()->create(['email' => 'user@example.com']);
        $assignedUser = User::factory()->create(['email' => 'assigned@example.com']);
        $helpTopic = HelpTopic::factory()->create();

        $ccEmail = Email::factory()->create(['email_address' => 'assigned@example.com']);
        
        $ticket = Ticket::factory()->create([
            'user_id' => $user->id,
            'help_topic' => $helpTopic->id,
            'assigned_to' => $assignedUser->id,
        ]);

        $ticket->ccEmails()->attach($ccEmail->id);

        $uniqueEmails = collect([
            $ticket->user->email,
            $ticket->assignedToUser->email,
        ])->merge(
            $ticket->ccEmails->pluck('email_address')
        )->unique()->filter()->values();

        foreach ($uniqueEmails as $email) {
            \Mail::to($email)->send(new TicketCreated($ticket->load(['user', 'assignedToUser', 'ccEmails'])));
        }

        \Mail::assertSent(TicketCreated::class, 2);
        
        \Mail::assertSent(TicketCreated::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
        
        \Mail::assertSent(TicketCreated::class, function ($mail) use ($assignedUser) {
            return $mail->hasTo($assignedUser->email);
        });
    }
}

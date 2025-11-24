<?php

namespace App\Mail;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;
use Illuminate\Mail\Mailables\Address;

class TicketUpdated extends Mailable
{
    use Queueable, SerializesModels;

    public $ticket;
    public $changes;

    /**
     * Create a new message instance.
     */
    public function __construct(Ticket $ticket, array $changes = [])
    {
        $this->ticket = $ticket;
        $this->changes = $changes;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), config('mail.from.name')),
            subject: 'Ticket Updated: ' . $this->ticket->ticket_name,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.ticket-updated',
            with: [
                'ticket' => $this->ticket,
                'changes' => $this->changes,
                'ticketUrl' => route('tickets.show', $this->ticket->id),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $attachments = [];
        
        if ($this->ticket->attachments && $this->ticket->attachments->count() > 0) {
            foreach ($this->ticket->attachments as $attachment) {
                $attachments[] = Attachment::fromPath(
                    storage_path('app/public/' . $attachment->path)
                )->as($attachment->original_filename);
            }
        }
        
        return $attachments;
    }
}

<?php

namespace App\Services;

use Mailtrap\MailtrapClient;
use Mailtrap\Mime\MailtrapEmail;
use Symfony\Component\Mime\Address;

class MailtrapService
{
    protected $client;

    public function __construct()
    {
        $this->client = MailtrapClient::initSendingEmails(
            apiKey: config('services.mailtrap.api_key'),
            isSandbox: true,
            inboxId: config('services.mailtrap.inbox_id')
        );
    }

    /**
     * Send an email using Mailtrap API
     */
    public function send(string $to, string $subject, string $htmlContent, ?string $textContent = null, ?string $category = null)
    {
        // Add small delay to avoid rate limiting (Mailtrap free tier)
        usleep(500000); // 0.5 second delay
        
        $email = (new MailtrapEmail())
            ->from(new Address(config('mail.from.address'), config('mail.from.name')))
            ->to(new Address($to))
            ->subject($subject)
            ->html($htmlContent);

        if ($textContent) {
            $email->text($textContent);
        }

        if ($category) {
            $email->category($category);
        }

        return $this->client->send($email);
    }

    /**
     * Send ticket created email
     */
    public function sendTicketCreated($ticket, $recipientEmail)
    {
        // Convert images to base64 for inline display
        $processedResponse = $this->embedImagesAsBase64($ticket);
        
        $htmlContent = view('emails.ticket-created', [
            'ticket' => $ticket,
            'ticketUrl' => route('tickets.show', $ticket->id),
            'processedResponse' => $processedResponse,
        ])->render();

        // Add small delay to avoid rate limiting
        usleep(500000);

        $email = (new MailtrapEmail())
            ->from(new Address(config('mail.from.address'), config('mail.from.name')))
            ->to(new Address($recipientEmail))
            ->subject('New Ticket Created: ' . $ticket->ticket_name)
            ->html($htmlContent)
            ->category('Ticket Created');

        return $this->client->send($email);
    }
    
    /**
     * Embed images as base64 in the response
     */
    protected function embedImagesAsBase64($ticket)
    {
        $response = $ticket->response;
        
        if ($ticket->image_paths) {
            $imagePaths = json_decode($ticket->image_paths, true);
            
            foreach ($imagePaths as $path) {
                $fullPath = storage_path('app/public/' . $path);
                
                if (file_exists($fullPath)) {
                    // Read image and convert to base64
                    $imageData = base64_encode(file_get_contents($fullPath));
                    $imageType = mime_content_type($fullPath);
                    $base64Src = "data:{$imageType};base64,{$imageData}";
                    
                    // Replace the storage URL with base64
                    $storageUrl = asset('storage/' . $path);
                    $response = str_replace($storageUrl, $base64Src, $response);
                    
                    // Also try to match just the filename
                    $filename = basename($path);
                    $response = preg_replace(
                        '/src=["\']([^"\']*' . preg_quote($filename, '/') . ')["\']/',
                        'src="' . $base64Src . '"',
                        $response
                    );
                }
            }
        }
        
        return $response;
    }

    /**
     * Send ticket updated email
     */
    public function sendTicketUpdated($ticket, $recipientEmail, $changes = [])
    {
        // Convert images to base64 for inline display
        $processedResponse = $this->embedImagesAsBase64($ticket);
        
        $htmlContent = view('emails.ticket-updated', [
            'ticket' => $ticket,
            'changes' => $changes,
            'ticketUrl' => route('tickets.show', $ticket->id),
            'processedResponse' => $processedResponse,
        ])->render();

        // Add small delay to avoid rate limiting
        usleep(500000);

        $email = (new MailtrapEmail())
            ->from(new Address(config('mail.from.address'), config('mail.from.name')))
            ->to(new Address($recipientEmail))
            ->subject('Ticket Updated: ' . $ticket->ticket_name)
            ->html($htmlContent)
            ->category('Ticket Updated');

        return $this->client->send($email);
    }

    /**
     * Send ticket closed email
     */
    public function sendTicketClosed($ticket, $recipientEmail)
    {
        // Convert images to base64 for inline display
        $processedResponse = $this->embedImagesAsBase64($ticket);
        
        $htmlContent = view('emails.ticket-closed', [
            'ticket' => $ticket,
            'ticketUrl' => route('tickets.show', $ticket->id),
            'processedResponse' => $processedResponse,
        ])->render();

        // Add small delay to avoid rate limiting
        usleep(500000);

        $email = (new MailtrapEmail())
            ->from(new Address(config('mail.from.address'), config('mail.from.name')))
            ->to(new Address($recipientEmail))
            ->subject('Ticket Closed: ' . $ticket->ticket_name)
            ->html($htmlContent)
            ->category('Ticket Closed');

        return $this->client->send($email);
    }
}

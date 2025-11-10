<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background-color: #0f0f0f;
            color: #f9fafb;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 650px;
            margin: 0 auto;
            background-color: #1a1a1a;
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid #27272a;
        }
        .header {
            background-color: #111;
            color: #fff;
            padding: 25px 30px;
            font-size: 22px;
            font-weight: bold;
            border-bottom: 1px solid #27272a;
        }
        .content {
            padding: 30px;
        }
        h2 {
            color: #fff;
            margin-top: 0;
        }
        .ticket-section {
            background-color: #18181b;
            border: 1px solid #27272a;
            border-radius: 8px;
            padding: 20px;
            margin-top: 15px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #27272a;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .label {
            color: #9ca3af;
            font-weight: 600;
            width: 40%;
        }
        .value {
            color: #e5e7eb;
            text-align: right;
            width: 55%;
        }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: bold;
        }
        .badge-open {
            background-color: #22c55e;
            color: #fff;
        }
        .badge-low {
            background-color: #3b82f6;
            color: #fff;
        }
        .badge-medium {
            background-color: #facc15;
            color: #111;
        }
        .badge-high {
            background-color: #ef4444;
            color: #fff;
        }
        .button {
            display: inline-block;
            margin-top: 25px;
            background-color: #4f46e5;
            color: white !important;
            padding: 12px 25px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 12px;
            background-color: #111;
            border-top: 1px solid #27272a;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">🎫Ticket Created</div>
        <div class="content">
            <p>Hello,</p>
            <p>A ticket has been created</p>

            <div class="ticket-section">
                <h2>Ticket Details</h2>

                <div class="detail-row">
                    <div class="label">Ticket Number</div>
                    <div class="value"><strong>{{ $ticket->ticket_name }}</strong></div>
                </div>

                <div class="detail-row">
                    <div class="label">Status</div>
                    <div class="value">
                        <span class="badge badge-open">{{ $ticket->status }}</span>
                    </div>
                </div>

                <div class="detail-row">
                    <div class="label">Priority</div>
                    <div class="value">
                        @if($ticket->priority)
                            <span class="badge badge-{{ strtolower($ticket->priority) }}">{{ $ticket->priority }}</span>
                        @else
                            Not Set
                        @endif
                    </div>
                </div>

                <div class="detail-row">
                    <div class="label">Submitted By</div>
                    <div class="value">{{ $ticket->user->name ?? 'Unknown' }}</div>
                </div>

                <div class="detail-row">
                    <div class="label">Help Topic</div>
                    <div class="value">{{ $ticket->helpTopicRelation->name ?? 'N/A' }}</div>
                </div>

                <div class="detail-row">
                    <div class="label">Department</div>
                    <div class="value">{{ $ticket->department }}</div>
                </div>

                @if($ticket->assigned_to)
                <div class="detail-row">
                    <div class="label">Assigned To</div>
                    <div class="value">{{ $ticket->assignedToUser->name ?? 'Unassigned' }}</div>
                </div>
                @endif

                <div class="detail-row">
                    <div class="label">Created At</div>
                    <div class="value">{{ $ticket->created_at->format('F j, Y g:i A') }}</div>
                </div>
            </div>

            @if($ticket->response)
            <div class="ticket-section">
                <h3 style="color:#4F46E5;">Initial Response</h3>
                <div style="background-color:#111; padding:15px; border-radius:5px; color:#d1d5db;">
                    {!! $processedResponse ?? strip_tags($ticket->response, '<p><br><strong><em><ul><ol><li><img>') !!}
                </div>
            </div>
            @endif

            <center>
                <a href="{{ $ticketUrl }}" class="button">View Ticket</a>
            </center>

            <p style="margin-top: 20px; color:#9ca3af;">
                <small>Please click the button above to view the full ticket details and respond.</small>
            </p>
        </div>

        <div class="footer">
            <p>This is an automated message from the Support Ticket System.</p>
            <p>{{ config('app.name') }} © {{ date('Y') }}</p>
        </div>
    </div>
</body>
</html>

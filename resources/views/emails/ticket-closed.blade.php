{{-- filepath: /home/michael-angelo-santos/Projects/ticket/ticket/resources/views/emails/ticket-closed.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background-color: #f3f4f6;
            color: #111827;
            margin: 0;
            padding: 0;
        }
        .container {
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #2563eb;
            color: #fff;
            padding: 25px 30px;
            font-size: 22px;
            font-weight: bold;
        }
        .content {
            padding: 30px;
        }
        h2 {
            color: #111827;
            margin-top: 0;
        }
        .ticket-section {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-top: 15px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .label {
            color: #6b7280;
            font-weight: 600;
            width: 40%;
        }
        .value {
            color: #111827;
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
        .badge-closed {
            background-color: #6b7280;
            color: #fff;
        }
        .button {
            display: inline-block;
            margin-top: 25px;
            background-color: #22c55e;
            color: white !important;
            padding: 15px 30px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            border: 2px solid #22c55e;
            font-size: 16px;
            line-height: 20px;
            cursor: pointer;
        }
        .button-wrapper {
            text-align: center;
            margin-top: 30px;
            margin-bottom: 20px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 12px;
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
        }
        /* Image styling to prevent cut-off */
        .ticket-section img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 10px 0;
            border-radius: 5px;
            border: 1px solid #e5e7eb;
        }
        .body-content {
            background-color: #ffffff;
            padding: 15px;
            border-radius: 5px;
            color: #374151;
            overflow-x: auto;
            word-wrap: break-word;
            border: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Ticket Closed</div>
        <div class="content">
            <p>Hello,</p>
            <p>Ticket <strong>{{ $ticket->ticket_name }}</strong> has been closed.</p>

            <div class="ticket-section">
                <h2>Ticket Summary</h2>

                <div class="detail-row">
                    <div class="label">Ticket Number</div>
                    <div class="value"><strong>{{ $ticket->ticket_name }}</strong></div>
                </div>

                <div class="detail-row">
                    <div class="label">Status</div>
                    <div class="value">
                        <span class="badge badge-closed">{{ $ticket->status }}</span>
                    </div>
                </div>

                <div class="detail-row">
                    <div class="label">Submitted By</div>
                    <div class="value">{{ $ticket->user->name ?? 'Unknown' }}</div>
                </div>

                @if($ticket->recipient)
                <div class="detail-row">
                    <div class="label">Recipient</div>
                    <div class="value">{{ $ticket->recipient }}</div>
                </div>
                @endif

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
                    <div class="label">Closed By</div>
                    <div class="value">{{ $ticket->closedByUser->name ?? 'Unknown' }}</div>
                </div>

                <div class="detail-row">
                    <div class="label">Uptime</div>
                    <div class="value">{{ $ticket->uptime ? \Carbon\Carbon::parse($ticket->uptime)->format('F j, Y g:i A') : 'N/A' }}</div>
                </div>

                <div class="detail-row">
                    <div class="label">Resolution Time</div>
                    <div class="value">
                        @if($ticket->created_at && $ticket->uptime)
                            {{ $ticket->created_at->diffForHumans(\Carbon\Carbon::parse($ticket->uptime), true) }}
                        @else
                            N/A
                        @endif
                    </div>
                </div>
            </div>

            @if($ticket->body)
            <div class="ticket-section">
                <h3>Final Body</h3>
                <div class="body-content">
                    {!! $processedResponse ?? strip_tags($ticket->body, '<p><br><strong><em><ul><ol><li><img>') !!}
                </div>
            </div>
            @endif

            @if($ticket->attachments && $ticket->attachments->count() > 0)
            <div class="ticket-section">
                <h3>Attachments</h3>
                <div style="margin-top: 10px;">
                    @foreach($ticket->attachments as $attachment)
                        <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                            <span>
                                @if(in_array(strtolower(pathinfo($attachment->original_filename, PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'gif']))
                                    🖼️
                                @elseif(strtolower(pathinfo($attachment->original_filename, PATHINFO_EXTENSION)) === 'pdf')
                                    📄
                                @elseif(in_array(strtolower(pathinfo($attachment->original_filename, PATHINFO_EXTENSION)), ['doc', 'docx']))
                                    📝
                                @else
                                    📎
                                @endif
                                {{ $attachment->original_filename }}
                            </span>
                            <span style="color: #6b7280; font-size: 12px;">
                                {{ number_format($attachment->size / 1024, 2) }} KB
                            </span>
                        </div>
                    @endforeach
                </div>
            </div>
            @endif

            <div class="button-wrapper">
                <a href="http://localhost:8000/tickets" class="button" style="display: inline-block; margin-top: 25px; background-color: #22c55e; color: white !important; padding: 15px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; border: 2px solid #22c55e; font-size: 16px; line-height: 20px;">View Ticket in App</a>
            </div>

        </div>

        <div class="footer">
            <p>This is an automated message from the Support Ticket System.</p>
            <p>{{ config('app.name') }} © {{ date('Y') }}</p>
        </div>
    </div>
</body>
</html>
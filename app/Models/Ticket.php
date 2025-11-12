<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'ticket_name',
        'user_id',
        'cc',
        'ticket_source',
        'help_topic',
        'department',
        'sla_plan',
        'opened_at',
        'opened_by',
        'closed_at',
        'closed_by',
        'resolution_time',
        'assigned_to',
        'response',
        'image_paths',
        'status',
        'priority',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'cc' => 'array', // Cast cc to array
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'due_date' => 'datetime',
        'resolution_time' => 'integer',
    ];

    /**
     * Boot function to set opened_at when creating
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($ticket) {
            if (!$ticket->opened_at) {
                $ticket->opened_at = now();
            }
        });
    }

    /**
     * Get the user that owns the ticket.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the assigned user.
     */
    public function assignedToUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get the help topic.
     */
    public function helpTopicRelation()
    {
        return $this->belongsTo(HelpTopic::class, 'help_topic');
    }

    /**
     * Get the CC'd emails.
     */
    public function ccEmails()
    {
        return $this->belongsToMany(Email::class, 'ticket_cc_emails', 'ticket_id', 'email_id');
    }

    /**
     * Get the CC'd email (for backward compatibility).
     */
    public function ccEmail()
    {
        return $this->belongsTo(Email::class, 'cc');
    }

    /**
     * Get the user that opened the ticket.
     */
    public function openedByUser()
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    /**
     * Get the user that closed the ticket.
     */
    public function closedByUser()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}

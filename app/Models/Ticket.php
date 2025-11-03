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
        'ticket_notice',
        'ticket_source',
        'help_topic',
        'department',
        'sla_plan',
        'due_date',
        'opened_at',
        'assigned_to',
        'canned_response',
        'response',
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
        'due_date' => 'datetime',
    ];

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
}

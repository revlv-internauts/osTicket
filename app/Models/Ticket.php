<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
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
        'closed_at',
        'assigned_to',
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
        'opened_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that owns the ticket.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the CC'd email.
     */
    public function ccEmail()
    {
        return $this->belongsTo(Email::class, 'cc');
    }

    /**
     * Get the help topic.
     */
    public function helpTopicRelation()
    {
        return $this->belongsTo(HelpTopic::class, 'help_topic');
    }

    /**
     * Get the assigned user.
     */
    public function assignedToUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}

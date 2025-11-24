<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketAttachment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'ticket_id',
        'original_filename',
        'filename',
        'path',
        'mime_type',
        'size',
    ];

    /**
     * Get the ticket that owns this attachment.
     */
    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }
}

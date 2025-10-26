<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HelpTopic extends Model
{
    protected $fillable = [
        'name',
    ];

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'help_topic');
    }
}

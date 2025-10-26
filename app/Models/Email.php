<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Email extends Model
{
    protected $fillable = [
        'email_address',
        'name',
    ];

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'cc');
    }
}

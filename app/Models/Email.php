<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Email extends Model
{
    use HasFactory;
    protected $fillable = [
        'email_address',
        'name',
    ];

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'cc');
    }
}

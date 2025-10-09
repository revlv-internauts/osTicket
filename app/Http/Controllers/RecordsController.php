<?php


namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RecordsController extends Controller
{
    public function index()
    {
        $tickets = Ticket::orderBy('created_at', 'desc')->get();
        
        return Inertia::render('records', [
            'tickets' => $tickets
        ]);
    }
}
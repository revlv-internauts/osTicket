<?php

namespace App\Http\Controllers;

use App\Models\Email;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmailController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $emails = Email::orderBy('created_at', 'desc')->get();
        
        return Inertia::render('Emails/Index', [
            'emails' => $emails,
        ]);
    }
    
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'email_address' => 'required|email|unique:emails,email_address|max:255',
            'name' => 'nullable|string|max:255',
        ]);

        Email::create($validated);

        return back()->with('success', 'Email added successfully.');
    }
}

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
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Emails/Create');
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

    /**
     * Display the specified resource.
     */
    public function show(Email $email)
    {
        return Inertia::render('Emails/Show', [
            'email' => $email
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Email $email)
    {
        return Inertia::render('Emails/Edit', [
            'email' => $email,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Email $email)
    {
        $validated = $request->validate([
            'email_address' => 'required|email|max:255|unique:emails,email_address,' . $email->id,
            'name' => 'nullable|string|max:255',
        ]);

        $email->update($validated);

        return redirect()->route('emails.index')
            ->with('success', 'Email updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Email $email)
    {
        $email->delete();

        return redirect()->route('emails.index')
            ->with('success', 'Email deleted successfully.');
    }
}

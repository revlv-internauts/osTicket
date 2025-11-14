<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;

class ListController extends Controller
{
    /**
     * Display the users list.
     */
    public function index()
    {
        $users = User::orderBy('created_at', 'desc')->get();
        
        return Inertia::render('list', [
            'users' => $users
        ]);
    }

    /**
     * Store a newly created user from admin panel.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        return redirect()->route('list')->with('success', 'User created successfully!');
    }
}
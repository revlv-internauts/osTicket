<?php

namespace App\Http\Controllers;

use App\Models\HelpTopic;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HelpTopicController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $helpTopics = HelpTopic::orderBy('created_at', 'desc')->get();
        
        return Inertia::render('HelpTopics/Index', [
            'helpTopics' => $helpTopics,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('HelpTopics/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:help_topics,name|max:255',
        ]);

        HelpTopic::create($validated);

        return back()->with('success', 'Help Topic added successfully.');
    }
}

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

    /**
     * Display the specified resource.
     */
    public function show(HelpTopic $helpTopic)
    {
        return Inertia::render('HelpTopics/Show', [
            'helpTopic' => $helpTopic
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(HelpTopic $helpTopic)
    {
        return Inertia::render('HelpTopics/Edit', [
            'helpTopic' => $helpTopic,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, HelpTopic $helpTopic)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:help_topics,name,' . $helpTopic->id,
        ]);

        $helpTopic->update($validated);

        return redirect()->route('help-topics.index')
            ->with('success', 'Help Topic updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(HelpTopic $helpTopic)
    {
        $helpTopic->delete();

        return redirect()->route('help-topics.index')
            ->with('success', 'Help Topic deleted successfully.');
    }
}

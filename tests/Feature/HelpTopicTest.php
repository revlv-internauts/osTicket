<?php

namespace Tests\Feature;

use App\Models\HelpTopic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HelpTopicTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_help_topic(): void
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)->post(route('help-topics.store'), [
            'name' => $name = 'Technical Support',
        ]);
        
        $response->assertRedirect();
        $response->assertSessionHas('success', 'Help Topic added successfully.');
        
        $this->assertDatabaseHas('help_topics', [
            'name' => $name,
        ]);
    }
}

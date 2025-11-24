<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use App\Models\Email;
use Tests\TestCase;
use App\Models\User;

class EmailTest extends TestCase
{
    use RefreshDatabase;
    /**
     * A basic feature test example.
     */
      public function test_can_create_email(): void
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)->post(route('emails.store'), [
            'email_address' => $email = 'technical.support@example.com',
            'name' => $name = 'Technical Support',
        ]);
        
        $response->assertRedirect();
        $response->assertSessionHas('success', 'Email added successfully.');
        
        $this->assertDatabaseHas('emails', [
            'email_address' => $email,
            'name' => $name,
        ]);
    }
    public function test_check_email_format_validation(): void
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)->post(route('emails.store'), [
            'email_address' => $email = 'invalid-email-format',
            'name' => $name = 'Invalid Email',
        ]);
        
        $response->assertSessionHasErrors(['email_address']);
    }
}

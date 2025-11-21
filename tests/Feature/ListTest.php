<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ListTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A basic feature test example.
     */
  
    public function list()
    {
        $admin = User::factory()->create();
        $otherUsers = User::factory()->count(3)->create();
        return[];
    }


    public function test_can_view_users_list(): void
    {
        $admin = User::factory()->create();
        $otherUsers = User::factory()->count(3)->create();
        
        $response = $this->actingAs($admin)->get(route('list'));
        
        $response->assertStatus(200);

    }


    public function test_can_create_user(): void
    {
        $admin = User::factory()->create();
        
        $response = $this->actingAs($admin)->post(route('list.store'), [
            'name' => $name = 'John Doe',
            'email' => $email = 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);
        
        $response->assertRedirect(route('list'));
        $response->assertSessionHas('success', 'User created successfully!');
        
        $this->assertDatabaseHas('users', [
            'name' => $name,
            'email' => $email,
        ]);
        
        $user = User::where('email', $email)->first();
        $this->assertTrue(Hash::check('password123', $user->password));
    }

    public function test_validates_email_format(): void
    {
        $admin = User::factory()->create();
        
        $response = $this->actingAs($admin)->post(route('list.store'), [
            'name' => 'John Doe',
            'email' => 'invalid-email',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);
        
        $response->assertSessionHasErrors(['email']);
    }


    public function test_validates_password_confirmation(): void
    {
        $admin = User::factory()->create();
        
        $response = $this->actingAs($admin)->post(route('list.store'), [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'different-password',
        ]);
        
        $response->assertSessionHasErrors(['password']);
    }

    public function test_validates_password_strength(): void
    {
        $admin = User::factory()->create();
        
        $response = $this->actingAs($admin)->post(route('list.store'), [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => '123',
            'password_confirmation' => '123',
        ]);
        
        $response->assertSessionHasErrors(['password']);
    }
}
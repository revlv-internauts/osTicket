<?php

namespace Database\Factories;

use App\Models\Ticket;
use App\Models\User;
use App\Models\HelpTopic;
use Illuminate\Database\Eloquent\Factories\Factory;

class TicketFactory extends Factory
{
    protected $model = Ticket::class;

    public function definition(): array
    {
        return [
            'ticket_name' => 'TICKET-' . $this->faker->unique()->numberBetween(1000, 9999),
            'user_id' => User::factory(),
            'ticket_source' => $this->faker->randomElement(['Email','Phone']),
            'help_topic' => HelpTopic::factory(),
            'department' => $this->faker->randomElement(['IT', 'NOC', 'Support']),
            'downtime' => $this->faker->optional()->dateTimeBetween('-1 week', 'now'),
            'opened_by' => User::factory(),
            'uptime' => null,
            'closed_by' => null,
            'resolution_time' => null,
            'assigned_to' => User::factory(),
            'body' => $this->faker->paragraph(),
            'status' => $this->faker->randomElement(['Open', 'Closed']),
            'priority' => $this->faker->randomElement(['Low', 'Medium', 'High']),
        ];
    }

    /**
     * Indicate that the ticket is closed.
     */
    public function closed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'Closed',
            'uptime' => $this->faker->dateTimeBetween($attributes['downtime'] ?? '-1 week', 'now'),
            'closed_by' => User::factory(),
            'resolution_time' => $this->faker->numberBetween(10, 1440),
        ]);
    }

    /**
     * Indicate that the ticket is open.
     */
    public function open(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'Open',
            'uptime' => null,
            'closed_by' => null,
            'resolution_time' => null,
        ]);
    }
}
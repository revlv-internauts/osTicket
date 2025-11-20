<?php

namespace Database\Factories;

use App\Models\HelpTopic;
use Illuminate\Database\Eloquent\Factories\Factory;

class HelpTopicFactory extends Factory
{
    protected $model = HelpTopic::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->randomElement(['DICT-PIALEOS Concern', 'ADB Concern', 'R4B-PRVNET-MIMAROPA']),
        ];
    }
}
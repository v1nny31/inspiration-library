<?php

namespace Database\Factories;

use App\Enums\Section;
use App\Models\Link;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Link>
 */
class LinkFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'section' => Section::Hero,
            'url' => 'https://'.fake()->unique()->domainName(),
        ];
    }

    public function components(): static
    {
        return $this->state(['section' => Section::Components]);
    }
}

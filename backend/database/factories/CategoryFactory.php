<?php

namespace Database\Factories;

use App\Enums\Section;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
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
            'name' => fake()->unique()->words(2, true),
        ];
    }

    public function components(): static
    {
        return $this->state(['section' => Section::Components]);
    }
}

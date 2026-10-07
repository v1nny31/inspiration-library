<?php

namespace Database\Factories;

use App\Enums\Section;
use App\Models\Category;
use App\Models\Inspiration;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Inspiration>
 */
class InspirationFactory extends Factory
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
            // The category always comes from the same section as the inspiration.
            'category_id' => fn (array $attributes) => Category::factory()->state(['section' => $attributes['section']]),
            'name' => fake()->words(3, true),
            'image_path' => 'inspirations/'.fake()->uuid().'.png',
            'website_url' => fake()->url(),
            'tags' => fake()->words(3),
            'hero_prompt' => fake()->sentence(),
            'brief_prompt' => fake()->paragraph(),
        ];
    }

    public function components(): static
    {
        return $this->state(['section' => Section::Components]);
    }
}

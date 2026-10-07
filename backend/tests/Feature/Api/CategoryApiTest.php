<?php

use App\Models\Category;
use App\Models\Inspiration;

it('lists categories alphabetically with their screenshot counts', function () {
    $mobile = Category::factory()->create(['name' => 'Mobile']);
    $dashboard = Category::factory()->create(['name' => 'Dashboard']);
    Inspiration::factory()->count(2)->for($mobile)->create();

    $this->getJson('/api/categories')
        ->assertOk()
        ->assertExactJson(['data' => [
            ['id' => $dashboard->id, 'section' => 'hero', 'name' => 'Dashboard', 'inspirations_count' => 0],
            ['id' => $mobile->id, 'section' => 'hero', 'name' => 'Mobile', 'inspirations_count' => 2],
        ]]);
});

it('lists only the categories of the requested section', function () {
    $landing = Category::factory()->create(['name' => 'Landing Page']);
    $buttons = Category::factory()->components()->create(['name' => 'Buttons']);

    $this->getJson('/api/categories?section=components')
        ->assertOk()
        ->assertJsonPath('data.*.id', [$buttons->id]);

    $this->getJson('/api/categories?section=hero')
        ->assertOk()
        ->assertJsonPath('data.*.id', [$landing->id]);
});

it('creates a category in a section with a trimmed name', function () {
    $this->postJson('/api/categories', ['name' => '  Pagination  ', 'section' => 'components'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Pagination')
        ->assertJsonPath('data.section', 'components')
        ->assertJsonPath('data.inspirations_count', 0);

    $this->assertDatabaseHas('categories', ['name' => 'Pagination', 'section' => 'components']);
});

it('allows the same category name in different sections', function () {
    Category::factory()->create(['name' => 'Cards']);

    $this->postJson('/api/categories', ['name' => 'Cards', 'section' => 'components'])->assertCreated();
});

it('rejects a duplicate or empty category name within a section', function (string $name) {
    Category::factory()->create(['name' => 'Landing Page']);

    $this->postJson('/api/categories', ['name' => $name, 'section' => 'hero'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');
})->with(['duplicate' => 'Landing Page', 'empty' => '   ']);

it('requires a known section', function (array $payload) {
    $this->postJson('/api/categories', ['name' => 'Buttons', ...$payload])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('section');
})->with(['missing' => [[]], 'unknown' => [['section' => 'footers']]]);

it('keeps screenshots when their category is deleted', function () {
    $category = Category::factory()->create();
    $inspiration = Inspiration::factory()->for($category)->create();

    $this->deleteJson("/api/categories/{$category->id}")->assertNoContent();

    $this->assertModelMissing($category);
    expect($inspiration->fresh()->category_id)->toBeNull();
});

<?php

use App\Models\Category;
use App\Models\Inspiration;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake(Inspiration::DISK);
});

it('stores a screenshot with its details', function () {
    $category = Category::factory()->create(['name' => 'Dashboard']);

    $response = $this->post('/api/inspirations', [
        'image' => fakeScreenshot(),
        'section' => 'hero',
        'name' => 'Neon analytics',
        'category_id' => $category->id,
        'website_url' => ' https://neon.example.com/analytics ',
        'tags' => ['Dark Mode', 'charts'],
        'hero_prompt' => 'A glowing data landscape',
        'brief_prompt' => 'Build a dark dashboard',
    ], ['Accept' => 'application/json']);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Neon analytics')
        ->assertJsonPath('data.website_url', 'https://neon.example.com/analytics')
        ->assertJsonPath('data.section', 'hero')
        ->assertJsonPath('data.category', ['id' => $category->id, 'section' => 'hero', 'name' => 'Dashboard'])
        ->assertJsonPath('data.tags', ['dark mode', 'charts'])
        ->assertJsonPath('data.hero_prompt', 'A glowing data landscape')
        ->assertJsonPath('data.brief_prompt', 'Build a dark dashboard');

    $inspiration = Inspiration::sole();
    Storage::disk(Inspiration::DISK)->assertExists($inspiration->image_path);
    expect($response->json('data.image_url'))->toEndWith($inspiration->image_path);
});

it('allows a screenshot without a category, website, tags or prompts', function () {
    $this->post('/api/inspirations', ['image' => fakeScreenshot(), 'section' => 'hero', 'name' => 'Bare'], ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('data.category', null)
        ->assertJsonPath('data.website_url', null)
        ->assertJsonPath('data.tags', [])
        ->assertJsonPath('data.hero_prompt', null);
});

it('rejects uploads that are not raster images', function (UploadedFile $file) {
    $this->post('/api/inspirations', ['image' => $file, 'section' => 'hero', 'name' => 'Bad'], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('image');

    expect(Inspiration::count())->toBe(0);
})->with([
    // Fake uploads report a MIME type from the extension, so use a real file
    // to prove the content (not the ".png" name) is what gets checked.
    'text renamed to .png' => function () {
        $path = tempnam(sys_get_temp_dir(), 'upload');
        file_put_contents($path, 'just text');

        return new UploadedFile($path, 'notes.png', test: true);
    },
    'svg' => fn () => UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
]);

it('requires a section, a name and an existing category', function () {
    $this->post('/api/inspirations', ['image' => fakeScreenshot(), 'category_id' => 999], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['section', 'name', 'category_id']);
});

it('only accepts a web address as the website', function (string $url) {
    $this->post('/api/inspirations', [
        'image' => fakeScreenshot(),
        'section' => 'hero',
        'name' => 'Bad link',
        'website_url' => $url,
    ], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('website_url');

    expect(Inspiration::count())->toBe(0);
})->with([
    'not a url' => 'neon analytics',
    'script' => 'javascript:alert(1)',
    'other scheme' => 'ftp://example.com/file',
]);

it('stores a component in a components category', function () {
    $buttons = Category::factory()->components()->create(['name' => 'Buttons']);

    $this->post('/api/inspirations', [
        'image' => fakeScreenshot(),
        'section' => 'components',
        'name' => 'Pill button',
        'category_id' => $buttons->id,
    ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('data.section', 'components')
        ->assertJsonPath('data.category.name', 'Buttons');
});

it('rejects a category from another section', function () {
    $heroCategory = Category::factory()->create();

    $this->post('/api/inspirations', [
        'image' => fakeScreenshot(),
        'section' => 'components',
        'name' => 'Pill button',
        'category_id' => $heroCategory->id,
    ], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('category_id');

    $component = Inspiration::factory()->components()->create();

    $this->patchJson("/api/inspirations/{$component->id}", ['category_id' => $heroCategory->id])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('category_id');
});

it('lists only the screenshots of the requested section', function () {
    $hero = Inspiration::factory()->create();
    $component = Inspiration::factory()->components()->create();

    $this->getJson('/api/inspirations?section=components')->assertOk()->assertJsonPath('data.*.id', [$component->id]);
    $this->getJson('/api/inspirations?section=hero')->assertOk()->assertJsonPath('data.*.id', [$hero->id]);
});

it('lists the newest screenshots first and filters by category', function () {
    $dashboard = Category::factory()->create();
    $older = Inspiration::factory()->for($dashboard)->create();
    $newer = Inspiration::factory()->for($dashboard)->create();
    Inspiration::factory()->create();

    $this->getJson('/api/inspirations')->assertOk()->assertJsonCount(3, 'data');

    $this->getJson("/api/inspirations?category={$dashboard->id}")
        ->assertOk()
        ->assertJsonPath('data.*.id', [$newer->id, $older->id]);
});

it('updates the details without touching the image', function () {
    $inspiration = Inspiration::factory()->create(['tags' => ['old']]);
    $category = Category::factory()->create();

    $this->patchJson("/api/inspirations/{$inspiration->id}", [
        'name' => 'Renamed',
        'category_id' => $category->id,
        'tags' => ['New'],
        'brief_prompt' => 'Updated brief',
    ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Renamed')
        ->assertJsonPath('data.category.id', $category->id)
        ->assertJsonPath('data.tags', ['new'])
        ->assertJsonPath('data.brief_prompt', 'Updated brief');

    expect($inspiration->fresh()->image_path)->toBe($inspiration->image_path);
});

it('changes and clears the website', function () {
    $inspiration = Inspiration::factory()->create(['website_url' => 'https://old.example.com']);

    $this->patchJson("/api/inspirations/{$inspiration->id}", ['website_url' => 'https://new.example.com'])
        ->assertOk()
        ->assertJsonPath('data.website_url', 'https://new.example.com');

    $this->patchJson("/api/inspirations/{$inspiration->id}", ['website_url' => ''])
        ->assertOk()
        ->assertJsonPath('data.website_url', null);
});

it('deletes the screenshot file along with the record', function () {
    $path = fakeScreenshot()->store('inspirations', Inspiration::DISK);
    $inspiration = Inspiration::factory()->create(['image_path' => $path]);

    $this->deleteJson("/api/inspirations/{$inspiration->id}")->assertNoContent();

    $this->assertModelMissing($inspiration);
    Storage::disk(Inspiration::DISK)->assertMissing($path);
});

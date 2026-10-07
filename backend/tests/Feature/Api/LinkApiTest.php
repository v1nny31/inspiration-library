<?php

use App\Models\Link;

it('lists links newest first with their host', function () {
    $older = Link::factory()->create(['url' => 'https://www.dribbble.com/shots/popular']);
    $newer = Link::factory()->components()->create(['url' => 'https://ui.shadcn.com']);

    $this->getJson('/api/links')
        ->assertOk()
        ->assertJsonPath('data.*.id', [$newer->id, $older->id])
        ->assertJsonPath('data.1.host', 'dribbble.com')
        ->assertJsonPath('data.1.section', 'hero')
        ->assertJsonPath('data.0.section', 'components');
});

it('lists only the links of the requested section', function () {
    $hero = Link::factory()->create();
    $component = Link::factory()->components()->create();

    $this->getJson('/api/links?section=components')->assertOk()->assertJsonPath('data.*.id', [$component->id]);
    $this->getJson('/api/links?section=hero')->assertOk()->assertJsonPath('data.*.id', [$hero->id]);
});

it('adds a link to a section', function () {
    $this->postJson('/api/links', ['url' => '  https://www.godly.website  ', 'section' => 'hero'])
        ->assertCreated()
        ->assertJsonPath('data.url', 'https://www.godly.website')
        ->assertJsonPath('data.host', 'godly.website')
        ->assertJsonPath('data.section', 'hero');

    $this->assertDatabaseHas('links', ['url' => 'https://www.godly.website', 'section' => 'hero']);
});

it('only accepts web links', function (string $url) {
    $this->postJson('/api/links', ['url' => $url, 'section' => 'hero'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('url');
})->with([
    'empty' => '',
    'not a url' => 'dribbble',
    'javascript' => 'javascript:alert(1)',
    'ftp' => 'ftp://files.example.com',
]);

it('requires a known section', function () {
    $this->postJson('/api/links', ['url' => 'https://dribbble.com', 'section' => 'footers'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('section');
});

it('rejects a duplicate link within a section but allows it in another', function () {
    Link::factory()->create(['url' => 'https://dribbble.com']);

    $this->postJson('/api/links', ['url' => 'https://dribbble.com', 'section' => 'hero'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.url.0', 'This link is already in that section.');

    $this->postJson('/api/links', ['url' => 'https://dribbble.com', 'section' => 'components'])->assertCreated();
});

it('deletes a link', function () {
    $link = Link::factory()->create();

    $this->deleteJson("/api/links/{$link->id}")->assertNoContent();

    $this->assertModelMissing($link);
});

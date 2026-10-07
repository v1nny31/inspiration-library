<?php

use App\Models\Inspiration;

it('stores tags trimmed, lowercased and without duplicates', function () {
    $inspiration = new Inspiration(['tags' => [' Dark Mode', 'dark mode ', 'Glassmorphism', '', '  ']]);

    expect($inspiration->tags)->toBe(['dark mode', 'glassmorphism']);
});

it('treats missing tags as an empty list', function () {
    $inspiration = new Inspiration(['tags' => null]);

    expect($inspiration->tags)->toBe([]);
});

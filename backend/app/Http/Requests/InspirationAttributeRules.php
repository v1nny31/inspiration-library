<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/**
 * Rules for the editable inspiration fields, shared by store and update so
 * the two endpoints can't drift apart.
 */
final class InspirationAttributeRules
{
    /**
     * @param  string|null  $section  the inspiration's section; its category must be in the same one.
     * @return array<string, list<mixed>>
     */
    public static function rules(bool $required, ?string $section): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:120'],
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('section', $section)],
            // Web links only: it is rendered as a clickable anchor.
            'website_url' => ['nullable', 'string', 'max:2048', 'url:http,https'],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:40'],
            'hero_prompt' => ['nullable', 'string', 'max:10000'],
            'brief_prompt' => ['nullable', 'string', 'max:20000'],
        ];
    }
}

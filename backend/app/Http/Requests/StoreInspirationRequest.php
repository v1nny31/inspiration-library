<?php

namespace App\Http\Requests;

use App\Enums\Section;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInspirationRequest extends FormRequest
{
    /**
     * The library is a single-user local tool with no accounts.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // SVG is deliberately excluded: it can carry scripts and is served publicly.
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:20480'],
            'section' => ['required', Rule::enum(Section::class)],
            ...InspirationAttributeRules::rules(required: true, section: $this->string('section')->toString()),
        ];
    }
}

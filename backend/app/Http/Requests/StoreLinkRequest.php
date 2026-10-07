<?php

namespace App\Http\Requests;

use App\Enums\Section;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLinkRequest extends FormRequest
{
    /**
     * The library is a single-user local tool with no accounts.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['url' => trim((string) $this->input('url'))]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'section' => ['required', Rule::enum(Section::class)],
            // Web links only: these are rendered as clickable anchors.
            'url' => [
                'required',
                'string',
                'max:2048',
                'url:http,https',
                Rule::unique('links', 'url')->where('section', $this->string('section')->toString()),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['url.unique' => 'This link is already in that section.'];
    }
}

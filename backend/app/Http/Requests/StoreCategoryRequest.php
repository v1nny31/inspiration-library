<?php

namespace App\Http\Requests;

use App\Enums\Section;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends FormRequest
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
        $this->merge(['name' => trim((string) $this->input('name'))]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'section' => ['required', Rule::enum(Section::class)],
            // Unique within its section only: "Cards" can exist in each tab.
            'name' => [
                'required',
                'string',
                'max:60',
                Rule::unique('categories', 'name')->where('section', $this->string('section')->toString()),
            ],
        ];
    }
}

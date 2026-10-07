<?php

namespace App\Http\Requests;

use App\Models\Inspiration;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateInspirationRequest extends FormRequest
{
    /**
     * The library is a single-user local tool with no accounts.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * The section itself can't change; a new category must come from the same one.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Inspiration $inspiration */
        $inspiration = $this->route('inspiration');

        return InspirationAttributeRules::rules(required: false, section: $inspiration->section->value);
    }
}

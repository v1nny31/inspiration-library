<?php

namespace App\Http\Resources;

use App\Models\Category;
use App\Models\Inspiration;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Inspiration
 */
class InspirationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'section' => $this->section,
            'name' => $this->name,
            'image_url' => $this->image_url,
            'website_url' => $this->website_url,
            'tags' => $this->tags,
            'hero_prompt' => $this->hero_prompt,
            'brief_prompt' => $this->brief_prompt,
            'category' => $this->whenLoaded(
                'category',
                fn (?Category $category) => $category ? CategoryResource::make($category) : null,
            ),
            'created_at' => $this->created_at,
        ];
    }
}

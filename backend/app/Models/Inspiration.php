<?php

namespace App\Models;

use App\Enums\Section;
use Database\Factories\InspirationFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Inspiration extends Model
{
    /** @use HasFactory<InspirationFactory> */
    use HasFactory;

    /** Disk the screenshots live on (served from /storage via `storage:link`). */
    public const DISK = 'public';

    protected $fillable = [
        'section',
        'category_id',
        'name',
        'image_path',
        'website_url',
        'tags',
        'hero_prompt',
        'brief_prompt',
    ];

    protected $attributes = [
        'section' => 'hero',
        'tags' => '[]',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['section' => Section::class];
    }

    protected static function booted(): void
    {
        static::deleted(function (Inspiration $inspiration): void {
            Storage::disk(self::DISK)->delete($inspiration->image_path);
        });
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Tags are stored trimmed, lowercased and de-duplicated so the same tag
     * typed two ways ("Dark Mode" / "dark mode ") is only ever stored once.
     *
     * @return Attribute<list<string>, list<string>>
     */
    protected function tags(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value): array => $value === null ? [] : json_decode($value, true),
            set: fn (?array $value): string => json_encode(
                collect($value ?? [])
                    ->map(fn ($tag): string => mb_strtolower(trim((string) $tag)))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all(),
            ),
        );
    }

    /**
     * @return Attribute<string, never>
     */
    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn (): string => Storage::disk(self::DISK)->url($this->image_path));
    }
}

<?php

namespace App\Models;

use App\Enums\Section;
use Database\Factories\LinkFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Link extends Model
{
    /** @use HasFactory<LinkFactory> */
    use HasFactory;

    protected $fillable = ['section', 'url'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['section' => Section::class];
    }

    /**
     * The site's host without "www.", e.g. "dribbble.com".
     *
     * @return Attribute<string, never>
     */
    protected function host(): Attribute
    {
        return Attribute::get(
            fn (): string => preg_replace('/^www\./', '', (string) parse_url($this->url, PHP_URL_HOST)),
        );
    }
}

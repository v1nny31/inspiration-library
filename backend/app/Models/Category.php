<?php

namespace App\Models;

use App\Enums\Section;
use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory;

    protected $fillable = ['section', 'name'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['section' => Section::class];
    }

    /**
     * @return HasMany<Inspiration, $this>
     */
    public function inspirations(): HasMany
    {
        return $this->hasMany(Inspiration::class);
    }
}

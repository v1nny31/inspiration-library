<?php

namespace App\Http\Controllers\Api;

use App\Enums\Section;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoryController extends Controller
{
    /**
     * Alphabetical. `?section=hero|components` narrows the list to one tab.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return CategoryResource::collection(
            Category::query()
                ->withCount('inspirations')
                ->when($request->enum('section', Section::class), fn ($query, Section $section) => $query->where('section', $section))
                ->orderBy('name')
                ->get(),
        );
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = Category::create($request->validated());

        return CategoryResource::make($category->loadCount('inspirations'))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Screenshots in the category are kept and become uncategorized.
     */
    public function destroy(Category $category): JsonResponse
    {
        $category->delete();

        return response()->json(null, 204);
    }
}

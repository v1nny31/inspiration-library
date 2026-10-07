<?php

namespace App\Http\Controllers\Api;

use App\Enums\Section;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInspirationRequest;
use App\Http\Requests\UpdateInspirationRequest;
use App\Http\Resources\InspirationResource;
use App\Models\Inspiration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InspirationController extends Controller
{
    /**
     * Newest first. `?section=hero|components` narrows the list to one tab and
     * `?category={id}` to one category.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $inspirations = Inspiration::query()
            ->with('category')
            ->when($request->enum('section', Section::class), fn ($query, Section $section) => $query->where('section', $section))
            ->when($request->filled('category'), fn ($query) => $query->where('category_id', $request->integer('category')))
            ->latest('id')
            ->get();

        return InspirationResource::collection($inspirations);
    }

    public function store(StoreInspirationRequest $request): JsonResponse
    {
        $path = $request->file('image')->store('inspirations', Inspiration::DISK);

        $inspiration = Inspiration::create([
            ...$request->safe()->except('image'),
            'image_path' => $path,
        ]);

        return InspirationResource::make($inspiration->load('category'))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Inspiration $inspiration): InspirationResource
    {
        return InspirationResource::make($inspiration->load('category'));
    }

    public function update(UpdateInspirationRequest $request, Inspiration $inspiration): InspirationResource
    {
        $inspiration->update($request->validated());

        return InspirationResource::make($inspiration->load('category'));
    }

    public function destroy(Inspiration $inspiration): JsonResponse
    {
        $inspiration->delete();

        return response()->json(null, 204);
    }
}

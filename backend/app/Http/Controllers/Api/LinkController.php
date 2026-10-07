<?php

namespace App\Http\Controllers\Api;

use App\Enums\Section;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLinkRequest;
use App\Http\Resources\LinkResource;
use App\Models\Link;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LinkController extends Controller
{
    /**
     * Newest first. `?section=hero|components` narrows the list to one section.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return LinkResource::collection(
            Link::query()
                ->when($request->enum('section', Section::class), fn ($query, Section $section) => $query->where('section', $section))
                ->latest('id')
                ->get(),
        );
    }

    public function store(StoreLinkRequest $request): JsonResponse
    {
        return LinkResource::make(Link::create($request->validated()))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Link $link): JsonResponse
    {
        $link->delete();

        return response()->json(null, 204);
    }
}

<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\InspirationController;
use App\Http\Controllers\Api\LinkController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (JSON)
|--------------------------------------------------------------------------
|
| Prefixed with /api. There is no authentication: this is a single-user tool
| meant to run locally. Add auth before exposing it on a network.
|
*/

Route::apiResource('categories', CategoryController::class)->only(['index', 'store', 'destroy']);

Route::apiResource('inspirations', InspirationController::class);

Route::apiResource('links', LinkController::class)->only(['index', 'store', 'destroy']);

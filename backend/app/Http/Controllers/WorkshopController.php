<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ListWorkshopsRequest;
use App\Http\Requests\StoreWorkshopRequest;
use App\Http\Requests\UpdateWorkshopRequest;
use App\Http\Resources\WorkshopResource;
use App\Models\Workshop;
use App\Services\WorkshopService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WorkshopController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private readonly WorkshopService $workshopService) {}

    /**
     * GET /api/workshops
     */
    public function index(ListWorkshopsRequest $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Workshop::class);

        $workshops = $this->workshopService->list($request->validated());

        return WorkshopResource::collection($workshops);
    }

    /**
     * GET /api/workshops/{workshop}
     */
    public function show(Workshop $workshop): WorkshopResource
    {
        $this->authorize('view', $workshop);

        $workshop = $this->workshopService->get($workshop);
        $workshop->load(['creator', 'updater']);

        return new WorkshopResource($workshop);
    }

    /**
     * POST /api/workshops
     */
    public function store(StoreWorkshopRequest $request): JsonResponse
    {
        $this->authorize('create', Workshop::class);

        $workshop = $this->workshopService->create(
            $request->validated(),
            $request->user()
        );
        $workshop->load('creator');

        return (new WorkshopResource($workshop))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * PATCH /api/workshops/{workshop}
     */
    public function update(UpdateWorkshopRequest $request, Workshop $workshop): WorkshopResource
    {
        $this->authorize('update', $workshop);

        $updated = $this->workshopService->update(
            $workshop,
            $request->validated(),
            $request->user()
        );
        $updated->load(['creator', 'updater']);

        return new WorkshopResource($updated);
    }
}

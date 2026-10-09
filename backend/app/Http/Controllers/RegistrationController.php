<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\CancelRegistrationRequest;
use App\Http\Requests\ListRegistrationsRequest;
use App\Http\Requests\StoreRegistrationRequest;
use App\Http\Resources\RegistrationResource;
use App\Models\Registration;
use App\Models\Workshop;
use App\Services\RegistrationService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RegistrationController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly RegistrationService $registrationService
    ) {}

    /**
     * GET /api/workshops/{workshop}/registrations
     */
    public function index(ListRegistrationsRequest $request, Workshop $workshop): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Registration::class);

        $result = $this->registrationService->listForWorkshop($workshop, $request->validated());

        return RegistrationResource::collection($result['paginator'])->additional([
            'meta' => [
                'counts' => $result['counts'],
            ],
        ]);
    }

    /**
     * POST /api/workshops/{workshop}/registrations
     */
    public function store(StoreRegistrationRequest $request, Workshop $workshop): JsonResponse
    {
        $this->authorize('create', Registration::class);

        $result = $this->registrationService->register(
            $workshop->id,
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'data' => new RegistrationResource($result['registration']),
            'workshop' => $result['workshop'],
        ], 201);
    }

    /**
     * POST /api/registrations/{registration}/cancel
     */
    public function cancel(CancelRegistrationRequest $request, Registration $registration): JsonResponse
    {
        $this->authorize('cancel', $registration);

        $result = $this->registrationService->cancel(
            $registration->id,
            $request->user(),
            $request->validated('reason')
        );

        return response()->json([
            'data' => new RegistrationResource($result['registration']),
            'workshop' => $result['workshop'],
        ], 200);
    }
}

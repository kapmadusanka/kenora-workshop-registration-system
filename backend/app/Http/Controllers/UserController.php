<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private readonly UserService $userService) {}

    /**
     * GET /api/users
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $users = $this->userService->list(
            $request->only(['role', 'is_active', 'q', 'per_page']),
            15
        );

        return UserResource::collection($users);
    }

    /**
     * POST /api/users
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $user = $this->userService->create(
            $request->validated(),
            $request->user()
        );

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * GET /api/users/{user}
     */
    public function show(User $user): UserResource
    {
        $this->authorize('view', $user);

        $user->load('createdBy');

        return new UserResource($user);
    }

    /**
     * PATCH /api/users/{user}
     */
    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $this->authorize('update', $user);

        $updated = $this->userService->update(
            $user,
            $request->validated(),
            $request->user()
        );

        return new UserResource($updated);
    }
}

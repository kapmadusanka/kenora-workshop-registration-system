<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exceptions\DeactivatedAccountException;
use App\Exceptions\InvalidCredentialsException;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService) {}

    /**
     * POST /api/auth/login
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->login(
                $request->normalizedEmail(),
                (string) $request->input('password'),
            );

            return response()->json($result, 200);
        } catch (InvalidCredentialsException $e) {
            return response()->json(['message' => $e->getMessage(), 'errors' => (object) []], 401);
        } catch (DeactivatedAccountException $e) {
            return response()->json(['message' => $e->getMessage(), 'errors' => (object) []], 403);
        }
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out'], 200);
    }

    /**
     * GET /api/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => new UserResource($request->user())], 200);
    }
}

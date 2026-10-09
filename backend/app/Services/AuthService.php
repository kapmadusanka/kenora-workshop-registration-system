<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DeactivatedAccountException;
use App\Exceptions\InvalidCredentialsException;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\NewAccessToken;

class AuthService
{
    private static ?string $dummyHash = null;

    /**
     * Attempt login. Returns array with token details and user resource data,
     * or throws custom exceptions on failure.
     *
     * @return array{token: string, token_type: string, expires_at: string, user: array<string, mixed>}
     */
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        // Timing safety: always run Hash::check even when user not found.
        $dummyHash = self::$dummyHash ??= Hash::make('dummy-password-for-timing-safety');
        $passwordCorrect = $user
            ? Hash::check($password, $user->password)
            : Hash::check($password, $dummyHash);

        if (! $user || ! $passwordCorrect) {
            throw new InvalidCredentialsException;
        }

        if (! $user->is_active) {
            throw new DeactivatedAccountException;
        }

        $expiresAt = now()->addMinutes((int) config('sanctum.expiration', 480));

        /** @var NewAccessToken $newToken */
        $newToken = $user->createToken('auth', ['*'], $expiresAt);

        return [
            'token' => $newToken->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601ZuluString(),
            'user' => (new UserResource($user))->resolve(),
        ];
    }
}

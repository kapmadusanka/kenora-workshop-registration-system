<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    /**
     * Block deactivated users even when they hold a valid token.
     * Revokes the current token and returns 403.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            // Revoke the current access token
            $user->currentAccessToken()?->delete();

            return response()->json([
                'message' => 'This account is deactivated. Please contact an admin.',
                'errors' => (object) [],
            ], 403);
        }

        return $next($request);
    }
}

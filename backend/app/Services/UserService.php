<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserService
{
    /**
     * List users with optional filters, sorted by name, paginated.
     *
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters, int $defaultPerPage = 15): LengthAwarePaginator
    {
        $query = User::query();

        if (! empty($filters['role'])) {
            $roleValue = $filters['role'] instanceof Role ? $filters['role']->value : (string) $filters['role'];
            $query->where('role', $roleValue);
        }

        if (array_key_exists('is_active', $filters) && $filters['is_active'] !== null && $filters['is_active'] !== '') {
            $isActive = filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($isActive !== null) {
                $query->where('is_active', $isActive);
            }
        }

        if (! empty($filters['q'])) {
            $searchTerm = trim((string) $filters['q']);
            $query->where(function ($sub) use ($searchTerm): void {
                $sub->where('name', 'like', "%{$searchTerm}%")
                    ->orWhere('email', 'like', "%{$searchTerm}%");
            });
        }

        $query->orderBy('name', 'asc');

        $perPage = (int) ($filters['per_page'] ?? $defaultPerPage);
        $perPage = max(1, min($perPage, 100));

        return $query->paginate($perPage);
    }

    /**
     * Create a new user with authenticated creator.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $creator): User
    {
        $data['password'] = Hash::make((string) $data['password']);
        $data['created_by'] = $creator->id;
        $data['is_active'] = $data['is_active'] ?? true;

        $user = User::create($data);
        $user->load('createdBy');

        return $user;
    }

    /**
     * Update target user with lockout protection, token revocation, and atomic admin check.
     *
     * @param  array<string, mixed>  $data
     *
     * @throws ValidationException
     */
    public function update(User $targetUser, array $data, User $actor): User
    {
        // 1. Lockout protection: admin cannot change their own role or deactivate themselves
        if ($actor->id === $targetUser->id) {
            if (isset($data['role'])) {
                $newRole = $data['role'] instanceof Role ? $data['role'] : Role::tryFrom((string) $data['role']);
                if ($newRole !== null && $newRole !== $targetUser->role) {
                    throw ValidationException::withMessages([
                        'role' => ['You cannot change your own role.'],
                    ]);
                }
            }

            if (array_key_exists('is_active', $data)) {
                $isActive = filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN);
                if (! $isActive && $targetUser->is_active) {
                    throw ValidationException::withMessages([
                        'is_active' => ['You cannot deactivate your own account.'],
                    ]);
                }
            }
        }

        // 2. Lockout protection & update within transaction with locked rows
        return DB::transaction(function () use ($targetUser, $data): User {
            /** @var User $target */
            $target = User::where('id', $targetUser->id)->lockForUpdate()->firstOrFail();

            $isTargetAdmin = $target->isAdmin();
            $isDeactivating = array_key_exists('is_active', $data)
                && ! filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN)
                && $target->is_active;

            $isDemoting = false;
            if (isset($data['role'])) {
                $newRole = $data['role'] instanceof Role ? $data['role'] : Role::tryFrom((string) $data['role']);
                if ($newRole !== null && $newRole !== Role::Admin && $target->isAdmin()) {
                    $isDemoting = true;
                }
            }

            // System must always keep at least one active admin
            if ($isTargetAdmin && ($isDeactivating || $isDemoting)) {
                $activeAdminsCount = User::where('role', Role::Admin->value)
                    ->where('is_active', true)
                    ->lockForUpdate()
                    ->count();

                if ($activeAdminsCount <= 1 && $target->is_active) {
                    throw ValidationException::withMessages([
                        'user' => ['Cannot demote or deactivate the last active administrator.'],
                    ]);
                }
            }

            // Track whether Sanctum tokens should be revoked
            $shouldRevokeTokens = false;

            if ($isDeactivating) {
                $shouldRevokeTokens = true;
            }

            if (isset($data['role'])) {
                $newRole = $data['role'] instanceof Role ? $data['role'] : Role::tryFrom((string) $data['role']);
                if ($newRole !== null && $newRole !== $target->role) {
                    $shouldRevokeTokens = true;
                }
            }

            if (! empty($data['password'])) {
                $shouldRevokeTokens = true;
                $data['password'] = Hash::make((string) $data['password']);
            }

            $target->fill($data);
            $target->save();

            if ($shouldRevokeTokens) {
                $target->tokens()->delete();
            }

            $target->load('createdBy');

            return $target;
        });
    }
}

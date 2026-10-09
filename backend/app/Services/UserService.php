<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\Role;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserService
{
    public function __construct(
        private readonly AuditService $auditService
    ) {}

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
        return DB::transaction(function () use ($data, $creator): User {
            $data['password'] = Hash::make((string) $data['password']);
            $data['created_by'] = $creator->id;
            $data['is_active'] = $data['is_active'] ?? true;

            $user = User::create($data);
            $user->load('createdBy');

            $this->auditService->log(
                AuditAction::UserCreated,
                $user,
                null,
                $user->only(['name', 'email', 'role', 'is_active', 'created_by']),
                $creator
            );

            return $user;
        });
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
        return DB::transaction(function () use ($targetUser, $data, $actor): User {
            /** @var User $target */
            $target = User::where('id', $targetUser->id)->lockForUpdate()->firstOrFail();

            $oldRole = $target->role;
            $oldActive = (bool) $target->is_active;
            $oldName = $target->name;
            $oldEmail = $target->email;

            $isTargetAdmin = $target->isAdmin();
            $isDeactivating = array_key_exists('is_active', $data)
                && ! filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN)
                && $target->is_active;

            $isActivating = array_key_exists('is_active', $data)
                && filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN)
                && ! $target->is_active;

            $isDemoting = false;
            $roleChanged = false;
            $newRole = null;
            if (isset($data['role'])) {
                $newRole = $data['role'] instanceof Role ? $data['role'] : Role::tryFrom((string) $data['role']);
                if ($newRole !== null && $newRole !== $target->role) {
                    $roleChanged = true;
                    if ($newRole !== Role::Admin && $target->isAdmin()) {
                        $isDemoting = true;
                    }
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

            if ($roleChanged) {
                $shouldRevokeTokens = true;
            }

            $passwordReset = false;
            if (! empty($data['password'])) {
                $shouldRevokeTokens = true;
                $passwordReset = true;
                $data['password'] = Hash::make((string) $data['password']);
            }

            $target->fill($data);
            $target->save();

            if ($shouldRevokeTokens) {
                $target->tokens()->delete();
            }

            $target->load('createdBy');

            // Audit logging
            // 1. Role changed
            if ($roleChanged && $newRole !== null) {
                $this->auditService->log(
                    AuditAction::UserRoleChanged,
                    $target,
                    ['role' => $oldRole instanceof Role ? $oldRole->value : $oldRole],
                    ['role' => $newRole->value],
                    $actor
                );
            }

            // 2. Deactivated / Activated
            if ($isDeactivating) {
                $this->auditService->log(
                    AuditAction::UserDeactivated,
                    $target,
                    ['is_active' => true],
                    ['is_active' => false],
                    $actor
                );
            } elseif ($isActivating) {
                $this->auditService->log(
                    AuditAction::UserActivated,
                    $target,
                    ['is_active' => false],
                    ['is_active' => true],
                    $actor
                );
            }

            // 3. Password reset
            if ($passwordReset) {
                $this->auditService->log(
                    AuditAction::UserPasswordReset,
                    $target,
                    null,
                    ['password' => 'changed'],
                    $actor
                );
            }

            // 4. Other fields updated (e.g. name, email)
            $generalOld = [];
            $generalNew = [];
            if (array_key_exists('name', $data) && $data['name'] !== $oldName) {
                $generalOld['name'] = $oldName;
                $generalNew['name'] = $target->name;
            }
            if (array_key_exists('email', $data) && $data['email'] !== $oldEmail) {
                $generalOld['email'] = $oldEmail;
                $generalNew['email'] = $target->email;
            }
            if (! empty($generalOld) || ! empty($generalNew)) {
                $this->auditService->log(
                    AuditAction::UserUpdated,
                    $target,
                    $generalOld,
                    $generalNew,
                    $actor
                );
            }

            return $target;
        });
    }
}

<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\Workshop;

class WorkshopPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isManager() || $user->isStaff();
    }

    public function view(User $user, Workshop $workshop): bool
    {
        return $user->isAdmin() || $user->isManager() || $user->isStaff();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isManager();
    }

    public function update(User $user, Workshop $workshop): bool
    {
        return $user->isAdmin() || $user->isManager();
    }
}

<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Registration;
use App\Models\User;

class RegistrationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isManager() || $user->isStaff();
    }

    public function create(User $user): bool
    {
        return $user->isManager() || $user->isStaff();
    }

    public function cancel(User $user, ?Registration $registration = null): bool
    {
        return $user->isManager() || $user->isStaff();
    }
}

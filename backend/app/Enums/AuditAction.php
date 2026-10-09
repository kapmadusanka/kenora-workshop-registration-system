<?php

declare(strict_types=1);

namespace App\Enums;

enum AuditAction: string
{
    case UserCreated = 'user.created';
    case UserUpdated = 'user.updated';
    case UserRoleChanged = 'user.role_changed';
    case UserDeactivated = 'user.deactivated';
    case UserActivated = 'user.activated';
    case UserPasswordReset = 'user.password_reset';

    case WorkshopCreated = 'workshop.created';
    case WorkshopUpdated = 'workshop.updated';
    case WorkshopStatusChanged = 'workshop.status_changed';
    case WorkshopCapacityChanged = 'workshop.capacity_changed';
}

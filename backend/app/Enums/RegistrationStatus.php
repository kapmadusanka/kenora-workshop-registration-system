<?php

declare(strict_types=1);

namespace App\Enums;

enum RegistrationStatus: string
{
    case Active = 'active';
    case Cancelled = 'cancelled';
}

<?php

declare(strict_types=1);

namespace App\Enums;

enum WorkshopStatus: string
{
    case Draft = 'draft';
    case Open = 'open';
    case Cancelled = 'cancelled';
    case Completed = 'completed';
}

<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Symfony\Component\HttpFoundation\Response;

class WorkshopFullException extends Exception
{
    public function __construct(string $message = 'This workshop is full. No seats are left.')
    {
        parent::__construct($message, Response::HTTP_CONFLICT);
    }

    public function getErrorCode(): string
    {
        return 'workshop_full';
    }
}

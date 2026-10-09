<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Symfony\Component\HttpFoundation\Response;

class WorkshopNotOpenException extends Exception
{
    public function __construct(string $message = 'This workshop is not open for registration.')
    {
        parent::__construct($message, Response::HTTP_CONFLICT);
    }

    public function getErrorCode(): string
    {
        return 'workshop_not_open';
    }
}

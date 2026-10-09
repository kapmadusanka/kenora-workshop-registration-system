<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Symfony\Component\HttpFoundation\Response;

class RegistrationAlreadyCancelledException extends Exception
{
    public function __construct(string $message = 'This registration was already cancelled.')
    {
        parent::__construct($message, Response::HTTP_CONFLICT);
    }

    public function getErrorCode(): string
    {
        return 'already_cancelled';
    }
}

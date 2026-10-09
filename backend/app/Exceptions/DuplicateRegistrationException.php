<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Symfony\Component\HttpFoundation\Response;

class DuplicateRegistrationException extends Exception
{
    public function __construct(string $message = 'This email is already registered for this workshop.')
    {
        parent::__construct($message, Response::HTTP_CONFLICT);
    }

    public function getErrorCode(): string
    {
        return 'duplicate_registration';
    }
}

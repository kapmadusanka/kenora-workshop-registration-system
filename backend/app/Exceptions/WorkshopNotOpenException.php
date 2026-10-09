<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Symfony\Component\HttpFoundation\Response;

class WorkshopNotOpenException extends Exception
{
    protected $code = Response::HTTP_CONFLICT;

    protected $message = 'Workshop is not open for registration.';
}

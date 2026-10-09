<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Symfony\Component\HttpFoundation\Response;

class WorkshopFullException extends Exception
{
    protected $code = Response::HTTP_CONFLICT;

    protected $message = 'Workshop is full.';
}

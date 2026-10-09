<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

class DeactivatedAccountException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('This account is deactivated. Please contact an admin.');
    }
}

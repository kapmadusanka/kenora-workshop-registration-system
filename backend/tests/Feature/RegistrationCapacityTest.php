<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class RegistrationCapacityTest extends TestCase
{
    // TODO: test that registering beyond capacity returns 409
    // TODO: test that a workshop with 0 seats left cannot be booked
    // TODO: test that cancelling frees a seat and allows a new registration
}

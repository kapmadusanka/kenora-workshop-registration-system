<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class AccessControlTest extends TestCase
{
    // TODO: test that admin cannot register/cancel attendees (403)
    // TODO: test that manager can create workshops
    // TODO: test that staff cannot create workshops (403)
    // TODO: test that unauthenticated requests return 401
}

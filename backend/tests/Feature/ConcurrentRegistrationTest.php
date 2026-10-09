<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class ConcurrentRegistrationTest extends TestCase
{
    // TODO: test that two simultaneous registrations for the last seat result in only one success
    // TODO: verify lockForUpdate prevents race conditions

    public function test_placeholder(): void
    {
        $this->markTestIncomplete('To be implemented.');
    }
}

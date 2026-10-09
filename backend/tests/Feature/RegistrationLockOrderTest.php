<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use App\Services\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Verifies that the RegistrationService locks the workshop row BEFORE any
 * other per-row operation inside a transaction.
 *
 * Uses DB::listen() to capture query SQL in order. This uses RefreshDatabase
 * because it only tests single-threaded logic (lock ORDER, not race outcomes).
 */
class RegistrationLockOrderTest extends TestCase
{
    use RefreshDatabase;

    private RegistrationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(RegistrationService::class);
    }

    /**
     * After the transaction begins, the very first significant query must be
     *   SELECT ... FROM `workshops` ... FOR UPDATE
     */
    public function test_register_locks_workshop_row_first(): void
    {
        $manager  = User::factory()->manager()->create();
        $workshop = Workshop::factory()->open()->create([
            'capacity'   => 5,
            'created_by' => $manager->id,
        ]);

        $captured = [];

        DB::listen(function ($query) use (&$captured): void {
            $captured[] = $query->sql;
        });

        $this->service->register($workshop->id, [
            'attendee_email' => 'locktest@example.com',
            'attendee_name'  => 'Lock Tester',
        ], $manager);

        // Find queries that contain "for update" (case-insensitive)
        $forUpdateQueries = array_values(array_filter($captured, function (string $sql): bool {
            return (bool) preg_match('/for\s+update/i', $sql);
        }));

        $this->assertNotEmpty($forUpdateQueries, 'At least one FOR UPDATE query must be issued inside register()');

        // The first FOR UPDATE must touch the workshops table
        $firstLock = $forUpdateQueries[0];
        $this->assertMatchesRegularExpression(
            '/from\s+[`"]?workshops[`"]?/i',
            $firstLock,
            "The FIRST lockForUpdate() query must target the workshops table. Got: {$firstLock}"
        );

        // And the workshops lock must appear BEFORE any registrations insert/select
        $firstWorkshopLockIndex   = null;
        $firstRegistrationOpIndex = null;

        foreach ($captured as $i => $sql) {
            if ($firstWorkshopLockIndex === null && preg_match('/from\s+[`"]?workshops[`"]?.*for\s+update/i', $sql)) {
                $firstWorkshopLockIndex = $i;
            }
            if ($firstRegistrationOpIndex === null && preg_match('/[`"]?registrations[`"]?/i', $sql)) {
                $firstRegistrationOpIndex = $i;
            }
        }

        $this->assertNotNull($firstWorkshopLockIndex, 'Workshop lock query not found in captured queries');
        $this->assertNotNull($firstRegistrationOpIndex, 'Registrations query not found in captured queries');

        $this->assertLessThan(
            $firstRegistrationOpIndex,
            $firstWorkshopLockIndex,
            'Workshop row must be locked BEFORE any query touches the registrations table. '
            . "Workshop lock at index {$firstWorkshopLockIndex}, registrations at {$firstRegistrationOpIndex}. "
            . 'Queries: ' . implode(' | ', $captured)
        );
    }

    /**
     * After a transaction begins, the cancel path must lock the workshop row
     * BEFORE it locks/updates the registration row.
     */
    public function test_cancel_locks_workshop_before_registration(): void
    {
        $manager  = User::factory()->manager()->create();
        $workshop = Workshop::factory()->open()->create([
            'capacity'   => 5,
            'created_by' => $manager->id,
        ]);

        $reg = Registration::factory()->active()->create([
            'workshop_id'   => $workshop->id,
            'registered_by' => $manager->id,
        ]);

        $captured = [];

        DB::listen(function ($query) use (&$captured): void {
            $captured[] = $query->sql;
        });

        $this->service->cancel($reg->id, $manager);

        // Find the first FOR UPDATE on workshops and on registrations
        $workshopLockIdx     = null;
        $registrationLockIdx = null;

        foreach ($captured as $i => $sql) {
            if ($workshopLockIdx === null && preg_match('/from\s+[`"]?workshops[`"]?.*for\s+update/i', $sql)) {
                $workshopLockIdx = $i;
            }
            if ($registrationLockIdx === null && preg_match('/from\s+[`"]?registrations[`"]?.*for\s+update/i', $sql)) {
                $registrationLockIdx = $i;
            }
        }

        $this->assertNotNull($workshopLockIdx, 'Workshop FOR UPDATE not found during cancel');
        $this->assertNotNull($registrationLockIdx, 'Registration FOR UPDATE not found during cancel');

        $this->assertLessThan(
            $registrationLockIdx,
            $workshopLockIdx,
            'Workshop row must be locked BEFORE the registration row during cancel. '
            . "Workshop lock at index {$workshopLockIdx}, registration lock at {$registrationLockIdx}. "
            . 'Queries: ' . implode(' | ', $captured)
        );
    }
}

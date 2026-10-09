<?php

declare(strict_types=1);

namespace Tests\Feature\Concurrency;

use App\Enums\RegistrationStatus;
use App\Enums\WorkshopStatus;
use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\Support\ParallelRunner;
use Tests\TestCase;

/**
 * Real-concurrency capacity tests.
 *
 * These tests use DatabaseMigrations (NOT RefreshDatabase) so that data is
 * committed to the real MySQL database and visible to child processes.
 *
 * Safety guards:
 *   - Asserts DB driver is mysql and database name ends with _testing.
 *   - Tagged #[Group('concurrency')] and also run in normal php artisan test.
 */
#[Group('concurrency')]
class CapacityRaceTest extends TestCase
{
    use DatabaseMigrations;

    // -----------------------------------------------------------------------
    // Safety bootstrapping
    // -----------------------------------------------------------------------

    protected function setUp(): void
    {
        parent::setUp();
        $this->guardTestingDatabase();
    }

    /**
     * Fails loudly / skips if we are not on the dedicated MySQL testing database.
     * This protects migrate:fresh from wiping the development database.
     */
    private function guardTestingDatabase(): void
    {
        $driver = config('database.default');
        if ($driver !== 'mysql') {
            $this->markTestSkipped(
                "Concurrency tests require MySQL. Current driver: {$driver}. "
                . 'Set DB_CONNECTION=mysql in .env.testing and point to workshop_system_testing.'
            );
        }

        $dbName = DB::getDatabaseName();
        if (! str_ends_with($dbName, '_testing')) {
            $this->fail(
                "SAFETY GUARD: The active database '{$dbName}' does not end with '_testing'. "
                . 'Concurrency tests refuse to run against a non-testing database to protect production/dev data.'
            );
        }
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /** Create a committed manager user. */
    private function makeManager(): User
    {
        return User::factory()->manager()->create();
    }

    /** Create a committed open workshop with the given capacity. */
    private function makeWorkshop(int $capacity, User $creator): Workshop
    {
        return Workshop::factory()->open()->create([
            'capacity'   => $capacity,
            'created_by' => $creator->id,
        ]);
    }

    /** Count active registrations for a workshop (re-queries from DB). */
    private function activeCount(Workshop $workshop): int
    {
        return Registration::where('workshop_id', $workshop->id)
            ->where('status', RegistrationStatus::Active->value)
            ->count();
    }

    /** Build N register jobs with distinct emails. */
    private function registerJobs(Workshop $workshop, User $actor, int $n): array
    {
        $jobs = [];
        for ($i = 0; $i < $n; $i++) {
            $jobs[] = [
                'action'     => 'register',
                '--workshop' => (string) $workshop->id,
                '--email'    => "racer-{$i}-" . uniqid() . '@test.invalid',
                '--name'     => "Racer {$i}",
                '--user'     => (string) $actor->id,
            ];
        }

        return $jobs;
    }

    /** Summarise results for assertion failure messages. */
    private function summarise(array $results): string
    {
        $ok  = 0;
        $codes = [];
        foreach ($results as $r) {
            if ($r['ok']) {
                $ok++;
            } else {
                $codes[$r['code'] ?? 'unknown'] = ($codes[$r['code'] ?? 'unknown'] ?? 0) + 1;
            }
        }
        $parts = ["ok={$ok}"];
        foreach ($codes as $code => $cnt) {
            $parts[] = "{$code}={$cnt}";
        }

        return implode(', ', $parts);
    }

    // -----------------------------------------------------------------------
    // Scenario 1 — Last seat race (30 attempts, capacity 5)
    // -----------------------------------------------------------------------

    public function test_scenario1_last_seat_race(): void
    {
        $manager  = $this->makeManager();
        $workshop = $this->makeWorkshop(5, $manager);

        $results = ParallelRunner::run(
            $this->registerJobs($workshop, $manager, 30)
        );

        $ok         = array_filter($results, fn ($r) => $r['ok'] === true);
        $full       = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'workshop_full');
        $unexpected = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'unexpected');

        $summary = $this->summarise($results);

        $this->assertCount(
            5,
            $ok,
            "Expected exactly 5 successes (capacity). Got: {$summary}"
        );
        $this->assertCount(
            25,
            $full,
            "Expected exactly 25 workshop_full. Got: {$summary}"
        );
        $this->assertEmpty(
            $unexpected,
            "Unexpected errors in scenario 1. Got: {$summary}"
        );

        // DB state
        $active = $this->activeCount($workshop);
        $total  = Registration::where('workshop_id', $workshop->id)->count();

        $this->assertSame(5, $active, "DB active count must be 5. Got: {$active}. Summary: {$summary}");
        $this->assertSame(5, $total, "Failed attempts must leave no row. Total rows: {$total}. Summary: {$summary}");
    }

    // -----------------------------------------------------------------------
    // Scenario 2 — Brief story: capacity 20, 24 attempts
    // -----------------------------------------------------------------------

    public function test_scenario2_capacity_20_with_24_attempts(): void
    {
        $manager  = $this->makeManager();
        $workshop = $this->makeWorkshop(20, $manager);

        $results = ParallelRunner::run(
            $this->registerJobs($workshop, $manager, 24)
        );

        $ok   = array_filter($results, fn ($r) => $r['ok'] === true);
        $full = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'workshop_full');
        $unexpected = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'unexpected');

        $summary = $this->summarise($results);

        $this->assertCount(20, $ok, "Expected 20 successes. Got: {$summary}");
        $this->assertCount(4, $full, "Expected 4 full rejections. Got: {$summary}");
        $this->assertEmpty($unexpected, "Unexpected errors. Got: {$summary}");

        $active = $this->activeCount($workshop);
        $this->assertSame(20, $active, "DB active must equal capacity. Got: {$active}. Summary: {$summary}");
    }

    // -----------------------------------------------------------------------
    // Scenario 3 — Same email race (10 parallel, same email)
    // -----------------------------------------------------------------------

    public function test_scenario3_same_email_race(): void
    {
        $manager  = $this->makeManager();
        $workshop = $this->makeWorkshop(10, $manager);
        $email    = 'single-racer-' . uniqid() . '@test.invalid';

        $jobs = [];
        for ($i = 0; $i < 10; $i++) {
            $jobs[] = [
                'action'     => 'register',
                '--workshop' => (string) $workshop->id,
                '--email'    => $email,
                '--name'     => 'Single Racer',
                '--user'     => (string) $manager->id,
            ];
        }

        $results = ParallelRunner::run($jobs);

        $ok         = array_filter($results, fn ($r) => $r['ok'] === true);
        $duplicate  = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'duplicate_registration');
        $unexpected = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'unexpected');

        $summary = $this->summarise($results);

        $this->assertCount(1, $ok, "Exactly 1 should succeed. Got: {$summary}");
        $this->assertCount(9, $duplicate, "9 should be duplicate_registration. Got: {$summary}");
        $this->assertEmpty($unexpected, "No unexpected errors. Got: {$summary}");

        $active = $this->activeCount($workshop);
        $this->assertSame(1, $active, "Only 1 active row in DB. Got: {$active}. Summary: {$summary}");
    }

    // -----------------------------------------------------------------------
    // Scenario 4 — Register vs cancel (capacity 3, already full)
    // -----------------------------------------------------------------------

    public function test_scenario4_register_vs_cancel_race(): void
    {
        $manager  = $this->makeManager();
        $workshop = $this->makeWorkshop(3, $manager);

        // Pre-fill 3 active registrations
        $regs = Registration::factory()->count(3)->active()->create([
            'workshop_id'   => $workshop->id,
            'registered_by' => $manager->id,
        ]);

        // 1 cancel + 6 register attempts
        $cancelJob = [
            [
                'action'          => 'cancel',
                '--registration'  => (string) $regs->first()->id,
                '--user'          => (string) $manager->id,
            ],
        ];

        $registerJobs = $this->registerJobs($workshop, $manager, 6);

        $results = ParallelRunner::run(array_merge($cancelJob, $registerJobs));

        $ok         = array_filter($results, fn ($r) => $r['ok'] === true);
        $unexpected = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'unexpected');

        $summary = $this->summarise($results);

        // Cancel MUST succeed
        $cancelResult = $results[0];
        $this->assertTrue($cancelResult['ok'], "Cancel must succeed. Got: " . json_encode($cancelResult));

        // At most 1 register can succeed (the freed seat)
        $registerOk = array_filter(array_slice($results, 1), fn ($r) => $r['ok'] === true);
        $this->assertLessThanOrEqual(1, count($registerOk), "At most 1 register can succeed. Got: {$summary}");

        $this->assertEmpty($unexpected, "No unexpected errors. Got: {$summary}");

        // DB invariant
        $active = $this->activeCount($workshop);
        $this->assertLessThanOrEqual(3, $active, "Active count must not exceed capacity 3. Got: {$active}. Summary: {$summary}");
    }

    // -----------------------------------------------------------------------
    // Scenario 5 — Double cancel race (8 parallel cancel attempts)
    // -----------------------------------------------------------------------

    public function test_scenario5_double_cancel_race(): void
    {
        $manager = $this->makeManager();
        $workshop = $this->makeWorkshop(10, $manager);

        $reg = Registration::factory()->active()->create([
            'workshop_id'   => $workshop->id,
            'registered_by' => $manager->id,
        ]);

        $jobs = [];
        for ($i = 0; $i < 8; $i++) {
            $jobs[] = [
                'action'          => 'cancel',
                '--registration'  => (string) $reg->id,
                '--user'          => (string) $manager->id,
            ];
        }

        $results = ParallelRunner::run($jobs);

        $ok        = array_filter($results, fn ($r) => $r['ok'] === true);
        $cancelled = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'already_cancelled');
        $unexpected = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'unexpected');

        $summary = $this->summarise($results);

        $this->assertCount(1, $ok, "Exactly 1 cancel must succeed. Got: {$summary}");
        $this->assertCount(7, $cancelled, "7 must get already_cancelled. Got: {$summary}");
        $this->assertEmpty($unexpected, "No unexpected errors. Got: {$summary}");

        // DB: row exists, is cancelled, not duplicated
        $reg->refresh();
        $this->assertEquals('cancelled', $reg->status->value, "Row must be cancelled in DB");
        $this->assertNotNull($reg->cancelled_by, "cancelled_by must be set");
        $this->assertNotNull($reg->cancelled_at, "cancelled_at must be set");

        $totalRows = Registration::where('id', $reg->id)->count();
        $this->assertSame(1, $totalRows, "Registration row must not be duplicated or deleted");
    }

    // -----------------------------------------------------------------------
    // Scenario 6 — Capacity lowering vs register (invariant check)
    // -----------------------------------------------------------------------

    public function test_scenario6_capacity_lowering_vs_register(): void
    {
        $manager  = $this->makeManager();
        $workshop = $this->makeWorkshop(10, $manager);

        // Pre-fill 6 active registrations
        Registration::factory()->count(6)->active()->create([
            'workshop_id'   => $workshop->id,
            'registered_by' => $manager->id,
        ]);

        // 1 update-capacity to 6 + 8 register attempts
        $updateJob = [
            [
                'action'       => 'update-capacity',
                '--workshop'   => (string) $workshop->id,
                '--capacity'   => '6',
                '--user'       => (string) $manager->id,
            ],
        ];

        $registerJobs = $this->registerJobs($workshop, $manager, 8);
        $results = ParallelRunner::run(array_merge($updateJob, $registerJobs));

        $unexpected = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'unexpected');

        $summary = $this->summarise($results);

        $this->assertEmpty($unexpected, "No unexpected errors. Got: {$summary}");

        // Invariant: active_count <= final capacity
        $workshop->refresh();
        $finalCapacity = $workshop->capacity;
        $active        = $this->activeCount($workshop);

        $this->assertLessThanOrEqual(
            $finalCapacity,
            $active,
            "INVARIANT VIOLATED: active ({$active}) > capacity ({$finalCapacity}). Summary: {$summary}"
        );
    }

    // -----------------------------------------------------------------------
    // Scenario 7 — Flakiness check: scenario 1 repeated 5 times
    // -----------------------------------------------------------------------

    public function test_scenario7_flakiness_repeat_scenario1_five_times(): void
    {
        $manager = $this->makeManager();

        for ($run = 1; $run <= 5; $run++) {
            $workshop = $this->makeWorkshop(5, $manager);
            $results  = ParallelRunner::run($this->registerJobs($workshop, $manager, 30));

            $ok   = array_filter($results, fn ($r) => $r['ok'] === true);
            $full = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'workshop_full');
            $unexpected = array_filter($results, fn ($r) => ($r['code'] ?? '') === 'unexpected');
            $summary = $this->summarise($results);

            $this->assertCount(5, $ok, "Run #{$run}: expected 5 successes. Got: {$summary}");
            $this->assertCount(25, $full, "Run #{$run}: expected 25 full rejections. Got: {$summary}");
            $this->assertEmpty($unexpected, "Run #{$run}: no unexpected errors. Got: {$summary}");

            $active = $this->activeCount($workshop);
            $this->assertSame(5, $active, "Run #{$run}: DB active must be 5. Got: {$active}. Summary: {$summary}");
        }
    }
}

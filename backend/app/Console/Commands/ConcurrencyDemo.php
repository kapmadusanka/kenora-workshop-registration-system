<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\WorkshopStatus;
use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use App\Services\WorkshopService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Tests\Support\ParallelRunner;

/**
 * Demo command for evaluators.
 *
 * ONLY registered when APP_ENV is local or testing.
 *
 * Creates a temporary open workshop, fires N parallel register attempts,
 * prints a result table, then cleans up its own data.
 *
 * Usage:
 *   php artisan concurrency:demo
 *   php artisan concurrency:demo --capacity=20 --attempts=24
 */
class ConcurrencyDemo extends Command
{
    protected $signature = 'concurrency:demo
        {--capacity=20 : Workshop capacity}
        {--attempts=24 : Number of parallel registration attempts}';

    protected $description = '[testing/local only] Demonstrates real parallel capacity enforcement. Creates a temp workshop, runs N simultaneous register attempts, prints results, and cleans up.';

    public function __construct(
        private readonly WorkshopService $workshopService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $capacity = (int) $this->option('capacity');
        $attempts = (int) $this->option('attempts');

        $this->info("=== Concurrency Demo ===");
        $this->line("Capacity: {$capacity}  |  Parallel attempts: {$attempts}");
        $this->newLine();

        // 1. Create a manager user and a demo workshop
        $manager = User::factory()->manager()->create([
            'name'  => 'Demo Manager',
            'email' => 'demo-manager-' . Str::random(8) . '@demo.invalid',
        ]);

        $code     = 'DEMO-' . strtoupper(Str::random(6));
        $startsAt = now()->addDays(7)->setTime(9, 0, 0);

        $workshop = Workshop::create([
            'code'        => $code,
            'title'       => "Demo Workshop ({$code})",
            'instructor'  => 'Demo Instructor',
            'starts_at'   => $startsAt,
            'ends_at'     => (clone $startsAt)->addHours(2),
            'location'    => 'Demo Room',
            'description' => 'Temporary workshop created by concurrency:demo command.',
            'capacity'    => $capacity,
            'status'      => WorkshopStatus::Open,
            'created_by'  => $manager->id,
        ]);

        $this->line("Created workshop <comment>{$code}</comment> (ID: {$workshop->id}) with capacity {$capacity}.");
        $this->line("Spawning {$attempts} parallel child processes...");
        $this->newLine();

        // 2. Build job list — each attempt has a unique email
        $jobs = [];
        for ($i = 0; $i < $attempts; $i++) {
            $jobs[] = [
                'action'       => 'register',
                '--workshop'   => (string) $workshop->id,
                '--email'      => "attendee-{$i}-" . Str::random(4) . '@demo.invalid',
                '--name'       => "Attendee {$i}",
                '--user'       => (string) $manager->id,
            ];
        }

        // 3. Run all in parallel
        $results = ParallelRunner::run($jobs);

        // 4. Tally outcomes
        $accepted   = 0;
        $full       = 0;
        $duplicate  = 0;
        $unexpected = 0;

        foreach ($results as $r) {
            if ($r['ok'] === true) {
                $accepted++;
            } elseif (($r['code'] ?? '') === 'workshop_full') {
                $full++;
            } elseif (($r['code'] ?? '') === 'duplicate_registration') {
                $duplicate++;
            } else {
                $unexpected++;
                $this->warn('Unexpected result: ' . json_encode($r));
            }
        }

        // 5. Query committed DB state
        $finalActive = Registration::where('workshop_id', $workshop->id)
            ->where('status', 'active')
            ->count();

        $totalRows = Registration::where('workshop_id', $workshop->id)->count();

        $invariantHolds = $finalActive <= $capacity;
        $verdict = $invariantHolds && $unexpected === 0
            ? '<info>OK: capacity never exceeded</info>'
            : '<error>FAILED: invariant violated</error>';

        // 6. Print table
        $this->table(
            ['Metric', 'Value'],
            [
                ['Attempts',               $attempts],
                ['Accepted (ok:true)',      $accepted],
                ['Rejected (workshop_full)', $full],
                ['Rejected (duplicate)',    $duplicate],
                ['Unexpected errors',       $unexpected],
                ['Final active in DB',      $finalActive],
                ['Total rows in DB',        $totalRows],
                ['Capacity',               $capacity],
                ['Invariant (active≤cap)', $invariantHolds ? 'YES' : 'NO'],
            ]
        );

        $this->newLine();
        $this->line("Verdict: {$verdict}");
        $this->newLine();

        // 7. Cleanup — only this demo's data
        $this->line('Cleaning up demo data...');
        Registration::where('workshop_id', $workshop->id)->delete();
        $workshop->delete();
        $manager->delete();

        $this->info('Done. Demo data removed.');

        return $unexpected === 0 && $invariantHolds ? self::SUCCESS : self::FAILURE;
    }
}

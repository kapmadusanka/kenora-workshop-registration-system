<?php

declare(strict_types=1);

namespace Tests\Support;

use PHPUnit\Framework\Assert;
use Symfony\Component\Process\Process;

/**
 * Spawns N child `php artisan concurrency:attempt` processes and collects results.
 *
 * Each child receives --start-at=<microtime> so all fire at the same instant.
 * The runner works on Windows and Linux/macOS (no pcntl_fork).
 */
class ParallelRunner
{
    private const TIMEOUT_SECONDS = 60;

    /** Delay (seconds) added to now() so all children can finish booting before firing. */
    private const FIRE_DELAY = 3.0;

    /**
     * @param  array<int, array<string, string>>  $jobs
     *   Each job is a map of CLI args/options, e.g.
     *   ['action' => 'register', '--workshop' => '1', '--email' => 'a@b.com', '--name' => 'A']
     * @return array<int, array<string, mixed>>  Decoded JSON results, one per job.
     */
    public static function run(array $jobs): array
    {
        if (empty($jobs)) {
            return [];
        }

        $fireAt = microtime(true) + self::FIRE_DELAY;
        $php    = PHP_BINARY;
        $artisan = base_path('artisan');
        $env = array_merge($_ENV, ['APP_ENV' => 'testing']);

        /** @var Process[] $processes */
        $processes = [];

        foreach ($jobs as $job) {
            $cmd = [$php, $artisan, 'concurrency:attempt'];

            // First positional argument is the action
            if (isset($job['action'])) {
                $cmd[] = $job['action'];
            }

            // All other keys are options
            foreach ($job as $key => $value) {
                if ($key === 'action') {
                    continue;
                }
                $cmd[] = $key . '=' . $value;
            }

            $cmd[] = '--start-at=' . number_format($fireAt, 6, '.', '');

            $process = new Process($cmd, base_path(), $env, null, self::TIMEOUT_SECONDS);
            $process->start();
            $processes[] = $process;
        }

        $results = [];

        foreach ($processes as $i => $process) {
            $process->wait();

            $stdout = trim($process->getOutput());
            $stderr = trim($process->getErrorOutput());

            if ($stdout === '') {
                $jobDesc = json_encode($jobs[$i]);
                Assert::fail(
                    "Child process #{$i} produced no stdout.\n"
                    . "Job: {$jobDesc}\n"
                    . "STDERR:\n{$stderr}\n"
                    . "Exit code: " . $process->getExitCode()
                );
            }

            $decoded = json_decode($stdout, true);

            if (! is_array($decoded)) {
                $jobDesc = json_encode($jobs[$i]);
                Assert::fail(
                    "Child process #{$i} stdout is not valid JSON: {$stdout}\n"
                    . "Job: {$jobDesc}\n"
                    . "STDERR:\n{$stderr}\n"
                );
            }

            $results[] = $decoded;
        }

        return $results;
    }
}

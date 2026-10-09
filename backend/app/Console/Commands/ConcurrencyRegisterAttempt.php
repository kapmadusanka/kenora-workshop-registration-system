<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Exceptions\DuplicateRegistrationException;
use App\Exceptions\RegistrationAlreadyCancelledException;
use App\Exceptions\WorkshopFullException;
use App\Exceptions\WorkshopNotOpenException;
use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use App\Services\RegistrationService;
use App\Services\WorkshopService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Child-process entry point for concurrency tests.
 *
 * ONLY registered when APP_ENV is local or testing.
 * Never available in production.
 *
 * Usage:
 *   php artisan concurrency:attempt register  --workshop=1 --email=a@b.com --name="A B" --user=1 --start-at=<microtime>
 *   php artisan concurrency:attempt cancel    --registration=5 --user=2 --start-at=<microtime>
 *   php artisan concurrency:attempt update-capacity --workshop=1 --capacity=6 --user=3 --start-at=<microtime>
 *
 * Outputs exactly ONE line of JSON to stdout:
 *   {"ok":true}
 *   {"ok":false,"code":"workshop_full"}
 *   {"ok":false,"code":"unexpected","message":"..."}
 */
class ConcurrencyRegisterAttempt extends Command
{
    protected $signature = 'concurrency:attempt
        {action : register | cancel | update-capacity}
        {--workshop=  : Workshop ID}
        {--registration= : Registration ID (for cancel)}
        {--email=     : Attendee email (for register)}
        {--name=      : Attendee name (for register)}
        {--user=      : User ID performing the action}
        {--capacity=  : New capacity (for update-capacity)}
        {--start-at=  : Microtime float; busy-loop until this instant before acting}';

    protected $description = '[testing/local only] Child-process entry point for concurrency scenario tests.';

    public function __construct(
        private readonly RegistrationService $registrationService,
        private readonly WorkshopService $workshopService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        // Busy-loop until the shared fire time so all children act simultaneously
        $startAt = (float) $this->option('start-at');
        if ($startAt > 0.0) {
            while (microtime(true) < $startAt) {
                usleep(1000);
            }
        }

        try {
            $result = $this->runAction();
            $this->line(json_encode($result, JSON_THROW_ON_ERROR));

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->line(json_encode([
                'ok'      => false,
                'code'    => 'unexpected',
                'message' => $e->getMessage(),
            ], JSON_THROW_ON_ERROR));

            // Exit 0 so the test process collects the JSON — the test itself fails on "unexpected"
            return self::SUCCESS;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function runAction(): array
    {
        $action = (string) $this->argument('action');

        return match ($action) {
            'register'        => $this->doRegister(),
            'cancel'          => $this->doCancel(),
            'update-capacity' => $this->doUpdateCapacity(),
            default           => ['ok' => false, 'code' => 'error', 'message' => "Unknown action: {$action}"],
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function doRegister(): array
    {
        try {
            $workshopId = (int) $this->option('workshop');
            $userId     = (int) $this->option('user');
            $email      = (string) $this->option('email');
            $name       = (string) $this->option('name');

            /** @var User $user */
            $user = User::findOrFail($userId);

            $this->registrationService->register($workshopId, [
                'attendee_email' => $email,
                'attendee_name'  => $name,
            ], $user);

            return ['ok' => true];
        } catch (WorkshopFullException $e) {
            return ['ok' => false, 'code' => $e->getErrorCode()];
        } catch (WorkshopNotOpenException $e) {
            return ['ok' => false, 'code' => $e->getErrorCode()];
        } catch (DuplicateRegistrationException $e) {
            return ['ok' => false, 'code' => $e->getErrorCode()];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function doCancel(): array
    {
        try {
            $registrationId = (int) $this->option('registration');
            $userId         = (int) $this->option('user');

            /** @var User $user */
            $user = User::findOrFail($userId);

            $this->registrationService->cancel($registrationId, $user);

            return ['ok' => true];
        } catch (RegistrationAlreadyCancelledException $e) {
            return ['ok' => false, 'code' => $e->getErrorCode()];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function doUpdateCapacity(): array
    {
        try {
            $workshopId  = (int) $this->option('workshop');
            $newCapacity = (int) $this->option('capacity');
            $userId      = (int) $this->option('user');

            /** @var Workshop $workshop */
            $workshop = Workshop::findOrFail($workshopId);

            /** @var User $user */
            $user = User::findOrFail($userId);

            $this->workshopService->update($workshop, ['capacity' => $newCapacity], $user);

            return ['ok' => true];
        } catch (ValidationException $e) {
            // capacity_below_registered is signalled via ValidationException
            return ['ok' => false, 'code' => 'capacity_below_registered', 'message' => $e->getMessage()];
        }
    }
}

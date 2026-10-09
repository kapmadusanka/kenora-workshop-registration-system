<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\RegistrationStatus;
use App\Enums\WorkshopStatus;
use App\Exceptions\DuplicateRegistrationException;
use App\Exceptions\RegistrationAlreadyCancelledException;
use App\Exceptions\WorkshopFullException;
use App\Exceptions\WorkshopNotOpenException;
use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class RegistrationService
{
    /**
     * Register an attendee to a workshop with race-safe transaction & lock.
     *
     * @param  array{attendee_name: string, attendee_email: string}  $data
     * @return array{registration: Registration, workshop: array<string, mixed>}
     *
     * @throws WorkshopNotOpenException
     * @throws WorkshopFullException
     * @throws DuplicateRegistrationException
     */
    public function register(int $workshopId, array $data, User $by): array
    {
        try {
            return DB::transaction(function () use ($workshopId, $data, $by): array {
                // Lock workshop row first. Under InnoDB REPEATABLE READ, any read before
                // lockForUpdate() would establish a snapshot that could see stale data.
                // The FIRST query inside the transaction MUST be the lock on the workshop row.
                /** @var Workshop $workshop */
                $workshop = Workshop::whereKey($workshopId)->lockForUpdate()->firstOrFail();

                // 1. Workshop status must be 'open'
                if ($workshop->status !== WorkshopStatus::Open && $workshop->status !== 'open') {
                    throw new WorkshopNotOpenException;
                }

                // 2. Count ACTIVE registrations for the workshop; if count >= capacity -> WorkshopFullException
                $activeCount = Registration::where('workshop_id', $workshop->id)
                    ->where('status', RegistrationStatus::Active->value)
                    ->count();

                if ($activeCount >= (int) $workshop->capacity) {
                    throw new WorkshopFullException;
                }

                // Normalize attendee email (trimmed + lowercase)
                $email = strtolower(trim($data['attendee_email']));

                // 3. Same attendee_email already ACTIVE in this workshop -> DuplicateRegistrationException
                $alreadyActive = Registration::where('workshop_id', $workshop->id)
                    ->where('status', RegistrationStatus::Active->value)
                    ->where('attendee_email', $email)
                    ->exists();

                if ($alreadyActive) {
                    throw new DuplicateRegistrationException;
                }

                // 4. Create the registration: status active, registered_by = $by->id, registered_at = now()
                // // TODO audit: record registration creation
                $registration = Registration::create([
                    'workshop_id' => $workshop->id,
                    'attendee_name' => trim($data['attendee_name']),
                    'attendee_email' => $email,
                    'status' => RegistrationStatus::Active->value,
                    'registered_by' => $by->id,
                    'registered_at' => now(),
                ]);

                $newActiveCount = $activeCount + 1;
                $capacity = (int) $workshop->capacity;

                $registration->load(['registeredBy', 'cancelledBy']);

                return [
                    'registration' => $registration,
                    'workshop' => [
                        'id' => $workshop->id,
                        'capacity' => $capacity,
                        'active_count' => $newActiveCount,
                        'seats_left' => max(0, $capacity - $newActiveCount),
                        'is_full' => $newActiveCount >= $capacity,
                    ],
                ];
            }, 3);
        } catch (QueryException $e) {
            // The DB constraint is the safety net; the service check gives the nice message.
            if ($e->getCode() === '23000' || (string) $e->getCode() === '23000'
                || str_contains($e->getMessage(), 'registrations_workshop_active_key_unique')
                || str_contains($e->getMessage(), 'UNIQUE constraint failed')
                || str_contains($e->getMessage(), 'Duplicate entry')) {
                throw new DuplicateRegistrationException;
            }

            throw $e;
        }
    }

    /**
     * Cancel an active registration with consistent lock order.
     *
     * @return array{registration: Registration, workshop: array<string, mixed>}
     *
     * @throws RegistrationAlreadyCancelledException
     */
    public function cancel(int $registrationId, User $by, ?string $reason = null): array
    {
        return DB::transaction(function () use ($registrationId, $by, $reason): array {
            // 1. Read the registration's workshop_id (plain select)
            $workshopId = Registration::whereKey($registrationId)->value('workshop_id');

            if (! $workshopId) {
                throw (new ModelNotFoundException)->setModel(Registration::class, [$registrationId]);
            }

            // 2. Lock the WORKSHOP row first (consistent lock order with register to prevent deadlocks)
            /** @var Workshop $workshop */
            $workshop = Workshop::whereKey($workshopId)->lockForUpdate()->firstOrFail();

            // 3. Lock the REGISTRATION row and re-check status
            /** @var Registration $registration */
            $registration = Registration::whereKey($registrationId)->lockForUpdate()->firstOrFail();

            if ($registration->status === RegistrationStatus::Cancelled || $registration->status->value === 'cancelled') {
                throw new RegistrationAlreadyCancelledException;
            }

            // // TODO audit: record registration cancellation
            // NEVER delete the row. No SoftDeletes. Do not touch registered_by / registered_at.
            $registration->update([
                'status' => RegistrationStatus::Cancelled->value,
                'cancelled_by' => $by->id,
                'cancelled_at' => now(),
                'cancel_reason' => $reason,
            ]);

            // Cancel is allowed regardless of workshop status (e.g. staff data corrections).
            $activeCount = Registration::where('workshop_id', $workshop->id)
                ->where('status', RegistrationStatus::Active->value)
                ->count();
            $capacity = (int) $workshop->capacity;

            $registration->load(['registeredBy', 'cancelledBy']);

            return [
                'registration' => $registration,
                'workshop' => [
                    'id' => $workshop->id,
                    'capacity' => $capacity,
                    'active_count' => $activeCount,
                    'seats_left' => max(0, $capacity - $activeCount),
                    'is_full' => $activeCount >= $capacity,
                ],
            ];
        }, 3);
    }

    /**
     * List registrations and history for a workshop.
     *
     * @param  array{status?: string, q?: string, per_page?: int|string}  $filters
     * @return array{paginator: LengthAwarePaginator, counts: array{active: int, cancelled: int, total: int}}
     */
    public function listForWorkshop(Workshop $workshop, array $filters): array
    {
        // Return meta counts for tab badges regardless of status filter (one grouped query)
        $statusCounts = Registration::where('workshop_id', $workshop->id)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $activeCount = (int) ($statusCounts[RegistrationStatus::Active->value] ?? $statusCounts['active'] ?? 0);
        $cancelledCount = (int) ($statusCounts[RegistrationStatus::Cancelled->value] ?? $statusCounts['cancelled'] ?? 0);
        $totalCount = $activeCount + $cancelledCount;

        $query = Registration::where('workshop_id', $workshop->id)
            ->with(['registeredBy:id,name', 'cancelledBy:id,name']);

        $status = $filters['status'] ?? 'all';
        if ($status === 'active') {
            $query->where('status', RegistrationStatus::Active->value);
        } elseif ($status === 'cancelled') {
            $query->where('status', RegistrationStatus::Cancelled->value);
        }

        if (! empty($filters['q'])) {
            $q = (string) $filters['q'];
            $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q);
            $query->where(function (Builder $builder) use ($escaped): void {
                $builder->where('attendee_name', 'like', "%{$escaped}%")
                    ->orWhere('attendee_email', 'like', "%{$escaped}%");
            });
        }

        $query->orderBy('registered_at', 'desc')->orderBy('id', 'desc');

        $perPage = min(100, max(1, (int) ($filters['per_page'] ?? 15)));
        $paginator = $query->paginate($perPage);

        return [
            'paginator' => $paginator,
            'counts' => [
                'active' => $activeCount,
                'cancelled' => $cancelledCount,
                'total' => $totalCount,
            ],
        ];
    }
}

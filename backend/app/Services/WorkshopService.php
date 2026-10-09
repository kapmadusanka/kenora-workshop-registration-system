<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\WorkshopStatus;
use App\Models\User;
use App\Models\Workshop;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkshopService
{
    public function __construct(
        private readonly AuditService $auditService
    ) {}

    /**
     * List workshops with filters, pagination, and active_count eager loaded.
     *
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters = []): LengthAwarePaginator
    {
        $query = Workshop::query()->withActiveCount();

        // Date range filters (UTC)
        if (! empty($filters['from']) && ! empty($filters['to'])) {
            $from = Carbon::createFromFormat('Y-m-d', (string) $filters['from'], 'UTC')->startOfDay();
            $to = Carbon::createFromFormat('Y-m-d', (string) $filters['to'], 'UTC')->endOfDay();
            $query->startsBetween($from->toDateTimeString(), $to->toDateTimeString());
        } elseif (! empty($filters['from'])) {
            $from = Carbon::createFromFormat('Y-m-d', (string) $filters['from'], 'UTC')->startOfDay();
            $query->where('starts_at', '>=', $from->toDateTimeString());
        } elseif (! empty($filters['to'])) {
            $to = Carbon::createFromFormat('Y-m-d', (string) $filters['to'], 'UTC')->endOfDay();
            $query->where('starts_at', '<=', $to->toDateTimeString());
        }

        // Status filter (single value or comma-separated list)
        if (! empty($filters['status'])) {
            $statuses = array_filter(array_map('trim', explode(',', (string) $filters['status'])));
            $query->status($statuses);
        }

        // Has seats filter
        if (isset($filters['has_seats']) && filter_var($filters['has_seats'], FILTER_VALIDATE_BOOLEAN)) {
            $query->hasSeats();
        }

        // Search query q
        if (! empty($filters['q'])) {
            $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], (string) $filters['q']);
            $pattern = "%{$escaped}%";
            $query->where(function (Builder $sub) use ($pattern) {
                $sub->where('code', 'LIKE', $pattern)
                    ->orWhere('title', 'LIKE', $pattern)
                    ->orWhere('instructor', 'LIKE', $pattern);
            });
        }

        // Sort: starts_at (default) or -starts_at
        $sort = $filters['sort'] ?? 'starts_at';
        if ($sort === '-starts_at') {
            $query->orderBy('starts_at', 'desc');
        } else {
            $query->orderBy('starts_at', 'asc');
        }

        // Pagination
        $perPage = (int) ($filters['per_page'] ?? 15);
        $perPage = max(1, min($perPage, 100));

        return $query->paginate($perPage);
    }

    /**
     * Get a workshop with active_count and relations.
     */
    public function get(Workshop $workshop): Workshop
    {
        return $workshop->loadCount([
            'registrations as active_count' => fn (Builder $q) => $q->where('status', 'active'),
        ]);
    }

    /**
     * Create a new workshop.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $user): Workshop
    {
        return DB::transaction(function () use ($data, $user): Workshop {
            $data['created_by'] = $user->id;

            if (empty($data['status'])) {
                $data['status'] = WorkshopStatus::Draft;
            }

            /** @var Workshop $workshop */
            $workshop = Workshop::create($data);

            $this->auditService->log(
                AuditAction::WorkshopCreated,
                $workshop,
                null,
                $workshop->only([
                    'code', 'title', 'description', 'instructor',
                    'starts_at', 'duration_minutes', 'capacity', 'status', 'created_by',
                ]),
                $user
            );

            return $workshop->loadCount([
                'registrations as active_count' => fn (Builder $q) => $q->where('status', 'active'),
            ]);
        });
    }

    /**
     * Update an existing workshop with race-safe capacity check and status transition rules.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Workshop $workshop, array $data, User $user): Workshop
    {
        return DB::transaction(function () use ($workshop, $data, $user): Workshop {
            /** @var Workshop $locked */
            $locked = Workshop::where('id', $workshop->id)->lockForUpdate()->firstOrFail();

            $oldStatus = $locked->status;
            $oldCapacity = (int) $locked->capacity;
            $oldAttributes = [
                'title' => $locked->title,
                'description' => $locked->description,
                'instructor' => $locked->instructor,
                'starts_at' => $locked->starts_at ? Carbon::parse($locked->starts_at)->toISOString() : null,
                'duration_minutes' => (int) $locked->duration_minutes,
            ];

            // Status transition check
            $statusChanged = false;
            $targetStatus = null;
            if (isset($data['status'])) {
                $targetStatus = $data['status'] instanceof WorkshopStatus
                    ? $data['status']
                    : WorkshopStatus::from((string) $data['status']);

                if ($targetStatus !== $oldStatus) {
                    $this->validateStatusTransition($oldStatus, $targetStatus);
                    $statusChanged = true;
                }
            }

            // Race-safe capacity check against active registrations
            $capacityChanged = false;
            $newCapacity = null;
            if (isset($data['capacity'])) {
                $newCapacity = (int) $data['capacity'];
                if ($newCapacity !== $oldCapacity) {
                    $capacityChanged = true;
                }

                $activeCount = $locked->registrations()
                    ->where('status', 'active')
                    ->count();

                if ($newCapacity < $activeCount) {
                    throw ValidationException::withMessages([
                        'capacity' => "Capacity cannot be lower than the {$activeCount} attendees already registered.",
                    ]);
                }
            }

            // Code cannot be changed
            unset($data['code']);
            $data['updated_by'] = $user->id;

            $locked->update($data);

            // Audit logging
            // 1. Status changed
            if ($statusChanged && $targetStatus !== null) {
                $this->auditService->log(
                    AuditAction::WorkshopStatusChanged,
                    $locked,
                    ['status' => $oldStatus->value],
                    ['status' => $targetStatus->value],
                    $user
                );
            }

            // 2. Capacity changed
            if ($capacityChanged && $newCapacity !== null) {
                $this->auditService->log(
                    AuditAction::WorkshopCapacityChanged,
                    $locked,
                    ['capacity' => $oldCapacity],
                    ['capacity' => $newCapacity],
                    $user
                );
            }

            // 3. Other fields updated
            $generalOld = [];
            $generalNew = [];
            foreach (['title', 'description', 'instructor', 'duration_minutes'] as $field) {
                if (array_key_exists($field, $data)) {
                    $generalOld[$field] = $oldAttributes[$field];
                    $generalNew[$field] = $locked->{$field};
                }
            }
            if (array_key_exists('starts_at', $data)) {
                $generalOld['starts_at'] = $oldAttributes['starts_at'];
                $generalNew['starts_at'] = $locked->starts_at ? Carbon::parse($locked->starts_at)->toISOString() : null;
            }

            if (! empty($generalOld) || ! empty($generalNew)) {
                $this->auditService->log(
                    AuditAction::WorkshopUpdated,
                    $locked,
                    $generalOld,
                    $generalNew,
                    $user
                );
            }

            return $locked->loadCount([
                'registrations as active_count' => fn (Builder $q) => $q->where('status', 'active'),
            ]);
        });
    }

    /**
     * Validate status transition according to business rules.
     * Allowed:
     * - draft -> open | cancelled
     * - open -> cancelled | completed
     * - cancelled and completed are final
     */
    private function validateStatusTransition(WorkshopStatus $current, WorkshopStatus $target): void
    {
        $allowed = match ($current) {
            WorkshopStatus::Draft => [WorkshopStatus::Open, WorkshopStatus::Cancelled],
            WorkshopStatus::Open => [WorkshopStatus::Cancelled, WorkshopStatus::Completed],
            WorkshopStatus::Cancelled => [],
            WorkshopStatus::Completed => [],
        };

        if (! in_array($target, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => "Cannot change status from '{$current->value}' to '{$target->value}'.",
            ]);
        }
    }
}

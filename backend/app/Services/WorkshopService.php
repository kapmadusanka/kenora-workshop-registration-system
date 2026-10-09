<?php

declare(strict_types=1);

namespace App\Services;

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
                $sub->whereRaw("code LIKE ? ESCAPE '\\'", [$pattern])
                    ->orWhereRaw("title LIKE ? ESCAPE '\\'", [$pattern])
                    ->orWhereRaw("instructor LIKE ? ESCAPE '\\'", [$pattern]);
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
        $data['created_by'] = $user->id;

        if (empty($data['status'])) {
            $data['status'] = WorkshopStatus::Draft;
        }

        /** @var Workshop $workshop */
        $workshop = Workshop::create($data);

        // TODO audit: record workshop creation via AuditService

        return $workshop->loadCount([
            'registrations as active_count' => fn (Builder $q) => $q->where('status', 'active'),
        ]);
    }

    /**
     * Update an existing workshop with race-safe capacity check and status transition rules.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Workshop $workshop, array $data, User $user): Workshop
    {
        return DB::transaction(function () use ($workshop, $data, $user) {
            /** @var Workshop $locked */
            $locked = Workshop::where('id', $workshop->id)->lockForUpdate()->firstOrFail();

            // Status transition check
            if (isset($data['status'])) {
                $targetStatus = $data['status'] instanceof WorkshopStatus
                    ? $data['status']
                    : WorkshopStatus::from((string) $data['status']);

                $currentStatus = $locked->status;
                if ($targetStatus !== $currentStatus) {
                    $this->validateStatusTransition($currentStatus, $targetStatus);
                }
            }

            // Race-safe capacity check against active registrations
            if (isset($data['capacity'])) {
                $newCapacity = (int) $data['capacity'];
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

            // TODO audit: record workshop update via AuditService

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

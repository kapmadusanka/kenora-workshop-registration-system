<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AuditAction;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\Workshop;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;

class AuditService
{
    private const SENSITIVE_KEYS = [
        'password',
        'remember_token',
        'tokens',
    ];

    /**
     * Log an audit action for a given model entity.
     *
     * @param  array<string, mixed>|null  $old
     * @param  array<string, mixed>|null  $new
     */
    public function log(
        string|AuditAction $action,
        Model $entity,
        ?array $old,
        ?array $new,
        ?User $by
    ): ?AuditLog {
        $actionValue = $action instanceof AuditAction ? $action->value : $action;

        // Determine entity type as 'user', 'workshop', or lower basename
        $entityType = match (true) {
            $entity instanceof User => 'user',
            $entity instanceof Workshop => 'workshop',
            default => strtolower(class_basename($entity)),
        };

        // Handle password reset specifically: only {"password": "changed"} as new_values, old_values null
        if ($actionValue === AuditAction::UserPasswordReset->value) {
            return AuditLog::create([
                'user_id' => $by?->id,
                'action' => $actionValue,
                'entity_type' => $entityType,
                'entity_id' => $entity->getKey(),
                'old_values' => null,
                'new_values' => ['password' => 'changed'],
            ]);
        }

        // Creation actions
        if ($actionValue === AuditAction::UserCreated->value || $actionValue === AuditAction::WorkshopCreated->value) {
            $cleanedNew = $this->sanitizeValues($new ?? []);
            if (empty($cleanedNew)) {
                return null;
            }

            return AuditLog::create([
                'user_id' => $by?->id,
                'action' => $actionValue,
                'entity_type' => $entityType,
                'entity_id' => $entity->getKey(),
                'old_values' => null,
                'new_values' => $cleanedNew,
            ]);
        }

        // Diff computation for updates
        [$diffOld, $diffNew] = $this->calculateDiff($old ?? [], $new ?? []);

        // If nothing changed, write no row
        if (empty($diffOld) && empty($diffNew)) {
            return null;
        }

        return AuditLog::create([
            'user_id' => $by?->id,
            'action' => $actionValue,
            'entity_type' => $entityType,
            'entity_id' => $entity->getKey(),
            'old_values' => empty($diffOld) ? null : $diffOld,
            'new_values' => empty($diffNew) ? null : $diffNew,
        ]);
    }

    /**
     * Compute diff between old and new values, sanitizing secrets.
     *
     * @param  array<string, mixed>  $old
     * @param  array<string, mixed>  $new
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    public function calculateDiff(array $old, array $new): array
    {
        $sanitizedOld = $this->sanitizeValues($old);
        $sanitizedNew = $this->sanitizeValues($new);

        $diffOld = [];
        $diffNew = [];

        $keys = array_unique(array_merge(array_keys($sanitizedOld), array_keys($sanitizedNew)));

        foreach ($keys as $key) {
            $hasOld = array_key_exists($key, $sanitizedOld);
            $hasNew = array_key_exists($key, $sanitizedNew);

            if ($hasOld && $hasNew) {
                $valOld = $sanitizedOld[$key];
                $valNew = $sanitizedNew[$key];

                if ($this->normalizeForComparison($valOld) !== $this->normalizeForComparison($valNew)) {
                    $diffOld[$key] = $valOld;
                    $diffNew[$key] = $valNew;
                }
            } elseif ($hasOld) {
                $diffOld[$key] = $sanitizedOld[$key];
            } elseif ($hasNew) {
                $diffNew[$key] = $sanitizedNew[$key];
            }
        }

        return [$diffOld, $diffNew];
    }

    /**
     * Remove sensitive attributes and internal timestamps.
     *
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function sanitizeValues(array $values): array
    {
        $cleaned = [];
        $ignored = array_merge(self::SENSITIVE_KEYS, ['updated_at', 'created_at']);

        foreach ($values as $key => $val) {
            if (in_array($key, $ignored, true)) {
                continue;
            }

            if ($val instanceof \BackedEnum) {
                $val = $val->value;
            }

            if ($val instanceof \DateTimeInterface) {
                $val = $val->format('Y-m-d\TH:i:s\Z');
            }

            $cleaned[$key] = $val;
        }

        return $cleaned;
    }

    /**
     * Normalize values for comparison.
     */
    private function normalizeForComparison(mixed $val): mixed
    {
        if ($val instanceof \BackedEnum) {
            return $val->value;
        }

        if ($val instanceof \DateTimeInterface) {
            return $val->format('Y-m-d\TH:i:s\Z');
        }

        if (is_numeric($val) && ! is_float($val)) {
            return (string) $val;
        }

        if (is_bool($val)) {
            return $val ? 1 : 0;
        }

        return $val;
    }

    /**
     * List audit logs with filters, pagination, and eager loaded actor.
     *
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters = [], int $defaultPerPage = 15): LengthAwarePaginator
    {
        $query = AuditLog::query()->with('user:id,name');

        if (! empty($filters['entity_type'])) {
            $query->where('entity_type', (string) $filters['entity_type']);
        }

        if (! empty($filters['entity_id'])) {
            $query->where('entity_id', (int) $filters['entity_id']);
        }

        if (! empty($filters['action'])) {
            $actionVal = $filters['action'] instanceof AuditAction ? $filters['action']->value : (string) $filters['action'];
            $query->where('action', $actionVal);
        }

        if (! empty($filters['user_id'])) {
            $query->where('user_id', (int) $filters['user_id']);
        }

        if (! empty($filters['from'])) {
            $from = Carbon::parse((string) $filters['from'], 'UTC');
            if (strlen((string) $filters['from']) <= 10) {
                $from = $from->startOfDay();
            }
            $query->where('created_at', '>=', $from->toDateTimeString());
        }

        if (! empty($filters['to'])) {
            $to = Carbon::parse((string) $filters['to'], 'UTC');
            if (strlen((string) $filters['to']) <= 10) {
                $to = $to->endOfDay();
            }
            $query->where('created_at', '<=', $to->toDateTimeString());
        }

        $query->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');

        $perPage = (int) ($filters['per_page'] ?? $defaultPerPage);
        $perPage = max(1, min($perPage, 100));

        return $query->paginate($perPage);
    }
}

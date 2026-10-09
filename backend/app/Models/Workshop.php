<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\WorkshopStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workshop extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'title',
        'instructor',
        'starts_at',
        'ends_at',
        'location',
        'description',
        'capacity',
        'status',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => WorkshopStatus::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'capacity' => 'integer',
        ];
    }

    // -----------------------------------------------------------------------
    // Relations
    // -----------------------------------------------------------------------

    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeStatus(Builder $query, string|WorkshopStatus|array $status): Builder
    {
        if (is_array($status)) {
            $values = array_map(
                fn ($s) => $s instanceof WorkshopStatus ? $s->value : (string) $s,
                $status
            );

            return $query->whereIn('status', $values);
        }

        $value = $status instanceof WorkshopStatus ? $status->value : $status;

        return $query->where('status', $value);
    }

    public function scopeStartsBetween(Builder $query, string $from, string $to): Builder
    {
        return $query->whereBetween('starts_at', [$from, $to]);
    }

    /**
     * Eager-loads active_count via withCount filtered to active registrations.
     */
    public function scopeWithActiveCount(Builder $query): Builder
    {
        $columns = $query->getQuery()->columns ?? [];
        foreach ($columns as $column) {
            $colStr = is_string($column) ? $column : (is_object($column) && method_exists($column, 'getValue') ? (string) $column->getValue($query->getGrammar()) : '');
            if (str_contains($colStr, 'active_count')) {
                return $query;
            }
        }

        return $query->withCount([
            'registrations as active_count' => fn (Builder $q) => $q->where('status', 'active'),
        ]);
    }

    /**
     * Filters workshops that still have at least one free seat.
     */
    public function scopeHasSeats(Builder $query): Builder
    {
        return $query->withActiveCount()
            ->whereRaw('capacity > (select count(*) from registrations where registrations.workshop_id = workshops.id and registrations.status = ?)', ['active']);
    }

    // -----------------------------------------------------------------------
    // Accessors
    // -----------------------------------------------------------------------

    /**
     * Returns the number of remaining seats.
     * Requires active_count to be loaded (via scopeWithActiveCount).
     */
    public function getSeatsLeftAttribute(): int
    {
        return max(0, $this->capacity - (int) ($this->active_count ?? 0));
    }

    /**
     * Returns true if there are no remaining seats.
     */
    public function getIsFullAttribute(): bool
    {
        return ((int) ($this->active_count ?? 0)) >= $this->capacity;
    }
}

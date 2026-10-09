<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\WorkshopStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workshop extends Model
{
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

    public function scopeStatus(Builder $query, string|WorkshopStatus $status): Builder
    {
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
        return $query->withCount([
            'registrations as active_count' => fn (Builder $q) => $q->where('status', 'active'),
        ]);
    }

    /**
     * Filters workshops that still have at least one free seat.
     * Requires scopeWithActiveCount to be applied first, or active_count to be set.
     */
    public function scopeHasSeats(Builder $query): Builder
    {
        return $query->withActiveCount()
            ->havingRaw('capacity > active_count');
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
}

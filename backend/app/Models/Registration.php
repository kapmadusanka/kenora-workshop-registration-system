<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\RegistrationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Registration extends Model
{
    use HasFactory;
    // No SoftDeletes – registrations are NEVER deleted.
    // Cancelling sets status=cancelled, cancelled_by, cancelled_at.

    protected $fillable = [
        'workshop_id',
        'attendee_name',
        'attendee_email',
        'status',
        'registered_by',
        'registered_at',
        'cancelled_by',
        'cancelled_at',
        'cancel_reason',
    ];

    protected function casts(): array
    {
        return [
            'status' => RegistrationStatus::class,
            'registered_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    // -----------------------------------------------------------------------
    // Mutators
    // -----------------------------------------------------------------------

    /**
     * Always store attendee_email lowercased and trimmed.
     */
    public function setAttendeeEmailAttribute(string $value): void
    {
        $this->attributes['attendee_email'] = strtolower(trim($value));
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', RegistrationStatus::Active->value);
    }

    // -----------------------------------------------------------------------
    // Relations
    // -----------------------------------------------------------------------

    public function workshop(): BelongsTo
    {
        return $this->belongsTo(Workshop::class);
    }

    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }
}

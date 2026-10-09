<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\RegistrationStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RegistrationResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workshop_id' => $this->workshop_id,
            'attendee_name' => $this->attendee_name,
            'attendee_email' => $this->attendee_email,
            'status' => $this->status instanceof RegistrationStatus ? $this->status->value : (string) $this->status,
            'registered_by' => $this->whenLoaded('registeredBy', fn () => $this->registeredBy ? [
                'id' => $this->registeredBy->id,
                'name' => $this->registeredBy->name,
            ] : null),
            'registered_at' => $this->registered_at?->toISOString(),
            'cancelled_by' => $this->whenLoaded('cancelledBy', fn () => $this->cancelledBy ? [
                'id' => $this->cancelledBy->id,
                'name' => $this->cancelledBy->name,
            ] : null),
            'cancelled_at' => $this->cancelled_at?->toISOString(),
            'cancel_reason' => $this->cancel_reason,
        ];
    }
}

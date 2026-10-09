<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\WorkshopStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkshopResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $activeCount = (int) ($this->active_count ?? 0);
        $capacity = (int) $this->capacity;

        return [
            'id' => $this->id,
            'code' => $this->code,
            'title' => $this->title,
            'instructor' => $this->instructor,
            'starts_at' => $this->starts_at?->toISOString(),
            'ends_at' => $this->ends_at?->toISOString(),
            'location' => $this->location,
            'description' => $this->description,
            'capacity' => $capacity,
            'status' => $this->status instanceof WorkshopStatus ? $this->status->value : (string) $this->status,
            'active_count' => $activeCount,
            'seats_left' => max(0, $capacity - $activeCount),
            'is_full' => $activeCount >= $capacity,
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'updated_by' => $this->whenLoaded('updater', fn () => $this->updater ? [
                'id' => $this->updater->id,
                'name' => $this->updater->name,
            ] : null),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

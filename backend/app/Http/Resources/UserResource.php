<?php

declare(strict_types=1);

namespace App\Http\Resources;

use BackedEnum;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role instanceof BackedEnum ? $this->role->value : (string) $this->role,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->when(! $request->is('api/auth/*'), fn () => $this->created_at?->toISOString()),
            'created_by' => $this->whenLoaded('createdBy', fn () => $this->createdBy ? [
                'id' => $this->createdBy->id,
                'name' => $this->createdBy->name,
            ] : null),
        ];
    }
}

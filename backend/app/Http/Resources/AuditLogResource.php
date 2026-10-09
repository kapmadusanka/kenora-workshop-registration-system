<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\AuditAction;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AuditLog
 */
class AuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $action = $this->action instanceof AuditAction
            ? $this->action->value
            : (string) $this->action;

        $createdAt = $this->created_at
            ? Carbon::parse($this->created_at)->toISOString()
            : null;

        return [
            'id' => $this->id,
            'action' => $action,
            'entity_type' => $this->entity_type,
            'entity_id' => $this->entity_id,
            'old_values' => $this->old_values,
            'new_values' => $this->new_values,
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ] : null,
            'created_at' => $createdAt,
        ];
    }
}

<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AuditAction;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    protected $model = AuditLog::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'action' => AuditAction::UserCreated,
            'entity_type' => 'user',
            'entity_id' => fake()->randomNumber(5),
            'old_values' => null,
            'new_values' => ['name' => fake()->name(), 'email' => fake()->safeEmail()],
            'created_at' => now(),
        ];
    }
}

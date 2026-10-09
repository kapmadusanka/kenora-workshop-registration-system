<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\RegistrationStatus;
use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Registration>
 */
class RegistrationFactory extends Factory
{
    protected $model = Registration::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workshop_id' => Workshop::factory(),
            'attendee_name' => fake()->name(),
            'attendee_email' => fake()->unique()->safeEmail(),
            'status' => RegistrationStatus::Active,
            'registered_by' => User::factory()->staff(),
            'registered_at' => now(),
            'cancelled_by' => null,
            'cancelled_at' => null,
            'cancel_reason' => null,
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => RegistrationStatus::Active,
            'cancelled_by' => null,
            'cancelled_at' => null,
            'cancel_reason' => null,
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => RegistrationStatus::Cancelled,
            'cancelled_by' => User::factory()->staff(),
            'cancelled_at' => now(),
            'cancel_reason' => 'Attendee requested cancellation.',
        ]);
    }
}

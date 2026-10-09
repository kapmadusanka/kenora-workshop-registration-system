<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\WorkshopStatus;
use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Workshop>
 */
class WorkshopFactory extends Factory
{
    protected $model = Workshop::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startsAt = now()->addDays(fake()->numberBetween(1, 30))->setTime(9, 0, 0);

        return [
            'code' => strtoupper(fake()->unique()->bothify('WS-####-??')),
            'title' => fake()->sentence(3),
            'instructor' => fake()->name(),
            'starts_at' => $startsAt,
            'ends_at' => (clone $startsAt)->addHours(2),
            'location' => fake()->randomElement(['Room 101', 'Studio A', 'Lab 2', 'Online']),
            'description' => fake()->paragraph(),
            'capacity' => fake()->numberBetween(5, 50),
            'status' => WorkshopStatus::Open,
            'created_by' => User::factory()->manager(),
            'updated_by' => null,
        ];
    }

    public function open(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkshopStatus::Open,
        ]);
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkshopStatus::Draft,
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkshopStatus::Cancelled,
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkshopStatus::Completed,
        ]);
    }

    public function full(): static
    {
        return $this->afterCreating(function (Workshop $workshop): void {
            Registration::factory()
                ->count($workshop->capacity)
                ->active()
                ->create([
                    'workshop_id' => $workshop->id,
                ]);
        });
    }
}

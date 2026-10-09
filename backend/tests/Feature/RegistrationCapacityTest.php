<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationCapacityTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = User::factory()->manager()->create();
        $this->staff = User::factory()->staff()->create();
    }

    /**
     * Capacity 2: exactly 2 registrations succeed, 3rd attempt returns 409 workshop_full.
     */
    public function test_registering_beyond_capacity_returns_409_workshop_full(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 2]);

        // 1st registration -> 201
        $res1 = $this->actingAs($this->manager, 'sanctum')->postJson("/api/workshops/{$workshop->id}/registrations", [
            'attendee_name' => 'Alice Johnson',
            'attendee_email' => 'alice@example.com',
        ]);
        $res1->assertStatus(201)
            ->assertJsonPath('workshop.active_count', 1)
            ->assertJsonPath('workshop.seats_left', 1)
            ->assertJsonPath('workshop.is_full', false);

        // 2nd registration -> 201
        $res2 = $this->actingAs($this->staff, 'sanctum')->postJson("/api/workshops/{$workshop->id}/registrations", [
            'attendee_name' => 'Bob Smith',
            'attendee_email' => 'bob@example.com',
        ]);
        $res2->assertStatus(201)
            ->assertJsonPath('workshop.active_count', 2)
            ->assertJsonPath('workshop.seats_left', 0)
            ->assertJsonPath('workshop.is_full', true);

        // 3rd registration -> 409 workshop_full
        $res3 = $this->actingAs($this->manager, 'sanctum')->postJson("/api/workshops/{$workshop->id}/registrations", [
            'attendee_name' => 'Charlie Brown',
            'attendee_email' => 'charlie@example.com',
        ]);
        $res3->assertStatus(409)
            ->assertJson([
                'message' => 'This workshop is full. No seats are left.',
                'code' => 'workshop_full',
                'errors' => [],
            ]);

        // Workshop active count in DB remains 2
        $this->assertEquals(2, Registration::where('workshop_id', $workshop->id)->active()->count());
    }

    /**
     * Workshop with 0 seats left (pre-filled to capacity) cannot be booked.
     */
    public function test_workshop_with_zero_seats_left_cannot_be_booked(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 3]);
        Registration::factory()->count(3)->active()->create(['workshop_id' => $workshop->id]);

        $response = $this->actingAs($this->staff, 'sanctum')->postJson("/api/workshops/{$workshop->id}/registrations", [
            'attendee_name' => 'Diana Prince',
            'attendee_email' => 'diana@example.com',
        ]);

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'This workshop is full. No seats are left.',
                'code' => 'workshop_full',
            ]);
    }

    /**
     * Cancelling frees a seat and allows a new attendee to register.
     */
    public function test_cancelling_frees_seat_and_allows_new_registration(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 1]);

        // Register first attendee filling the workshop
        $regResponse = $this->actingAs($this->manager, 'sanctum')->postJson("/api/workshops/{$workshop->id}/registrations", [
            'attendee_name' => 'Attendee One',
            'attendee_email' => 'one@example.com',
        ]);
        $regResponse->assertStatus(201);
        $registrationId = $regResponse->json('data.id');

        // Trying to register a second attendee fails with 409
        $failResponse = $this->actingAs($this->staff, 'sanctum')->postJson("/api/workshops/{$workshop->id}/registrations", [
            'attendee_name' => 'Attendee Two',
            'attendee_email' => 'two@example.com',
        ]);
        $failResponse->assertStatus(409)->assertJsonPath('code', 'workshop_full');

        // Cancel the first registration
        $cancelResponse = $this->actingAs($this->staff, 'sanctum')->postJson("/api/registrations/{$registrationId}/cancel", [
            'reason' => 'Cannot attend anymore',
        ]);
        $cancelResponse->assertStatus(200)
            ->assertJsonPath('workshop.seats_left', 1)
            ->assertJsonPath('workshop.active_count', 0)
            ->assertJsonPath('workshop.is_full', false);

        // Now registering the second attendee succeeds
        $successResponse = $this->actingAs($this->staff, 'sanctum')->postJson("/api/workshops/{$workshop->id}/registrations", [
            'attendee_name' => 'Attendee Two',
            'attendee_email' => 'two@example.com',
        ]);
        $successResponse->assertStatus(201)
            ->assertJsonPath('workshop.seats_left', 0)
            ->assertJsonPath('workshop.active_count', 1)
            ->assertJsonPath('workshop.is_full', true);

        // Both registration rows still exist in the database (1 cancelled, 1 active)
        $this->assertEquals(2, Registration::where('workshop_id', $workshop->id)->count());
        $this->assertEquals(1, Registration::where('workshop_id', $workshop->id)->active()->count());
    }
}

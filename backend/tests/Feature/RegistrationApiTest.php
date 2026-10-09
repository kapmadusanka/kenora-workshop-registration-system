<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RegistrationApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $manager;

    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->manager = User::factory()->manager()->create();
        $this->staff = User::factory()->staff()->create();
    }

    /**
     * 1. manager and staff can register, cancel and list; admin gets 403 on all three; no token -> 401
     */
    public function test_access_control_for_registrations(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 10]);
        $registration = Registration::factory()->active()->create([
            'workshop_id' => $workshop->id,
            'registered_by' => $this->manager->id,
        ]);

        // Unauthenticated -> 401
        $this->getJson("/api/workshops/{$workshop->id}/registrations")->assertStatus(401);
        $this->postJson("/api/workshops/{$workshop->id}/registrations", [
            'attendee_name' => 'John Doe',
            'attendee_email' => 'john@example.com',
        ])->assertStatus(401);
        $this->postJson("/api/registrations/{$registration->id}/cancel")->assertStatus(401);

        // Admin -> 403 on ALL three
        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/workshops/{$workshop->id}/registrations")
            ->assertStatus(403);
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'John Doe',
                'attendee_email' => 'john@example.com',
            ])
            ->assertStatus(403);
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/registrations/{$registration->id}/cancel")
            ->assertStatus(403);

        // Manager -> allowed on all three
        $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/workshops/{$workshop->id}/registrations")
            ->assertStatus(200);

        $managerRegResponse = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'Manager Attendee',
                'attendee_email' => 'manager.attendee@example.com',
            ])
            ->assertStatus(201);

        $managerRegId = $managerRegResponse->json('data.id');
        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/registrations/{$managerRegId}/cancel")
            ->assertStatus(200);

        // Staff -> allowed on all three
        $this->actingAs($this->staff, 'sanctum')
            ->getJson("/api/workshops/{$workshop->id}/registrations")
            ->assertStatus(200);

        $staffRegResponse = $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'Staff Attendee',
                'attendee_email' => 'staff.attendee@example.com',
            ])
            ->assertStatus(201);

        $staffRegId = $staffRegResponse->json('data.id');
        $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/registrations/{$staffRegId}/cancel")
            ->assertStatus(200);
    }

    /**
     * 2. register success: 201, status active, registered_by = caller, email stored lowercased/trimmed, response workshop.seats_left correct
     */
    public function test_register_success(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 5]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => '  Jane Doe  ',
                'attendee_email' => '  Jane.Doe@EXAMPLE.COM  ',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.attendee_name', 'Jane Doe')
            ->assertJsonPath('data.attendee_email', 'jane.doe@example.com')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.registered_by.id', $this->manager->id)
            ->assertJsonPath('data.registered_by.name', $this->manager->name)
            ->assertJsonPath('data.cancelled_by', null)
            ->assertJsonPath('data.cancelled_at', null)
            ->assertJsonPath('data.cancel_reason', null)
            ->assertJsonPath('workshop.id', $workshop->id)
            ->assertJsonPath('workshop.capacity', 5)
            ->assertJsonPath('workshop.active_count', 1)
            ->assertJsonPath('workshop.seats_left', 4)
            ->assertJsonPath('workshop.is_full', false);

        $this->assertDatabaseHas('registrations', [
            'workshop_id' => $workshop->id,
            'attendee_name' => 'Jane Doe',
            'attendee_email' => 'jane.doe@example.com',
            'status' => 'active',
            'registered_by' => $this->manager->id,
        ]);
    }

    /**
     * 3. client-sent registered_by/status are ignored
     */
    public function test_client_sent_registered_by_and_status_are_ignored(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 5]);
        $otherUser = User::factory()->admin()->create();

        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'Bob Hacker',
                'attendee_email' => 'bob.hacker@example.com',
                'status' => 'cancelled',
                'registered_by' => $otherUser->id,
                'cancelled_by' => $otherUser->id,
                'cancel_reason' => 'Hacked',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.registered_by.id', $this->staff->id)
            ->assertJsonPath('data.cancelled_by', null)
            ->assertJsonPath('data.cancel_reason', null);

        $this->assertDatabaseHas('registrations', [
            'attendee_email' => 'bob.hacker@example.com',
            'status' => 'active',
            'registered_by' => $this->staff->id,
            'cancelled_by' => null,
            'cancel_reason' => null,
        ]);
    }

    /**
     * 4. validation: missing name, bad email -> 422
     */
    public function test_validation_errors(): void
    {
        $workshop = Workshop::factory()->open()->create();

        // Missing attendee_name and bad email
        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => '',
                'attendee_email' => 'not-an-email',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['attendee_name', 'attendee_email']);
    }

    /**
     * 5. workshop draft, cancelled, completed -> 409 code workshop_not_open
     */
    public function test_workshop_not_open_statuses_return_409(): void
    {
        $draftWorkshop = Workshop::factory()->draft()->create();
        $cancelledWorkshop = Workshop::factory()->cancelled()->create();
        $completedWorkshop = Workshop::factory()->completed()->create();

        foreach ([$draftWorkshop, $cancelledWorkshop, $completedWorkshop] as $workshop) {
            $response = $this->actingAs($this->manager, 'sanctum')
                ->postJson("/api/workshops/{$workshop->id}/registrations", [
                    'attendee_name' => 'Tester',
                    'attendee_email' => 'tester@example.com',
                ]);

            $response->assertStatus(409)
                ->assertJson([
                    'message' => 'This workshop is not open for registration.',
                    'code' => 'workshop_not_open',
                    'errors' => [],
                ]);
        }
    }

    /**
     * 6. capacity 2: 2 succeed, 3rd -> 409 workshop_full; workshop active_count stays 2
     */
    public function test_capacity_enforcement(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 2]);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'Attendee 1',
                'attendee_email' => 'att1@example.com',
            ])
            ->assertStatus(201);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'Attendee 2',
                'attendee_email' => 'att2@example.com',
            ])
            ->assertStatus(201);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'Attendee 3',
                'attendee_email' => 'att3@example.com',
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'This workshop is full. No seats are left.',
                'code' => 'workshop_full',
                'errors' => [],
            ]);

        $this->assertEquals(2, Registration::where('workshop_id', $workshop->id)->active()->count());
    }

    /**
     * 7. duplicate active email in the same workshop -> 409 duplicate_registration (also with different letter case / spaces)
     */
    public function test_duplicate_active_email_returns_409(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 10]);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'First Registrant',
                'attendee_email' => 'duplicate@example.com',
            ])
            ->assertStatus(201);

        // Try registering again with varied letter case and surrounding spaces
        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'Second Attempt',
                'attendee_email' => '  Duplicate@Example.Com  ',
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'This email is already registered for this workshop.',
                'code' => 'duplicate_registration',
                'errors' => [],
            ]);
    }

    /**
     * 8. same email allowed in a DIFFERENT workshop
     */
    public function test_same_email_allowed_in_different_workshop(): void
    {
        $workshop1 = Workshop::factory()->open()->create();
        $workshop2 = Workshop::factory()->open()->create();

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/workshops/{$workshop1->id}/registrations", [
                'attendee_name' => 'Multi Student',
                'attendee_email' => 'student@example.com',
            ])
            ->assertStatus(201);

        $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/workshops/{$workshop2->id}/registrations", [
                'attendee_name' => 'Multi Student',
                'attendee_email' => 'student@example.com',
            ])
            ->assertStatus(201);

        $this->assertDatabaseCount('registrations', 2);
    }

    /**
     * 9. cancel: sets status, cancelled_by, cancelled_at, reason; row still exists (assert row count unchanged and the row is in the DB); seat is freed (seats_left +1)
     */
    public function test_cancel_registration_frees_seat_and_preserves_row(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 2]);
        $reg = Registration::factory()->active()->create([
            'workshop_id' => $workshop->id,
            'registered_by' => $this->manager->id,
        ]);

        $initialRowCount = Registration::count();

        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/registrations/{$reg->id}/cancel", [
                'reason' => 'Schedule conflict',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.cancelled_by.id', $this->staff->id)
            ->assertJsonPath('data.cancelled_by.name', $this->staff->name)
            ->assertJsonPath('data.cancel_reason', 'Schedule conflict')
            ->assertJsonPath('workshop.seats_left', 2)
            ->assertJsonPath('workshop.active_count', 0)
            ->assertJsonPath('workshop.is_full', false);

        // Assert row count is unchanged and row still exists in DB
        $this->assertEquals($initialRowCount, Registration::count());
        $this->assertDatabaseHas('registrations', [
            'id' => $reg->id,
            'status' => 'cancelled',
            'cancelled_by' => $this->staff->id,
            'cancel_reason' => 'Schedule conflict',
        ]);
        $this->assertNotNull(Registration::find($reg->id)->cancelled_at);
    }

    /**
     * 10. cancel twice -> 409 already_cancelled and cancelled_by/cancelled_at are NOT overwritten
     */
    public function test_cancel_twice_returns_409_already_cancelled(): void
    {
        $workshop = Workshop::factory()->open()->create();
        $reg = Registration::factory()->active()->create([
            'workshop_id' => $workshop->id,
            'registered_by' => $this->manager->id,
        ]);

        // First cancel by manager
        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/registrations/{$reg->id}/cancel", ['reason' => 'First cancel'])
            ->assertStatus(200);

        $regAfterFirstCancel = Registration::find($reg->id);
        $firstCancelledAt = $regAfterFirstCancel->cancelled_at;

        // Second cancel attempt by staff
        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/registrations/{$reg->id}/cancel", ['reason' => 'Second cancel attempt']);

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'This registration was already cancelled.',
                'code' => 'already_cancelled',
                'errors' => [],
            ]);

        $regAfterSecondAttempt = Registration::find($reg->id);
        $this->assertEquals($this->manager->id, $regAfterSecondAttempt->cancelled_by);
        $this->assertEquals($firstCancelledAt?->toIso8601String(), $regAfterSecondAttempt->cancelled_at?->toIso8601String());
        $this->assertEquals('First cancel', $regAfterSecondAttempt->cancel_reason);
    }

    /**
     * 11. after cancel the same email can register again (new row; old row still there; total rows = 2)
     */
    public function test_same_email_can_register_again_after_cancel(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 5]);

        $res1 = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'Repeated Registrant',
                'attendee_email' => 'repeated@example.com',
            ]);
        $res1->assertStatus(201);
        $id1 = $res1->json('data.id');

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/registrations/{$id1}/cancel", ['reason' => 'Cancelled once'])
            ->assertStatus(200);

        $res2 = $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'Repeated Registrant',
                'attendee_email' => 'repeated@example.com',
            ]);
        $res2->assertStatus(201);
        $id2 = $res2->json('data.id');

        $this->assertNotEquals($id1, $id2);
        $this->assertEquals(2, Registration::where('workshop_id', $workshop->id)->count());
        $this->assertEquals(1, Registration::where('workshop_id', $workshop->id)->active()->count());
    }

    /**
     * 12. staff cancels a registration made by a manager (allowed) and history shows both names
     */
    public function test_staff_cancels_registration_made_by_manager(): void
    {
        $workshop = Workshop::factory()->open()->create();

        $regRes = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/workshops/{$workshop->id}/registrations", [
                'attendee_name' => 'Student Alice',
                'attendee_email' => 'alice.student@example.com',
            ]);
        $regRes->assertStatus(201);
        $regId = $regRes->json('data.id');

        $cancelRes = $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/registrations/{$regId}/cancel", ['reason' => 'Cancelled by staff']);
        $cancelRes->assertStatus(200)
            ->assertJsonPath('data.registered_by.name', $this->manager->name)
            ->assertJsonPath('data.cancelled_by.name', $this->staff->name);

        $listRes = $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/workshops/{$workshop->id}/registrations?status=cancelled");
        $listRes->assertStatus(200)
            ->assertJsonPath('data.0.registered_by.name', $this->manager->name)
            ->assertJsonPath('data.0.cancelled_by.name', $this->staff->name);
    }

    /**
     * 13. history: status=active/cancelled/all, q search, meta.counts correct, order newest first, cancelled rows present
     */
    public function test_history_filters_search_order_and_meta_counts(): void
    {
        $workshop = Workshop::factory()->open()->create();

        $reg1 = Registration::factory()->active()->create([
            'workshop_id' => $workshop->id,
            'attendee_name' => 'Alex Active',
            'attendee_email' => 'alex@example.com',
            'registered_at' => now()->subHours(3),
        ]);

        $reg2 = Registration::factory()->cancelled()->create([
            'workshop_id' => $workshop->id,
            'attendee_name' => 'Charlie Cancelled',
            'attendee_email' => 'charlie@example.com',
            'registered_at' => now()->subHours(2),
        ]);

        $reg3 = Registration::factory()->active()->create([
            'workshop_id' => $workshop->id,
            'attendee_name' => 'Dana Distinct',
            'attendee_email' => 'dana@example.com',
            'registered_at' => now()->subHours(1),
        ]);

        // status=all (default) -> all 3, ordered newest first (reg3, reg2, reg1)
        $resAll = $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/workshops/{$workshop->id}/registrations");
        $resAll->assertStatus(200)
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.id', $reg3->id)
            ->assertJsonPath('data.1.id', $reg2->id)
            ->assertJsonPath('data.2.id', $reg1->id)
            ->assertJsonPath('meta.counts.active', 2)
            ->assertJsonPath('meta.counts.cancelled', 1)
            ->assertJsonPath('meta.counts.total', 3);

        // status=active -> reg3, reg1; meta.counts still has active=2, cancelled=1, total=3
        $resActive = $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/workshops/{$workshop->id}/registrations?status=active");
        $resActive->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $reg3->id)
            ->assertJsonPath('data.1.id', $reg1->id)
            ->assertJsonPath('meta.counts.active', 2)
            ->assertJsonPath('meta.counts.cancelled', 1)
            ->assertJsonPath('meta.counts.total', 3);

        // status=cancelled -> reg2; meta.counts preserved
        $resCancelled = $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/workshops/{$workshop->id}/registrations?status=cancelled");
        $resCancelled->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $reg2->id)
            ->assertJsonPath('meta.counts.active', 2)
            ->assertJsonPath('meta.counts.cancelled', 1)
            ->assertJsonPath('meta.counts.total', 3);

        // invalid status -> 422
        $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/workshops/{$workshop->id}/registrations?status=unknown")
            ->assertStatus(422);

        // q search by email/name
        $resSearch = $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/workshops/{$workshop->id}/registrations?q=charlie");
        $resSearch->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $reg2->id);
    }

    /**
     * 14. DB safety net: insert two ACTIVE rows with the same workshop_id + email directly (bypass the service)
     * -> the second throws a QueryException; a cancelled duplicate does NOT throw
     */
    public function test_db_safety_net_unique_constraint(): void
    {
        $workshop = Workshop::factory()->open()->create();

        // Direct DB insert 1 (active)
        DB::table('registrations')->insert([
            'workshop_id' => $workshop->id,
            'attendee_name' => 'Direct Insert One',
            'attendee_email' => 'direct@example.com',
            'status' => 'active',
            'registered_by' => $this->manager->id,
            'registered_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Direct DB insert 2 with same email and active status MUST throw QueryException
        $this->expectException(QueryException::class);
        DB::table('registrations')->insert([
            'workshop_id' => $workshop->id,
            'attendee_name' => 'Direct Insert Two',
            'attendee_email' => 'direct@example.com',
            'status' => 'active',
            'registered_by' => $this->manager->id,
            'registered_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * 14b. DB safety net: a cancelled duplicate does NOT throw
     */
    public function test_db_safety_net_allows_cancelled_duplicates(): void
    {
        $workshop = Workshop::factory()->open()->create();

        // Direct DB insert active
        DB::table('registrations')->insert([
            'workshop_id' => $workshop->id,
            'attendee_name' => 'Direct Insert One',
            'attendee_email' => 'direct.cancelled@example.com',
            'status' => 'active',
            'registered_by' => $this->manager->id,
            'registered_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Direct DB insert cancelled with same email should NOT throw
        DB::table('registrations')->insert([
            'workshop_id' => $workshop->id,
            'attendee_name' => 'Direct Insert Cancelled',
            'attendee_email' => 'direct.cancelled@example.com',
            'status' => 'cancelled',
            'registered_by' => $this->manager->id,
            'registered_at' => now(),
            'cancelled_by' => $this->staff->id,
            'cancelled_at' => now(),
            'cancel_reason' => 'Direct cancel',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertEquals(2, Registration::where('workshop_id', $workshop->id)->count());
    }

    /**
     * 15. query count sanity: listing 20 registrations does not run 20+ queries
     */
    public function test_query_count_sanity_for_listing(): void
    {
        $workshop = Workshop::factory()->open()->create();
        Registration::factory()->count(20)->active()->create([
            'workshop_id' => $workshop->id,
            'registered_by' => $this->manager->id,
        ]);

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/workshops/{$workshop->id}/registrations?per_page=20");

        $response->assertStatus(200)
            ->assertJsonCount(20, 'data');

        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        // 1 query for user auth / token, 1 query for meta counts, 1 query for paginator count,
        // 1 query for records, 1 eager load for registeredBy, 1 eager load for cancelledBy.
        // Total queries should be around 5-7, well under 20.
        $this->assertLessThan(15, $queryCount);
    }
}

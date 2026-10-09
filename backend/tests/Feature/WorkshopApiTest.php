<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WorkshopApiTest extends TestCase
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
     * 1. admin, manager, and staff can list and show; no token -> 401
     */
    public function test_access_control_for_list_and_show(): void
    {
        $workshop = Workshop::factory()->create();

        // 1. Unauthenticated -> 401
        $this->getJson('/api/workshops')->assertStatus(401);
        $this->getJson("/api/workshops/{$workshop->id}")->assertStatus(401);

        // 2. Admin -> 200
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/workshops')->assertStatus(200);
        $this->actingAs($this->admin, 'sanctum')->getJson("/api/workshops/{$workshop->id}")->assertStatus(200);

        // 3. Manager -> 200
        $this->actingAs($this->manager, 'sanctum')->getJson('/api/workshops')->assertStatus(200);
        $this->actingAs($this->manager, 'sanctum')->getJson("/api/workshops/{$workshop->id}")->assertStatus(200);

        // 4. Staff -> 200
        $this->actingAs($this->staff, 'sanctum')->getJson('/api/workshops')->assertStatus(200);
        $this->actingAs($this->staff, 'sanctum')->getJson("/api/workshops/{$workshop->id}")->assertStatus(200);
    }

    /**
     * 2. admin and manager can create/update; staff gets 403
     */
    public function test_access_control_for_create_and_update(): void
    {
        $workshop = Workshop::factory()->create();

        $payload = [
            'code' => 'WS-NEW-01',
            'title' => 'Brand New Workshop',
            'instructor' => 'Jane Trainer',
            'starts_at' => now()->addDays(5)->toISOString(),
            'capacity' => 10,
        ];

        // Unauthenticated -> 401
        $this->postJson('/api/workshops', $payload)->assertStatus(401);
        $this->patchJson("/api/workshops/{$workshop->id}", ['title' => 'Updated'])->assertStatus(401);

        // Staff -> 403
        $this->actingAs($this->staff, 'sanctum')->postJson('/api/workshops', $payload)->assertStatus(403);
        $this->actingAs($this->staff, 'sanctum')->patchJson("/api/workshops/{$workshop->id}", ['title' => 'Updated'])->assertStatus(403);

        // Admin -> 201 & 200
        $adminPayload = [
            'code' => 'WS-ADMIN-01',
            'title' => 'Admin Workshop',
            'instructor' => 'Admin Trainer',
            'starts_at' => now()->addDays(6)->toISOString(),
            'capacity' => 15,
        ];
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/workshops', $adminPayload)->assertStatus(201);
        $this->actingAs($this->admin, 'sanctum')->patchJson("/api/workshops/{$workshop->id}", ['title' => 'Updated By Admin'])->assertStatus(200);

        // Manager -> 201 & 200
        $this->actingAs($this->manager, 'sanctum')->postJson('/api/workshops', $payload)->assertStatus(201);
        $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$workshop->id}", ['title' => 'Updated By Manager'])->assertStatus(200);
    }

    /**
     * 3. create: code is uppercased, duplicate code -> 422, capacity 0 -> 422, past starts_at -> 422,
     *    ends_at before starts_at -> 422, default status draft, created_by set
     */
    public function test_create_validations_and_defaults(): void
    {
        // Code is trimmed and uppercased
        $response = $this->actingAs($this->manager, 'sanctum')->postJson('/api/workshops', [
            'code' => '  lower-code-01  ',
            'title' => 'Test Uppercase Code',
            'instructor' => 'Lead Instructor',
            'starts_at' => now()->addDays(3)->toISOString(),
            'capacity' => 20,
        ]);

        $response->assertStatus(201);
        $this->assertSame('LOWER-CODE-01', $response->json('code'));
        $this->assertSame('draft', $response->json('status'));
        $this->assertSame($this->manager->id, $response->json('created_by.id'));
        $this->assertDatabaseHas('workshops', [
            'code' => 'LOWER-CODE-01',
            'created_by' => $this->manager->id,
            'status' => 'draft',
        ]);

        // Duplicate code -> 422
        $dupResponse = $this->actingAs($this->manager, 'sanctum')->postJson('/api/workshops', [
            'code' => 'lower-code-01',
            'title' => 'Another title',
            'instructor' => 'Another',
            'starts_at' => now()->addDays(4)->toISOString(),
            'capacity' => 10,
        ]);
        $dupResponse->assertStatus(422)->assertJsonValidationErrors(['code']);

        // Capacity 0 -> 422
        $capZero = $this->actingAs($this->manager, 'sanctum')->postJson('/api/workshops', [
            'code' => 'ZERO-CAP',
            'title' => 'Zero Capacity',
            'instructor' => 'Another',
            'starts_at' => now()->addDays(4)->toISOString(),
            'capacity' => 0,
        ]);
        $capZero->assertStatus(422)->assertJsonValidationErrors(['capacity']);

        // Capacity > 1000 -> 422
        $capOver = $this->actingAs($this->manager, 'sanctum')->postJson('/api/workshops', [
            'code' => 'OVER-CAP',
            'title' => 'Over Capacity',
            'instructor' => 'Another',
            'starts_at' => now()->addDays(4)->toISOString(),
            'capacity' => 1001,
        ]);
        $capOver->assertStatus(422)->assertJsonValidationErrors(['capacity']);

        // Past starts_at -> 422
        $pastDate = $this->actingAs($this->manager, 'sanctum')->postJson('/api/workshops', [
            'code' => 'PAST-01',
            'title' => 'Past Workshop',
            'instructor' => 'Another',
            'starts_at' => now()->subDay()->toISOString(),
            'capacity' => 15,
        ]);
        $pastDate->assertStatus(422)->assertJsonValidationErrors(['starts_at']);

        // ends_at before starts_at -> 422
        $badEndsAt = $this->actingAs($this->manager, 'sanctum')->postJson('/api/workshops', [
            'code' => 'BAD-ENDS',
            'title' => 'Bad Ends At',
            'instructor' => 'Another',
            'starts_at' => now()->addDays(3)->toISOString(),
            'ends_at' => now()->addDays(2)->toISOString(),
            'capacity' => 15,
        ]);
        $badEndsAt->assertStatus(422)->assertJsonValidationErrors(['ends_at']);

        // Create with explicit status open allowed
        $openRes = $this->actingAs($this->manager, 'sanctum')->postJson('/api/workshops', [
            'code' => 'OPEN-01',
            'title' => 'Open Workshop',
            'instructor' => 'Another',
            'starts_at' => now()->addDays(3)->toISOString(),
            'capacity' => 15,
            'status' => 'open',
        ]);
        $openRes->assertStatus(201);
        $this->assertSame('open', $openRes->json('status'));

        // Create with forbidden status cancelled or completed -> 422
        $cancelledRes = $this->actingAs($this->manager, 'sanctum')->postJson('/api/workshops', [
            'code' => 'CANCELLED-01',
            'title' => 'Cancelled Workshop',
            'instructor' => 'Another',
            'starts_at' => now()->addDays(3)->toISOString(),
            'capacity' => 15,
            'status' => 'cancelled',
        ]);
        $cancelledRes->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    /**
     * 4. update: code cannot change, status transitions (allowed and forbidden), updated_by set
     */
    public function test_update_rules_code_immutability_and_status_transitions(): void
    {
        $workshop = Workshop::factory()->draft()->create([
            'code' => 'ORIG-CODE',
            'capacity' => 10,
        ]);

        // Code change attempt -> 422
        $codeChange = $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$workshop->id}", [
            'code' => 'CHANGED-CODE',
        ]);
        $codeChange->assertStatus(422)->assertJsonValidationErrors(['code']);

        // Sending same code -> OK
        $sameCode = $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$workshop->id}", [
            'code' => 'ORIG-CODE',
            'title' => 'Updated Title',
        ]);
        $sameCode->assertStatus(200);
        $this->assertSame('Updated Title', $sameCode->json('title'));
        $this->assertSame($this->manager->id, $sameCode->json('updated_by.id'));

        // Updating starts_at to the past is allowed on update
        $pastUpdate = $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$workshop->id}", [
            'starts_at' => now()->subDays(2)->toISOString(),
        ]);
        $pastUpdate->assertStatus(200);

        // Status transitions:
        // 1. draft -> open (allowed)
        $wDraft = Workshop::factory()->draft()->create();
        $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$wDraft->id}", [
            'status' => 'open',
        ])->assertStatus(200)->assertJsonPath('status', 'open');

        // 2. draft -> cancelled (allowed)
        $wDraft2 = Workshop::factory()->draft()->create();
        $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$wDraft2->id}", [
            'status' => 'cancelled',
        ])->assertStatus(200)->assertJsonPath('status', 'cancelled');

        // 3. draft -> completed (forbidden -> 422)
        $wDraft3 = Workshop::factory()->draft()->create();
        $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$wDraft3->id}", [
            'status' => 'completed',
        ])->assertStatus(422)->assertJsonValidationErrors(['status']);

        // 4. open -> completed (allowed)
        $wOpen = Workshop::factory()->open()->create();
        $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$wOpen->id}", [
            'status' => 'completed',
        ])->assertStatus(200)->assertJsonPath('status', 'completed');

        // 5. open -> cancelled (allowed)
        $wOpen2 = Workshop::factory()->open()->create();
        $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$wOpen2->id}", [
            'status' => 'cancelled',
        ])->assertStatus(200)->assertJsonPath('status', 'cancelled');

        // 6. open -> draft (forbidden -> 422)
        $wOpen3 = Workshop::factory()->open()->create();
        $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$wOpen3->id}", [
            'status' => 'draft',
        ])->assertStatus(422)->assertJsonValidationErrors(['status']);

        // 7. cancelled is final (forbidden -> 422)
        $wCancelled = Workshop::factory()->cancelled()->create();
        $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$wCancelled->id}", [
            'status' => 'open',
        ])->assertStatus(422)->assertJsonValidationErrors(['status']);

        // 8. completed is final (forbidden -> 422)
        $wCompleted = Workshop::factory()->completed()->create();
        $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$wCompleted->id}", [
            'status' => 'open',
        ])->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    /**
     * 5. capacity cannot go below active registrations, but can equal it
     */
    public function test_capacity_cannot_go_below_active_registrations_but_can_equal(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 10]);

        // Create 4 active registrations and 2 cancelled registrations
        Registration::factory()->count(4)->active()->create(['workshop_id' => $workshop->id]);
        Registration::factory()->count(2)->cancelled()->create(['workshop_id' => $workshop->id]);

        // Attempt to lower capacity to 3 (below 4 active) -> 422
        $response = $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$workshop->id}", [
            'capacity' => 3,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['capacity']);
        $this->assertStringContainsString('Capacity cannot be lower than the 4 attendees already registered.', $response->json('message'));

        // Lower capacity to exactly 4 (equal to active) -> OK
        $responseEqual = $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$workshop->id}", [
            'capacity' => 4,
        ]);
        $responseEqual->assertStatus(200)
            ->assertJsonPath('capacity', 4)
            ->assertJsonPath('is_full', true)
            ->assertJsonPath('seats_left', 0);
    }

    /**
     * 7. response has seats_left, is_full, active_count and they are correct
     */
    public function test_response_structure_and_computed_seat_fields(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 5]);
        Registration::factory()->count(2)->active()->create(['workshop_id' => $workshop->id]);
        Registration::factory()->count(1)->cancelled()->create(['workshop_id' => $workshop->id]);

        $response = $this->actingAs($this->manager, 'sanctum')->getJson("/api/workshops/{$workshop->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'id',
                'code',
                'title',
                'instructor',
                'starts_at',
                'ends_at',
                'location',
                'description',
                'capacity',
                'status',
                'active_count',
                'seats_left',
                'is_full',
                'created_by' => ['id', 'name'],
                'created_at',
                'updated_at',
            ]);

        $data = $response->json();
        $this->assertSame(2, $data['active_count']);
        $this->assertSame(3, $data['seats_left']); // 5 - 2 = 3
        $this->assertFalse($data['is_full']);
    }

    /**
     * 8. query count sanity: listing 20 workshops does not run 20+ count queries
     */
    public function test_listing_workshops_does_not_cause_n_plus_one_queries(): void
    {
        Workshop::factory()->count(20)->create();

        DB::enableQueryLog();

        $response = $this->actingAs($this->manager, 'sanctum')->getJson('/api/workshops?per_page=20');
        $response->assertStatus(200);

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        // Typically 1 count query for pagination + 1 select query for workshops with active_count subquery = 2 queries
        $this->assertLessThanOrEqual(5, count($queries), 'Query count should not scale with number of workshops.');
    }
}

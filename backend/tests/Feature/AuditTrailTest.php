<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AuditAction;
use App\Enums\Role;
use App\Enums\WorkshopStatus;
use App\Models\AuditLog;
use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use LogicException;
use Tests\TestCase;

class AuditTrailTest extends TestCase
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
     * 1. Creating a user writes user.created with the admin as actor; no password anywhere in the row.
     */
    public function test_creating_user_writes_user_created_with_admin_actor_and_no_password(): void
    {
        $payload = [
            'name' => 'John Auditor',
            'email' => 'auditor@example.com',
            'password' => 'SecretPass123!',
            'role' => Role::Staff->value,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/users', $payload);
        $response->assertStatus(201);

        $createdUserId = $response->json('id');

        $log = AuditLog::where('action', AuditAction::UserCreated->value)->first();
        $this->assertNotNull($log);
        $this->assertSame($this->admin->id, $log->user_id);
        $this->assertSame('user', $log->entity_type);
        $this->assertSame($createdUserId, $log->entity_id);
        $this->assertNull($log->old_values);

        $newValues = $log->new_values;
        $this->assertIsArray($newValues);
        $this->assertSame('John Auditor', $newValues['name']);
        $this->assertSame('auditor@example.com', $newValues['email']);
        $this->assertArrayNotHasKey('password', $newValues);
        $this->assertArrayNotHasKey('remember_token', $newValues);

        $rawJson = json_encode($newValues);
        $this->assertStringNotContainsString('SecretPass123!', (string) $rawJson);
        $this->assertStringNotContainsString('$2y$', (string) $rawJson);
    }

    /**
     * 2. Role change writes a row with old and new role; tokens still revoked as before.
     */
    public function test_role_change_writes_row_with_old_and_new_role_and_revokes_tokens(): void
    {
        $target = User::factory()->manager()->create();
        $target->createToken('test-token');
        $this->assertCount(1, $target->tokens);

        $response = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/users/{$target->id}", [
            'role' => Role::Staff->value,
        ]);
        $response->assertStatus(200);

        // Target tokens must be revoked
        $this->assertCount(0, $target->fresh()->tokens);

        $log = AuditLog::where('action', AuditAction::UserRoleChanged->value)->first();
        $this->assertNotNull($log);
        $this->assertSame($this->admin->id, $log->user_id);
        $this->assertSame($target->id, $log->entity_id);
        $this->assertSame(['role' => Role::Manager->value], $log->old_values);
        $this->assertSame(['role' => Role::Staff->value], $log->new_values);
    }

    /**
     * 3. Deactivate / activate write the right actions.
     */
    public function test_deactivate_and_activate_write_correct_actions(): void
    {
        $target = User::factory()->staff()->create(['is_active' => true]);

        // Deactivate
        $resDeact = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/users/{$target->id}", [
            'is_active' => false,
        ]);
        $resDeact->assertStatus(200);

        $deactLog = AuditLog::where('action', AuditAction::UserDeactivated->value)->first();
        $this->assertNotNull($deactLog);
        $this->assertSame(['is_active' => true], $deactLog->old_values);
        $this->assertSame(['is_active' => false], $deactLog->new_values);

        // Activate
        $resAct = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/users/{$target->id}", [
            'is_active' => true,
        ]);
        $resAct->assertStatus(200);

        $actLog = AuditLog::where('action', AuditAction::UserActivated->value)->first();
        $this->assertNotNull($actLog);
        $this->assertSame(['is_active' => false], $actLog->old_values);
        $this->assertSame(['is_active' => true], $actLog->new_values);
    }

    /**
     * 4. Password reset writes {"password":"changed"} only.
     */
    public function test_password_reset_writes_password_changed_only(): void
    {
        $target = User::factory()->staff()->create();

        $response = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/users/{$target->id}", [
            'password' => 'BrandNewPassword999!',
        ]);
        $response->assertStatus(200);

        $log = AuditLog::where('action', AuditAction::UserPasswordReset->value)->first();
        $this->assertNotNull($log);
        $this->assertNull($log->old_values);
        $this->assertSame(['password' => 'changed'], $log->new_values);

        $encoded = json_encode($log->toArray());
        $this->assertStringNotContainsString('BrandNewPassword999!', (string) $encoded);
        $this->assertStringNotContainsString('$2y$', (string) $encoded);
    }

    /**
     * 5. No-op update (same values) writes NO audit row.
     */
    public function test_noop_update_writes_no_audit_row(): void
    {
        $target = User::factory()->staff()->create([
            'name' => 'Same Name',
            'email' => 'same@example.com',
        ]);

        $countBefore = AuditLog::count();

        $response = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/users/{$target->id}", [
            'name' => 'Same Name',
            'email' => 'same@example.com',
        ]);
        $response->assertStatus(200);

        $this->assertSame($countBefore, AuditLog::count());
    }

    /**
     * 6. Workshop create/update writes rows with only the changed fields; capacity change and status change are recorded.
     */
    public function test_workshop_create_and_update_writes_rows_with_only_changed_fields(): void
    {
        // Create workshop
        $createPayload = [
            'code' => 'WS-AUD-01',
            'title' => 'Audit Workshop',
            'description' => 'Description here',
            'instructor' => 'Jane Instructor',
            'starts_at' => Carbon::now()->addDays(5)->toIso8601String(),
            'duration_minutes' => 90,
            'capacity' => 15,
        ];

        $resCreate = $this->actingAs($this->admin, 'sanctum')->postJson('/api/workshops', $createPayload);
        $resCreate->assertStatus(201);
        $workshopId = $resCreate->json('id');

        $createLog = AuditLog::where('action', AuditAction::WorkshopCreated->value)->first();
        $this->assertNotNull($createLog);
        $this->assertSame('workshop', $createLog->entity_type);
        $this->assertSame($workshopId, $createLog->entity_id);
        $this->assertNull($createLog->old_values);
        $this->assertSame(15, $createLog->new_values['capacity']);

        // Update status and capacity simultaneously
        $resUpdate = $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$workshopId}", [
            'status' => WorkshopStatus::Open->value,
            'capacity' => 25,
        ]);
        $resUpdate->assertStatus(200);

        $statusLog = AuditLog::where('action', AuditAction::WorkshopStatusChanged->value)->first();
        $this->assertNotNull($statusLog);
        $this->assertSame(['status' => 'draft'], $statusLog->old_values);
        $this->assertSame(['status' => 'open'], $statusLog->new_values);

        $capLog = AuditLog::where('action', AuditAction::WorkshopCapacityChanged->value)->first();
        $this->assertNotNull($capLog);
        $this->assertSame(['capacity' => 15], $capLog->old_values);
        $this->assertSame(['capacity' => 25], $capLog->new_values);

        // Update only title
        $resTitle = $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$workshopId}", [
            'title' => 'Updated Workshop Title',
        ]);
        $resTitle->assertStatus(200);

        $titleLog = AuditLog::where('action', AuditAction::WorkshopUpdated->value)->first();
        $this->assertNotNull($titleLog);
        $this->assertSame(['title' => 'Audit Workshop'], $titleLog->old_values);
        $this->assertSame(['title' => 'Updated Workshop Title'], $titleLog->new_values);
    }

    /**
     * 7. A FAILED update (capacity below registered -> 422) writes NO audit row (rollback safety).
     */
    public function test_failed_workshop_update_capacity_below_registered_writes_no_audit_row(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 5]);
        Registration::factory()->active()->count(3)->create(['workshop_id' => $workshop->id]);

        $countBefore = AuditLog::count();

        // Attempt to lower capacity below active count (3)
        $response = $this->actingAs($this->manager, 'sanctum')->patchJson("/api/workshops/{$workshop->id}", [
            'capacity' => 2,
        ]);
        $response->assertStatus(422);

        $this->assertSame($countBefore, AuditLog::count());
    }

    /**
     * 8. Registering/cancelling attendees does NOT write audit rows.
     */
    public function test_registering_and_cancelling_attendees_does_not_write_audit_rows(): void
    {
        $workshop = Workshop::factory()->open()->create(['capacity' => 10]);

        $countBefore = AuditLog::count();

        // Register
        $resReg = $this->actingAs($this->staff, 'sanctum')->postJson("/api/workshops/{$workshop->id}/registrations", [
            'attendee_name' => 'Alice Attendee',
            'attendee_email' => 'alice@example.com',
        ]);
        $resReg->assertStatus(201);
        $registrationId = $resReg->json('data.id');

        $this->assertSame($countBefore, AuditLog::count(), 'Registering must not write audit rows');

        // Cancel
        $resCancel = $this->actingAs($this->staff, 'sanctum')->postJson("/api/registrations/{$registrationId}/cancel", [
            'reason' => 'Schedule conflict',
        ]);
        $resCancel->assertStatus(200);

        $this->assertSame($countBefore, AuditLog::count(), 'Cancelling registration must not write audit rows');
    }

    /**
     * 9. Admin can list and filter (entity_type, entity_id, action, user_id, from/to); manager, staff -> 403; no token -> 401.
     */
    public function test_admin_can_list_and_filter_audit_logs_and_other_roles_forbidden(): void
    {
        $user = User::factory()->staff()->create();
        $workshop = Workshop::factory()->create();

        // Seed logs with specific timestamps
        $log1 = AuditLog::factory()->create([
            'user_id' => $this->admin->id,
            'action' => AuditAction::UserCreated,
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'created_at' => Carbon::parse('2026-10-01 10:00:00', 'UTC'),
        ]);

        $log2 = AuditLog::factory()->create([
            'user_id' => $this->manager->id,
            'action' => AuditAction::WorkshopStatusChanged,
            'entity_type' => 'workshop',
            'entity_id' => $workshop->id,
            'created_at' => Carbon::parse('2026-10-05 15:00:00', 'UTC'),
        ]);

        // Unauthenticated -> 401
        $this->getJson('/api/audit-logs')->assertStatus(401);

        // Manager -> 403
        $this->actingAs($this->manager, 'sanctum')->getJson('/api/audit-logs')->assertStatus(403);

        // Staff -> 403
        $this->actingAs($this->staff, 'sanctum')->getJson('/api/audit-logs')->assertStatus(403);

        // Admin -> 200
        $resAll = $this->actingAs($this->admin, 'sanctum')->getJson('/api/audit-logs');
        $resAll->assertStatus(200);
        $this->assertGreaterThanOrEqual(2, count($resAll->json('data')));

        // Filter entity_type=workshop
        $resWorkshop = $this->actingAs($this->admin, 'sanctum')->getJson('/api/audit-logs?entity_type=workshop');
        $resWorkshop->assertStatus(200);
        $types = collect($resWorkshop->json('data'))->pluck('entity_type')->unique()->all();
        $this->assertSame(['workshop'], $types);

        // Filter entity_id
        $resEntityId = $this->actingAs($this->admin, 'sanctum')->getJson("/api/audit-logs?entity_id={$workshop->id}");
        $resEntityId->assertStatus(200);
        $ids = collect($resEntityId->json('data'))->pluck('entity_id')->unique()->all();
        $this->assertSame([$workshop->id], $ids);

        // Filter action
        $resAction = $this->actingAs($this->admin, 'sanctum')->getJson('/api/audit-logs?action='.AuditAction::WorkshopStatusChanged->value);
        $resAction->assertStatus(200);
        $actions = collect($resAction->json('data'))->pluck('action')->unique()->all();
        $this->assertSame([AuditAction::WorkshopStatusChanged->value], $actions);

        // Filter user_id (actor)
        $resActor = $this->actingAs($this->admin, 'sanctum')->getJson("/api/audit-logs?user_id={$this->manager->id}");
        $resActor->assertStatus(200);
        $userIds = collect($resActor->json('data'))->pluck('user.id')->unique()->all();
        $this->assertSame([$this->manager->id], $userIds);

        // Filter from & to dates
        $resDates = $this->actingAs($this->admin, 'sanctum')->getJson('/api/audit-logs?from=2026-10-04&to=2026-10-06');
        $resDates->assertStatus(200);
        $dateIds = collect($resDates->json('data'))->pluck('id')->all();
        $this->assertContains($log2->id, $dateIds);
        $this->assertNotContains($log1->id, $dateIds);
    }

    /**
     * 10. Response never contains password-like keys (scan the JSON recursively).
     */
    public function test_response_never_contains_password_like_keys_recursively(): void
    {
        // 1. Create a user
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/users', [
            'name' => 'Secret Subject',
            'email' => 'secretsubject@example.com',
            'password' => 'SuperSecret12345!',
            'role' => Role::Staff->value,
        ]);

        $created = User::where('email', 'secretsubject@example.com')->firstOrFail();

        // 2. Reset their password
        $this->actingAs($this->admin, 'sanctum')->patchJson("/api/users/{$created->id}", [
            'password' => 'AnotherSecret54321!',
        ]);

        // 3. Query audit logs
        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/audit-logs');
        $response->assertStatus(200);

        $data = $response->json();

        $this->assertNoSecretsRecursively($data);
    }

    private function assertNoSecretsRecursively(mixed $data): void
    {
        if (is_array($data)) {
            foreach ($data as $key => $val) {
                // Key check: remember_token, tokens must not exist
                $this->assertNotContains($key, ['remember_token', 'tokens', 'token']);

                // If key is password, the only allowed value is "changed"
                if ($key === 'password') {
                    $this->assertSame('changed', $val);
                }

                $this->assertNoSecretsRecursively($val);
            }
        } elseif (is_string($data)) {
            $this->assertStringNotContainsString('SuperSecret12345!', $data);
            $this->assertStringNotContainsString('AnotherSecret54321!', $data);
            $this->assertStringNotContainsString('$2y$', $data);
        }
    }

    /**
     * 11. AuditLog cannot be updated or deleted (exception).
     */
    public function test_audit_log_cannot_be_updated_or_deleted(): void
    {
        $log = AuditLog::factory()->create();

        // 1. Updating throws LogicException
        $updateThrew = false;
        try {
            $log->update(['action' => AuditAction::UserUpdated]);
        } catch (LogicException $e) {
            $updateThrew = true;
        }
        $this->assertTrue($updateThrew, 'Expected LogicException on update()');

        // 2. save() on existing row throws LogicException
        $saveThrew = false;
        try {
            $log->action = AuditAction::UserUpdated;
            $log->save();
        } catch (LogicException $e) {
            $saveThrew = true;
        }
        $this->assertTrue($saveThrew, 'Expected LogicException on save() of existing row');

        // 3. delete() throws LogicException
        $deleteThrew = false;
        try {
            $log->delete();
        } catch (LogicException $e) {
            $deleteThrew = true;
        }
        $this->assertTrue($deleteThrew, 'Expected LogicException on delete()');
    }

    /**
     * 12. No non-GET route exists for audit-logs.
     */
    public function test_no_non_get_route_exists_for_audit_logs(): void
    {
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/audit-logs', [])->assertStatus(405);
        $this->actingAs($this->admin, 'sanctum')->putJson('/api/audit-logs', [])->assertStatus(405);
        $this->actingAs($this->admin, 'sanctum')->patchJson('/api/audit-logs', [])->assertStatus(405);
        $this->actingAs($this->admin, 'sanctum')->deleteJson('/api/audit-logs', [])->assertStatus(405);
    }

    /**
     * 13. Query count sanity for listing 20 logs.
     */
    public function test_query_count_sanity_for_listing_20_logs(): void
    {
        // Seed 20 logs with separate actors
        for ($i = 0; $i < 20; $i++) {
            $user = User::factory()->create();
            AuditLog::factory()->create([
                'user_id' => $user->id,
                'created_at' => now()->subMinutes($i),
            ]);
        }

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/audit-logs?per_page=20');
        $response->assertStatus(200);

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        // Should be at most 5 queries:
        // 1. Sanctum token lookup
        // 2. Sanctum user lookup
        // 3. Count query for paginator
        // 4. Select audit logs query
        // 5. Eager load users query
        $this->assertLessThanOrEqual(5, count($queries), 'Expected no N+1 query problem when listing audit logs.');
        $this->assertCount(20, $response->json('data'));
    }
}

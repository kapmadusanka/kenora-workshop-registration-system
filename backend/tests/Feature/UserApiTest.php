<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class UserApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * 1. admin can list/create/show/update users; response never has password
     */
    public function test_admin_can_list_create_show_update_users_and_password_is_never_returned(): void
    {
        $admin = User::factory()->admin()->create();

        // Create
        $createResponse = $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
            'name' => 'John Doe',
            'email' => 'john.doe@example.com',
            'password' => 'secretPassword123',
            'role' => 'manager',
            'is_active' => true,
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonStructure([
                'id',
                'name',
                'email',
                'role',
                'is_active',
                'created_at',
                'created_by' => ['id', 'name'],
            ]);

        $createData = $createResponse->json();
        $this->assertArrayNotHasKey('password', $createData);
        $this->assertArrayNotHasKey('remember_token', $createData);
        $this->assertSame('John Doe', $createData['name']);
        $this->assertSame('john.doe@example.com', $createData['email']);
        $this->assertSame('manager', $createData['role']);
        $this->assertSame($admin->id, $createData['created_by']['id']);

        $createdUserId = $createData['id'];

        // List
        $listResponse = $this->actingAs($admin, 'sanctum')->getJson('/api/users');
        $listResponse->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'email',
                        'role',
                        'is_active',
                        'created_at',
                    ],
                ],
                'links',
                'meta',
            ]);

        foreach ($listResponse->json('data') as $item) {
            $this->assertArrayNotHasKey('password', $item);
            $this->assertArrayNotHasKey('remember_token', $item);
        }

        // Show
        $showResponse = $this->actingAs($admin, 'sanctum')->getJson("/api/users/{$createdUserId}");
        $showResponse->assertStatus(200)
            ->assertJsonStructure([
                'id',
                'name',
                'email',
                'role',
                'is_active',
                'created_at',
                'created_by' => ['id', 'name'],
            ]);
        $this->assertArrayNotHasKey('password', $showResponse->json());
        $this->assertSame($createdUserId, $showResponse->json('id'));

        // Update
        $updateResponse = $this->actingAs($admin, 'sanctum')->patchJson("/api/users/{$createdUserId}", [
            'name' => 'John Updated',
            'role' => 'staff',
        ]);
        $updateResponse->assertStatus(200)
            ->assertJson([
                'id' => $createdUserId,
                'name' => 'John Updated',
                'role' => 'staff',
            ]);
        $this->assertArrayNotHasKey('password', $updateResponse->json());
    }

    /**
     * 2. manager and staff get 403 on EVERY users endpoint; no token -> 401
     */
    public function test_manager_and_staff_get_403_on_every_endpoint_and_unauthenticated_gets_401(): void
    {
        $targetUser = User::factory()->staff()->create();

        // 1. Unauthenticated -> 401
        $this->getJson('/api/users')->assertStatus(401);
        $this->postJson('/api/users', ['name' => 'A'])->assertStatus(401);
        $this->getJson("/api/users/{$targetUser->id}")->assertStatus(401);
        $this->patchJson("/api/users/{$targetUser->id}", ['name' => 'B'])->assertStatus(401);

        // 2. Manager -> 403 on all
        $manager = User::factory()->manager()->create();
        $this->actingAs($manager, 'sanctum')->getJson('/api/users')->assertStatus(403);
        $this->actingAs($manager, 'sanctum')->postJson('/api/users', [
            'name' => 'Fail',
            'email' => 'fail@example.com',
            'password' => 'password123',
            'role' => 'staff',
        ])->assertStatus(403);
        $this->actingAs($manager, 'sanctum')->getJson("/api/users/{$targetUser->id}")->assertStatus(403);
        $this->actingAs($manager, 'sanctum')->patchJson("/api/users/{$targetUser->id}", ['name' => 'Fail'])->assertStatus(403);

        // 3. Staff -> 403 on all
        $staff = User::factory()->staff()->create();
        $this->actingAs($staff, 'sanctum')->getJson('/api/users')->assertStatus(403);
        $this->actingAs($staff, 'sanctum')->postJson('/api/users', [
            'name' => 'Fail',
            'email' => 'fail2@example.com',
            'password' => 'password123',
            'role' => 'staff',
        ])->assertStatus(403);
        $this->actingAs($staff, 'sanctum')->getJson("/api/users/{$targetUser->id}")->assertStatus(403);
        $this->actingAs($staff, 'sanctum')->patchJson("/api/users/{$targetUser->id}", ['name' => 'Fail'])->assertStatus(403);
    }

    /**
     * 3. validation: duplicate email -> 422, weak password -> 422, bad role -> 422
     */
    public function test_validation_duplicate_email_weak_password_bad_role_return_422(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['email' => 'existing@example.com']);

        // Duplicate email
        $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
            'name' => 'Test User',
            'email' => 'existing@example.com',
            'password' => 'password123',
            'role' => 'staff',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);

        // Weak password (<8 chars)
        $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
            'name' => 'Test User',
            'email' => 'unique@example.com',
            'password' => 'short',
            'role' => 'staff',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);

        // Bad role
        $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
            'name' => 'Test User',
            'email' => 'unique@example.com',
            'password' => 'password123',
            'role' => 'superadmin',
        ])->assertStatus(422)->assertJsonValidationErrors(['role']);
    }

    /**
     * 4. email is stored lowercased and trimmed
     */
    public function test_email_is_stored_lowercased_and_trimmed(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
            'name' => 'Case Test',
            'email' => '  User.Name@Example.COM  ',
            'password' => 'password123',
            'role' => 'staff',
        ]);

        $response->assertStatus(201);
        $this->assertSame('user.name@example.com', $response->json('email'));
        $this->assertDatabaseHas('users', [
            'email' => 'user.name@example.com',
        ]);
    }

    /**
     * 5. filters work: role, is_active, q
     */
    public function test_filters_work_for_role_is_active_and_q(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Admin Boss', 'email' => 'admin@test.com']);
        $manager = User::factory()->manager()->create(['name' => 'Alice Manager', 'email' => 'alice@workshops.com', 'is_active' => true]);
        $inactiveStaff = User::factory()->staff()->inactive()->create(['name' => 'Bob Staff', 'email' => 'bob@workshops.com']);
        $activeStaff = User::factory()->staff()->create(['name' => 'Charlie Staff', 'email' => 'charlie@external.com', 'is_active' => true]);

        // Filter by role=manager
        $responseRole = $this->actingAs($admin, 'sanctum')->getJson('/api/users?role=manager');
        $responseRole->assertStatus(200);
        $roleIds = collect($responseRole->json('data'))->pluck('id')->all();
        $this->assertContains($manager->id, $roleIds);
        $this->assertNotContains($inactiveStaff->id, $roleIds);
        $this->assertNotContains($activeStaff->id, $roleIds);

        // Filter by is_active=false
        $responseActive = $this->actingAs($admin, 'sanctum')->getJson('/api/users?is_active=false');
        $responseActive->assertStatus(200);
        $activeIds = collect($responseActive->json('data'))->pluck('id')->all();
        $this->assertContains($inactiveStaff->id, $activeIds);
        $this->assertNotContains($manager->id, $activeIds);
        $this->assertNotContains($activeStaff->id, $activeIds);

        // Filter by q (search in name or email)
        $responseQ = $this->actingAs($admin, 'sanctum')->getJson('/api/users?q=workshops.com');
        $responseQ->assertStatus(200);
        $qIds = collect($responseQ->json('data'))->pluck('id')->all();
        $this->assertContains($manager->id, $qIds);
        $this->assertContains($inactiveStaff->id, $qIds);
        $this->assertNotContains($activeStaff->id, $qIds);
    }

    /**
     * 6. admin cannot demote or deactivate themselves
     */
    public function test_admin_cannot_demote_or_deactivate_themselves(): void
    {
        $admin = User::factory()->admin()->create();

        // Cannot change own role
        $roleResponse = $this->actingAs($admin, 'sanctum')->patchJson("/api/users/{$admin->id}", [
            'role' => 'manager',
        ]);
        $roleResponse->assertStatus(422)
            ->assertJsonValidationErrors(['role']);

        // Cannot deactivate self
        $activeResponse = $this->actingAs($admin, 'sanctum')->patchJson("/api/users/{$admin->id}", [
            'is_active' => false,
        ]);
        $activeResponse->assertStatus(422)
            ->assertJsonValidationErrors(['is_active']);
    }

    /**
     * 7. the last active admin cannot be deactivated or demoted (use a second admin to prove the rule allows it when another active admin exists)
     */
    public function test_last_active_admin_cannot_be_deactivated_or_demoted(): void
    {
        $admin1 = User::factory()->admin()->create();
        $admin2 = User::factory()->admin()->create();

        // Demoting admin2 succeeds because admin1 is still an active admin
        $demoteResponse = $this->actingAs($admin1, 'sanctum')->patchJson("/api/users/{$admin2->id}", [
            'role' => 'manager',
        ]);
        $demoteResponse->assertStatus(200);
        $this->assertEquals(Role::Manager, $admin2->fresh()->role);

        // Create admin3 and deactivate them (still admin1 is active)
        $admin3 = User::factory()->admin()->create();
        $deactivateResponse = $this->actingAs($admin1, 'sanctum')->patchJson("/api/users/{$admin3->id}", [
            'is_active' => false,
        ]);
        $deactivateResponse->assertStatus(200);
        $this->assertFalse($admin3->fresh()->is_active);

        // Now admin1 is the ONLY active admin. Test that demoting or deactivating the last active admin is blocked
        $userService = app(UserService::class);
        $dummyActor = User::factory()->admin()->make(['id' => 9999]);

        try {
            $userService->update($admin1, ['role' => 'staff'], $dummyActor);
            $this->fail('Expected ValidationException when demoting the last active administrator');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('user', $e->errors());
        }

        try {
            $userService->update($admin1, ['is_active' => false], $dummyActor);
            $this->fail('Expected ValidationException when deactivating the last active administrator');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('user', $e->errors());
        }
    }

    /**
     * 8. deactivating a user revokes their tokens (old token -> 401/403 afterwards)
     */
    public function test_deactivating_a_user_revokes_their_tokens(): void
    {
        $admin = User::factory()->admin()->create();
        $staff = User::factory()->staff()->create(['is_active' => true]);

        $token = $staff->createToken('staff-token')->plainTextToken;
        $this->assertEquals(1, $staff->tokens()->count());

        // Deactivate staff
        $response = $this->actingAs($admin, 'sanctum')->patchJson("/api/users/{$staff->id}", [
            'is_active' => false,
        ]);
        $response->assertStatus(200);

        // Tokens revoked in database
        $this->assertEquals(0, $staff->tokens()->count());

        // Request with old token should now fail
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    /**
     * 9. role change revokes tokens too
     */
    public function test_role_change_revokes_tokens(): void
    {
        $admin = User::factory()->admin()->create();
        $staff = User::factory()->staff()->create(['is_active' => true]);

        $token = $staff->createToken('staff-token')->plainTextToken;
        $this->assertEquals(1, $staff->tokens()->count());

        // Change role to manager
        $response = $this->actingAs($admin, 'sanctum')->patchJson("/api/users/{$staff->id}", [
            'role' => 'manager',
        ]);
        $response->assertStatus(200);

        // Tokens revoked
        $this->assertEquals(0, $staff->tokens()->count());

        // Old token cannot be used
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    /**
     * 10. pagination: per_page respected and capped at 100
     */
    public function test_pagination_per_page_respected_and_capped_at_100(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->count(25)->create();

        // Default / requested per_page=10
        $response10 = $this->actingAs($admin, 'sanctum')->getJson('/api/users?per_page=10');
        $response10->assertStatus(200);
        $this->assertCount(10, $response10->json('data'));
        $this->assertSame(10, $response10->json('meta.per_page'));

        // Capped at 100 when per_page=150 requested
        $response150 = $this->actingAs($admin, 'sanctum')->getJson('/api/users?per_page=150');
        $response150->assertStatus(200);
        $this->assertSame(100, $response150->json('meta.per_page'));
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class EnsureRoleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['auth:sanctum', 'role:manager,staff'])->get('/api/test/manager-or-staff', function () {
            return response()->json(['message' => 'success']);
        });

        Route::middleware(['role:admin'])->get('/api/test/role-only-admin', function () {
            return response()->json(['message' => 'admin success']);
        });

        Route::middleware(['auth:sanctum', 'role:admin'])->get('/api/test/admin-only', function () {
            return response()->json(['message' => 'admin success']);
        });
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        // 1. Through auth:sanctum
        $response = $this->getJson('/api/test/manager-or-staff');

        $response->assertStatus(401)
            ->assertExactJson([
                'message' => 'Unauthenticated',
                'errors' => [],
            ]);

        // 2. Direct to role middleware without auth:sanctum
        $responseRoleOnly = $this->getJson('/api/test/role-only-admin');

        $responseRoleOnly->assertStatus(401)
            ->assertExactJson([
                'message' => 'Unauthenticated',
                'errors' => [],
            ]);
    }

    public function test_role_manager_or_staff_allows_manager_and_staff(): void
    {
        $manager = User::factory()->manager()->create();
        $staff = User::factory()->staff()->create();

        $this->actingAs($manager, 'sanctum')
            ->getJson('/api/test/manager-or-staff')
            ->assertStatus(200)
            ->assertExactJson(['message' => 'success']);

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/test/manager-or-staff')
            ->assertStatus(200)
            ->assertExactJson(['message' => 'success']);
    }

    public function test_role_manager_or_staff_blocks_admin_with_403(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/test/manager-or-staff');

        $response->assertStatus(403)
            ->assertExactJson([
                'message' => 'You do not have permission to do this.',
                'errors' => [],
            ]);
    }

    public function test_role_admin_blocks_manager_and_staff(): void
    {
        $manager = User::factory()->manager()->create();
        $staff = User::factory()->staff()->create();

        $this->actingAs($manager, 'sanctum')
            ->getJson('/api/test/admin-only')
            ->assertStatus(403)
            ->assertExactJson([
                'message' => 'You do not have permission to do this.',
                'errors' => [],
            ]);

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/test/admin-only')
            ->assertStatus(403)
            ->assertExactJson([
                'message' => 'You do not have permission to do this.',
                'errors' => [],
            ]);
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Full role × endpoint access-control matrix.
 *
 * B1 – data-provider matrix test
 * B2 – route coverage guard (every api/* route must carry auth+active+role middleware)
 * B3 – mass-assignment / tampering checks
 */
class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    // -----------------------------------------------------------------------
    // Shared fixtures
    // -----------------------------------------------------------------------

    private User $admin;
    private User $manager;
    private User $staff;
    private User $inactiveManager;
    private Workshop $workshop;
    private Registration $registration;
    private User $targetUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Actors
        $this->admin           = User::factory()->admin()->create();
        $this->manager         = User::factory()->manager()->create();
        $this->staff           = User::factory()->staff()->create();
        $this->inactiveManager = User::factory()->manager()->inactive()->create();

        // A user that can be targeted by user-management endpoints
        $this->targetUser = User::factory()->staff()->create();

        // Fixtures for workshop / registration endpoints
        $this->workshop = Workshop::factory()->open()->create([
            'capacity'   => 20,
            'created_by' => $this->manager->id,
        ]);

        $this->registration = Registration::factory()->active()->create([
            'workshop_id'   => $this->workshop->id,
            'registered_by' => $this->staff->id,
        ]);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /** @return array<string, mixed> */
    private function validWorkshopPayload(): array
    {
        return [
            'code'        => 'WS-ACTEST-01',
            'title'       => 'AC Test Workshop',
            'instructor'  => 'Instructor',
            'starts_at'   => now()->addDays(10)->toIso8601String(),
            'ends_at'     => now()->addDays(10)->addHours(2)->toIso8601String(),
            'location'    => 'Room 1',
            'capacity'    => 10,
            'status'      => 'draft',
        ];
    }

    /** @return array<string, mixed> */
    private function validRegistrationPayload(): array
    {
        return [
            'attendee_name'  => 'Test Attendee',
            'attendee_email' => 'attendee-actest-' . uniqid() . '@example.com',
        ];
    }

    /** @return array<string, mixed> */
    private function validUserPayload(): array
    {
        return [
            'name'     => 'New Staff Member',
            'email'    => 'newstaff-' . uniqid() . '@example.com',
            'password' => 'Password123!',
            'role'     => 'staff',
        ];
    }

    /** Authenticate a user via Sanctum token. null = guest (no token). */
    private function asActor(?User $user): void
    {
        if ($user !== null) {
            Sanctum::actingAs($user);
        }
    }

    /**
     * Assert the 403 response has the required JSON body shape:
     *   { "message": "...", "errors": {} }
     */
    private function assert403Shape(\Illuminate\Testing\TestResponse $response): void
    {
        $response->assertStatus(403);
        $response->assertJsonStructure(['message', 'errors']);
    }

    /**
     * Assert the response is not 401 or 403 (i.e. the actor was allowed in).
     */
    private function assertAllowed(\Illuminate\Testing\TestResponse $response): void
    {
        $status = $response->getStatusCode();
        $this->assertNotContains(
            $status,
            [401, 403],
            "Expected allowed (not 401/403) but got {$status}. Body: " . $response->getContent()
        );
    }

    // -----------------------------------------------------------------------
    // B1 — Matrix tests
    // -----------------------------------------------------------------------

    /**
     * GET /api/auth/me — allowed for all authenticated; 401 for guest.
     */
    #[DataProvider('authenticatedRolesProvider')]
    public function test_auth_me_allowed_for_all_authenticated_roles(string $actorProp): void
    {
        $actor = $this->{$actorProp};
        $this->asActor($actor);
        $response = $this->getJson('/api/auth/me');
        $this->assertAllowed($response);
    }

    public static function authenticatedRolesProvider(): array
    {
        return [
            'admin'           => ['admin'],
            'manager'         => ['manager'],
            'staff'           => ['staff'],
        ];
    }

    public function test_auth_me_returns_401_for_guest(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_auth_me_returns_403_for_inactive_manager(): void
    {
        $this->asActor($this->inactiveManager);
        $this->assert403Shape($this->getJson('/api/auth/me'));
    }

    /**
     * POST /api/auth/logout — allowed for all authenticated; 401 for guest.
     */
    #[DataProvider('authenticatedRolesProvider')]
    public function test_auth_logout_allowed_for_all_authenticated_roles(string $actorProp): void
    {
        $actor = $this->{$actorProp};
        // Re-authenticate because Sanctum::actingAs is per-request
        $this->asActor($actor);
        $response = $this->postJson('/api/auth/logout');
        $this->assertAllowed($response);
    }

    public function test_auth_logout_returns_401_for_guest(): void
    {
        $this->postJson('/api/auth/logout')->assertStatus(401);
    }

    public function test_auth_logout_returns_403_for_inactive(): void
    {
        $this->asActor($this->inactiveManager);
        $this->assert403Shape($this->postJson('/api/auth/logout'));
    }

    // ----- GET /api/users -----

    public function test_get_users_admin_allowed(): void
    {
        $this->asActor($this->admin);
        $this->assertAllowed($this->getJson('/api/users'));
    }

    public function test_get_users_manager_forbidden(): void
    {
        $this->asActor($this->manager);
        $this->assert403Shape($this->getJson('/api/users'));
    }

    public function test_get_users_staff_forbidden(): void
    {
        $this->asActor($this->staff);
        $this->assert403Shape($this->getJson('/api/users'));
    }

    public function test_get_users_guest_unauthenticated(): void
    {
        $this->getJson('/api/users')->assertStatus(401);
    }

    public function test_get_users_inactive_manager_forbidden(): void
    {
        $this->asActor($this->inactiveManager);
        $this->assert403Shape($this->getJson('/api/users'));
    }

    // ----- POST /api/users -----

    public function test_post_users_admin_allowed(): void
    {
        $this->asActor($this->admin);
        $this->assertAllowed($this->postJson('/api/users', $this->validUserPayload()));
    }

    public function test_post_users_manager_forbidden(): void
    {
        $this->asActor($this->manager);
        $this->assert403Shape($this->postJson('/api/users', $this->validUserPayload()));
    }

    public function test_post_users_staff_forbidden(): void
    {
        $this->asActor($this->staff);
        $this->assert403Shape($this->postJson('/api/users', $this->validUserPayload()));
    }

    public function test_post_users_guest_unauthenticated(): void
    {
        $this->postJson('/api/users', $this->validUserPayload())->assertStatus(401);
    }

    // ----- GET /api/users/{id} -----

    public function test_get_user_by_id_admin_allowed(): void
    {
        $this->asActor($this->admin);
        $this->assertAllowed($this->getJson('/api/users/' . $this->targetUser->id));
    }

    public function test_get_user_by_id_manager_forbidden(): void
    {
        $this->asActor($this->manager);
        $this->assert403Shape($this->getJson('/api/users/' . $this->targetUser->id));
    }

    public function test_get_user_by_id_staff_forbidden(): void
    {
        $this->asActor($this->staff);
        $this->assert403Shape($this->getJson('/api/users/' . $this->targetUser->id));
    }

    public function test_get_user_by_id_guest_unauthenticated(): void
    {
        $this->getJson('/api/users/' . $this->targetUser->id)->assertStatus(401);
    }

    // ----- PATCH /api/users/{id} -----

    public function test_patch_user_admin_allowed(): void
    {
        $this->asActor($this->admin);
        $this->assertAllowed($this->patchJson('/api/users/' . $this->targetUser->id, ['name' => 'Updated Name']));
    }

    public function test_patch_user_manager_forbidden(): void
    {
        $this->asActor($this->manager);
        $this->assert403Shape($this->patchJson('/api/users/' . $this->targetUser->id, ['name' => 'Updated Name']));
    }

    public function test_patch_user_staff_forbidden(): void
    {
        $this->asActor($this->staff);
        $this->assert403Shape($this->patchJson('/api/users/' . $this->targetUser->id, ['name' => 'Updated Name']));
    }

    public function test_patch_user_guest_unauthenticated(): void
    {
        $this->patchJson('/api/users/' . $this->targetUser->id, ['name' => 'Updated Name'])->assertStatus(401);
    }

    // ----- GET /api/workshops -----

    public function test_get_workshops_admin_allowed(): void
    {
        $this->asActor($this->admin);
        $this->assertAllowed($this->getJson('/api/workshops'));
    }

    public function test_get_workshops_manager_allowed(): void
    {
        $this->asActor($this->manager);
        $this->assertAllowed($this->getJson('/api/workshops'));
    }

    public function test_get_workshops_staff_allowed(): void
    {
        $this->asActor($this->staff);
        $this->assertAllowed($this->getJson('/api/workshops'));
    }

    public function test_get_workshops_guest_unauthenticated(): void
    {
        $this->getJson('/api/workshops')->assertStatus(401);
    }

    public function test_get_workshops_inactive_manager_forbidden(): void
    {
        $this->asActor($this->inactiveManager);
        $this->assert403Shape($this->getJson('/api/workshops'));
    }

    // ----- GET /api/workshops/{id} -----

    public function test_get_workshop_by_id_admin_allowed(): void
    {
        $this->asActor($this->admin);
        $this->assertAllowed($this->getJson('/api/workshops/' . $this->workshop->id));
    }

    public function test_get_workshop_by_id_manager_allowed(): void
    {
        $this->asActor($this->manager);
        $this->assertAllowed($this->getJson('/api/workshops/' . $this->workshop->id));
    }

    public function test_get_workshop_by_id_staff_allowed(): void
    {
        $this->asActor($this->staff);
        $this->assertAllowed($this->getJson('/api/workshops/' . $this->workshop->id));
    }

    public function test_get_workshop_by_id_guest_unauthenticated(): void
    {
        $this->getJson('/api/workshops/' . $this->workshop->id)->assertStatus(401);
    }

    // ----- POST /api/workshops -----

    public function test_post_workshops_admin_allowed(): void
    {
        $this->asActor($this->admin);
        $this->assertAllowed($this->postJson('/api/workshops', $this->validWorkshopPayload()));
    }

    public function test_post_workshops_manager_allowed(): void
    {
        $this->asActor($this->manager);
        $payload = $this->validWorkshopPayload();
        $payload['code'] = 'WS-MGR-' . uniqid();
        $this->assertAllowed($this->postJson('/api/workshops', $payload));
    }

    public function test_post_workshops_staff_forbidden(): void
    {
        $this->asActor($this->staff);
        $this->assert403Shape($this->postJson('/api/workshops', $this->validWorkshopPayload()));
    }

    public function test_post_workshops_guest_unauthenticated(): void
    {
        $this->postJson('/api/workshops', $this->validWorkshopPayload())->assertStatus(401);
    }

    public function test_post_workshops_inactive_manager_forbidden(): void
    {
        $this->asActor($this->inactiveManager);
        $this->assert403Shape($this->postJson('/api/workshops', $this->validWorkshopPayload()));
    }

    // ----- PATCH /api/workshops/{id} -----

    public function test_patch_workshop_admin_allowed(): void
    {
        $this->asActor($this->admin);
        $this->assertAllowed($this->patchJson('/api/workshops/' . $this->workshop->id, ['title' => 'Updated Title']));
    }

    public function test_patch_workshop_manager_allowed(): void
    {
        $this->asActor($this->manager);
        $this->assertAllowed($this->patchJson('/api/workshops/' . $this->workshop->id, ['title' => 'Updated Title 2']));
    }

    public function test_patch_workshop_staff_forbidden(): void
    {
        $this->asActor($this->staff);
        $this->assert403Shape($this->patchJson('/api/workshops/' . $this->workshop->id, ['title' => 'Hacked']));
    }

    public function test_patch_workshop_guest_unauthenticated(): void
    {
        $this->patchJson('/api/workshops/' . $this->workshop->id, ['title' => 'Hacked'])->assertStatus(401);
    }

    // ----- GET /api/workshops/{id}/registrations -----

    public function test_get_registrations_admin_forbidden(): void
    {
        // Admin is NOT in the manager,staff group for registrations
        $this->asActor($this->admin);
        $this->assert403Shape($this->getJson('/api/workshops/' . $this->workshop->id . '/registrations'));
    }

    public function test_get_registrations_manager_allowed(): void
    {
        $this->asActor($this->manager);
        $this->assertAllowed($this->getJson('/api/workshops/' . $this->workshop->id . '/registrations'));
    }

    public function test_get_registrations_staff_allowed(): void
    {
        $this->asActor($this->staff);
        $this->assertAllowed($this->getJson('/api/workshops/' . $this->workshop->id . '/registrations'));
    }

    public function test_get_registrations_guest_unauthenticated(): void
    {
        $this->getJson('/api/workshops/' . $this->workshop->id . '/registrations')->assertStatus(401);
    }

    // ----- POST /api/workshops/{id}/registrations -----

    public function test_post_registration_admin_forbidden(): void
    {
        $this->asActor($this->admin);
        $this->assert403Shape(
            $this->postJson('/api/workshops/' . $this->workshop->id . '/registrations', $this->validRegistrationPayload())
        );
    }

    public function test_post_registration_manager_allowed(): void
    {
        $this->asActor($this->manager);
        $this->assertAllowed(
            $this->postJson('/api/workshops/' . $this->workshop->id . '/registrations', $this->validRegistrationPayload())
        );
    }

    public function test_post_registration_staff_allowed(): void
    {
        $this->asActor($this->staff);
        $this->assertAllowed(
            $this->postJson('/api/workshops/' . $this->workshop->id . '/registrations', $this->validRegistrationPayload())
        );
    }

    public function test_post_registration_guest_unauthenticated(): void
    {
        $this->postJson(
            '/api/workshops/' . $this->workshop->id . '/registrations',
            $this->validRegistrationPayload()
        )->assertStatus(401);
    }

    // ----- POST /api/registrations/{id}/cancel -----

    public function test_cancel_registration_admin_forbidden(): void
    {
        $this->asActor($this->admin);
        $this->assert403Shape(
            $this->postJson('/api/registrations/' . $this->registration->id . '/cancel')
        );
    }

    public function test_cancel_registration_manager_allowed(): void
    {
        $this->asActor($this->manager);
        $this->assertAllowed(
            $this->postJson('/api/registrations/' . $this->registration->id . '/cancel')
        );
    }

    public function test_cancel_registration_staff_allowed(): void
    {
        // Re-create an active registration since manager may have cancelled it above
        $reg = Registration::factory()->active()->create([
            'workshop_id'   => $this->workshop->id,
            'registered_by' => $this->staff->id,
        ]);
        $this->asActor($this->staff);
        $this->assertAllowed(
            $this->postJson('/api/registrations/' . $reg->id . '/cancel')
        );
    }

    public function test_cancel_registration_guest_unauthenticated(): void
    {
        $this->postJson('/api/registrations/' . $this->registration->id . '/cancel')->assertStatus(401);
    }

    // -----------------------------------------------------------------------
    // B2 — Route coverage guard
    // -----------------------------------------------------------------------

    /**
     * Every api/* route except POST api/auth/login must carry both
     * auth:sanctum and active middleware.
     * Every api/* route except the three auth routes must carry a role: middleware.
     */
    public function test_all_api_routes_have_required_middleware(): void
    {
        $publicLoginRoute  = 'api/auth/login';
        $authOnlyRoutes    = ['api/auth/me', 'api/auth/logout'];
        $noRoleRequired    = array_merge([$publicLoginRoute], $authOnlyRoutes);

        $violations = [];

        /** @var \Illuminate\Routing\Route $route */
        foreach (RouteFacade::getRoutes() as $route) {
            $uri = $route->uri();

            // Only care about api/* routes
            if (! str_starts_with($uri, 'api/')) {
                continue;
            }

            $middlewareList = $route->gatherMiddleware();
            $middlewareStr  = implode(',', $middlewareList);

            // The login route must NOT require auth (it IS the public endpoint)
            if ($uri === $publicLoginRoute) {
                continue;
            }

            // All other api/* routes must carry auth:sanctum AND active
            $hasAuth   = str_contains($middlewareStr, 'auth:sanctum');
            $hasActive = str_contains($middlewareStr, 'active');

            if (! $hasAuth || ! $hasActive) {
                $missing = [];
                if (! $hasAuth)   $missing[] = 'auth:sanctum';
                if (! $hasActive) $missing[] = 'active';
                $violations[] = "MISSING [" . implode(', ', $missing) . "] on {$route->methods()[0]} {$uri}";
            }

            // Auth-only routes (me / logout) are exempt from role: middleware
            if (in_array($uri, $authOnlyRoutes, true)) {
                continue;
            }

            // All other routes must have role: middleware
            $hasRole = (bool) preg_match('/\brole:/i', $middlewareStr);
            if (! $hasRole) {
                $violations[] = "MISSING [role:] on {$route->methods()[0]} {$uri}";
            }
        }

        $this->assertEmpty(
            $violations,
            "Route middleware guard failed.\n" . implode("\n", $violations)
        );
    }

    /**
     * No api/* route must use HTTP DELETE or PUT.
     * (History must never be deleted; PUT is not in the API conventions.)
     */
    public function test_no_delete_or_put_routes_under_api(): void
    {
        $forbidden = [];

        foreach (RouteFacade::getRoutes() as $route) {
            $uri = $route->uri();
            if (! str_starts_with($uri, 'api/')) {
                continue;
            }

            foreach ($route->methods() as $method) {
                if (in_array(strtoupper($method), ['DELETE', 'PUT'], true)) {
                    $forbidden[] = "{$method} {$uri}";
                }
            }
        }

        $this->assertEmpty(
            $forbidden,
            "Found forbidden DELETE/PUT routes under api/:\n" . implode("\n", $forbidden)
        );
    }

    // -----------------------------------------------------------------------
    // B3 — Mass-assignment / tampering checks
    // -----------------------------------------------------------------------

    /**
     * Staff cannot elevate their role by sending role=admin in a registration request.
     * The role field must be ignored / stripped.
     */
    public function test_staff_cannot_inject_role_via_registration_payload(): void
    {
        $this->asActor($this->staff);

        $payload = array_merge($this->validRegistrationPayload(), ['role' => 'admin']);

        $response = $this->postJson('/api/workshops/' . $this->workshop->id . '/registrations', $payload);

        // Must not 403 on a role-escalation attempt in the payload itself
        // (the route is already allowed for staff)
        $this->assertNotEquals(500, $response->getStatusCode());

        // The staff user's role must not have changed in the DB
        $this->staff->refresh();
        $this->assertEquals(Role::Staff->value, $this->staff->role->value, 'Staff role must not change');
    }

    /**
     * Staff trying to PATCH a workshop gets 403, not a DB change.
     */
    public function test_staff_cannot_patch_workshop_even_with_role_in_body(): void
    {
        $this->asActor($this->staff);

        $originalTitle = $this->workshop->title;

        $this->assert403Shape(
            $this->patchJson('/api/workshops/' . $this->workshop->id, [
                'title' => 'Tampered Title',
                'role'  => 'manager',
            ])
        );

        $this->workshop->refresh();
        $this->assertEquals($originalTitle, $this->workshop->title, 'Workshop title must not change after 403');
    }

    /**
     * Manager cannot create or update users, even if they send role=manager in body.
     */
    public function test_manager_cannot_create_user(): void
    {
        $this->asActor($this->manager);
        $this->assert403Shape($this->postJson('/api/users', $this->validUserPayload()));
    }

    public function test_manager_cannot_update_user(): void
    {
        $this->asActor($this->manager);
        $this->assert403Shape(
            $this->patchJson('/api/users/' . $this->targetUser->id, ['name' => 'Tampered Name'])
        );
    }

    /**
     * Non-existent IDs:
     * In Laravel, SubstituteBindings is part of the api middleware group which executes
     * before route-level role middleware. Thus, resolving a nonexistent model binding returns
     * 404 across roles (as anticipated in spec: "If the framework order makes this impossible,
     * report it and keep 404 for all").
     */
    public function test_nonexistent_workshop_returns_404_due_to_route_model_binding(): void
    {
        $this->asActor($this->staff);
        $response = $this->patchJson('/api/workshops/99999', ['title' => 'Ghost']);
        $response->assertStatus(404);
    }

    public function test_nonexistent_workshop_returns_404_for_allowed_role(): void
    {
        $this->asActor($this->manager);
        // Manager CAN PATCH – should get 404 for non-existent workshop
        $response = $this->patchJson('/api/workshops/99999', ['title' => 'Ghost']);
        $response->assertStatus(404);
    }

    public function test_nonexistent_user_returns_404_due_to_route_model_binding(): void
    {
        $this->asActor($this->staff);
        $response = $this->getJson('/api/users/99999');
        $response->assertStatus(404);
    }

    public function test_nonexistent_user_returns_404_for_allowed_role(): void
    {
        $this->asActor($this->admin);
        // Admin can GET – should get 404
        $response = $this->getJson('/api/users/99999');
        $response->assertStatus(404);
    }
}

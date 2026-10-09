<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('login');
    }

    public function test_login_success_returns_token_and_user_without_password(): void
    {
        $user = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'token_type',
                'expires_at',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'role',
                    'is_active',
                ],
            ]);

        $data = $response->json();
        $this->assertEquals('Bearer', $data['token_type']);
        $this->assertArrayNotHasKey('password', $data['user']);
        $this->assertArrayNotHasKey('remember_token', $data['user']);
        $this->assertEquals('admin', $data['user']['role']);
        $this->assertTrue($data['user']['is_active']);
    }

    public function test_wrong_password_and_unknown_email_return_401_with_same_message(): void
    {
        User::factory()->create([
            'email' => 'user@example.com',
            'password' => Hash::make('password123'),
        ]);

        $expectedPayload = [
            'message' => 'Invalid email or password',
            'errors' => [],
        ];

        // Wrong password
        $responseWrongPassword = $this->postJson('/api/auth/login', [
            'email' => 'user@example.com',
            'password' => 'wrongpassword',
        ]);

        $responseWrongPassword->assertStatus(401)
            ->assertExactJson($expectedPayload);

        // Unknown email
        $responseUnknownEmail = $this->postJson('/api/auth/login', [
            'email' => 'unknown@example.com',
            'password' => 'password123',
        ]);

        $responseUnknownEmail->assertStatus(401)
            ->assertExactJson($expectedPayload);
    }

    public function test_deactivated_user_returns_403_and_no_token_is_created(): void
    {
        $user = User::factory()->inactive()->create([
            'email' => 'inactive@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'inactive@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(403)
            ->assertExactJson([
                'message' => 'This account is deactivated. Please contact an admin.',
                'errors' => [],
            ]);

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_email_is_case_insensitive_and_trimmed(): void
    {
        User::factory()->create([
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => '  ADMIN@Example.com  ',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertSame('admin@example.com', $response->json('user.email'));
    }

    public function test_validation_missing_fields_returns_422_with_errors(): void
    {
        $response = $this->postJson('/api/auth/login', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password'])
            ->assertJsonStructure([
                'message',
                'errors' => ['email', 'password'],
            ]);
    }

    public function test_me_works_with_token_and_without_token_returns_401_json(): void
    {
        $user = User::factory()->manager()->create();
        $token = $user->createToken('auth')->plainTextToken;

        // With token
        $responseWithToken = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        $responseWithToken->assertStatus(200)
            ->assertExactJson([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => 'manager',
                    'is_active' => true,
                ],
            ]);

        // Without token (must be JSON 401, not a redirect)
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $responseWithoutToken = $this->getJson('/api/auth/me');

        $responseWithoutToken->assertStatus(401)
            ->assertExactJson([
                'message' => 'Unauthenticated',
                'errors' => [],
            ]);
    }

    public function test_logout_revokes_only_current_token(): void
    {
        $user = User::factory()->create();
        $token1 = $user->createToken('device-1')->plainTextToken;
        $token2 = $user->createToken('device-2')->plainTextToken;

        $this->assertEquals(2, $user->tokens()->count());

        // Logout using token1
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $response = $this->withHeader('Authorization', 'Bearer '.$token1)
            ->postJson('/api/auth/logout');

        $response->assertStatus(200)
            ->assertExactJson(['message' => 'Logged out']);

        // token1 no longer works
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$token1)
            ->getJson('/api/auth/me')
            ->assertStatus(401);

        // token2 still works
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$token2)
            ->getJson('/api/auth/me')
            ->assertStatus(200);

        $this->assertEquals(1, $user->tokens()->count());
    }

    public function test_deactivated_user_with_existing_token_returns_403_on_me(): void
    {
        $user = User::factory()->create(['is_active' => true]);
        $token = $user->createToken('auth')->plainTextToken;

        // Deactivate user after token was granted
        $user->update(['is_active' => false]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me');

        $response->assertStatus(403)
            ->assertExactJson([
                'message' => 'This account is deactivated. Please contact an admin.',
                'errors' => [],
            ]);

        // Token should be revoked
        $this->assertEquals(0, $user->tokens()->count());
    }

    public function test_rate_limit_sixth_rapid_failed_attempt_returns_429(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('secret123'),
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'test@example.com',
                'password' => 'wrong',
            ])->assertStatus(401);
        }

        // 6th attempt should be rate limited
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(429)
            ->assertJsonStructure([
                'message',
                'errors',
            ]);
    }
}

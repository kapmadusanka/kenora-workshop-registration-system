<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Registration;
use App\Models\User;
use App\Models\Workshop;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkshopFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->manager = User::factory()->manager()->create();
    }

    public function test_filter_by_from_and_to_dates_inclusive_boundaries(): void
    {
        // Day 1: 2026-11-10 00:00:00 UTC (exact start of day)
        $w1 = Workshop::factory()->create([
            'title' => 'Day 1 Start Workshop',
            'starts_at' => Carbon::parse('2026-11-10 00:00:00', 'UTC'),
        ]);

        // Day 2: 2026-11-11 12:00:00 UTC (middle)
        $w2 = Workshop::factory()->create([
            'title' => 'Day 2 Mid Workshop',
            'starts_at' => Carbon::parse('2026-11-11 12:00:00', 'UTC'),
        ]);

        // Day 3: 2026-11-12 23:59:59 UTC (exact end of day)
        $w3 = Workshop::factory()->create([
            'title' => 'Day 3 End Workshop',
            'starts_at' => Carbon::parse('2026-11-12 23:59:59', 'UTC'),
        ]);

        // Outside before: 2026-11-09 23:59:59 UTC
        Workshop::factory()->create([
            'title' => 'Day Before Workshop',
            'starts_at' => Carbon::parse('2026-11-09 23:59:59', 'UTC'),
        ]);

        // Outside after: 2026-11-13 00:00:00 UTC
        Workshop::factory()->create([
            'title' => 'Day After Workshop',
            'starts_at' => Carbon::parse('2026-11-13 00:00:00', 'UTC'),
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/workshops?from=2026-11-10&to=2026-11-12');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertCount(3, $ids);
        $this->assertContains($w1->id, $ids);
        $this->assertContains($w2->id, $ids);
        $this->assertContains($w3->id, $ids);
    }

    public function test_to_date_before_from_date_returns_422(): void
    {
        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/workshops?from=2026-11-12&to=2026-11-10');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['to']);
    }

    public function test_filter_by_single_status(): void
    {
        Workshop::factory()->open()->create(['title' => 'Open Workshop']);
        Workshop::factory()->draft()->create(['title' => 'Draft Workshop']);
        Workshop::factory()->cancelled()->create(['title' => 'Cancelled Workshop']);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/workshops?status=open');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame('open', $data[0]['status']);
    }

    public function test_filter_by_multiple_statuses(): void
    {
        Workshop::factory()->open()->create(['title' => 'Open Workshop']);
        Workshop::factory()->draft()->create(['title' => 'Draft Workshop']);
        Workshop::factory()->cancelled()->create(['title' => 'Cancelled Workshop']);
        Workshop::factory()->completed()->create(['title' => 'Completed Workshop']);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/workshops?status=open,draft');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(2, $data);
        $statuses = collect($data)->pluck('status')->sort()->values()->all();
        $this->assertSame(['draft', 'open'], $statuses);
    }

    public function test_filter_by_invalid_status_returns_422(): void
    {
        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/workshops?status=invalid_status');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        $responseComma = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/workshops?status=open,nonexistent');

        $responseComma->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_filter_has_seats_excludes_full_workshops_and_ignores_cancelled_registrations(): void
    {
        // Workshop with capacity 2, 2 active registrations -> FULL
        $fullWorkshop = Workshop::factory()->create(['capacity' => 2]);
        Registration::factory()->count(2)->active()->create(['workshop_id' => $fullWorkshop->id]);

        // Workshop with capacity 2, 1 active registration -> HAS SEATS
        $partialWorkshop = Workshop::factory()->create(['capacity' => 2]);
        Registration::factory()->count(1)->active()->create(['workshop_id' => $partialWorkshop->id]);

        // Workshop with capacity 1, 1 active + 2 cancelled registrations -> FULL (active = 1, capacity = 1)
        $workshopWithCancelled = Workshop::factory()->create(['capacity' => 1]);
        Registration::factory()->active()->create(['workshop_id' => $workshopWithCancelled->id]);
        Registration::factory()->count(2)->cancelled()->create(['workshop_id' => $workshopWithCancelled->id]);

        // Workshop with capacity 1, 0 active + 3 cancelled registrations -> HAS SEATS
        $availableWithCancelled = Workshop::factory()->create(['capacity' => 1]);
        Registration::factory()->count(3)->cancelled()->create(['workshop_id' => $availableWithCancelled->id]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/workshops?has_seats=true');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($partialWorkshop->id, $ids);
        $this->assertContains($availableWithCancelled->id, $ids);
        $this->assertNotContains($fullWorkshop->id, $ids);
        $this->assertNotContains($workshopWithCancelled->id, $ids);
    }

    public function test_filter_q_matches_code_title_or_instructor_with_escaped_wildcards(): void
    {
        $w1 = Workshop::factory()->create(['code' => 'PHP-100', 'title' => 'Intro to Programming', 'instructor' => 'John Doe']);
        $w2 = Workshop::factory()->create(['code' => 'JS-200', 'title' => 'PHP Modern Practices', 'instructor' => 'Jane Smith']);
        $w3 = Workshop::factory()->create(['code' => 'CSS-300', 'title' => 'Styling Masterclass', 'instructor' => 'PHP Specialist']);
        $w4 = Workshop::factory()->create(['code' => 'OTHER-01', 'title' => 'Unrelated Topic', 'instructor' => 'Bob Lee']);

        // Search for 'PHP'
        $response = $this->actingAs($this->manager, 'sanctum')->getJson('/api/workshops?q=PHP');
        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertCount(3, $ids);
        $this->assertContains($w1->id, $ids);
        $this->assertContains($w2->id, $ids);
        $this->assertContains($w3->id, $ids);
        $this->assertNotContains($w4->id, $ids);

        // Search with % wildcard does not match everything
        $wPercent = Workshop::factory()->create(['code' => 'PCT-10', 'title' => '100% Success Rate', 'instructor' => 'Alice']);
        $responsePercent = $this->actingAs($this->manager, 'sanctum')->getJson('/api/workshops?q='.urlencode('100%'));
        $responsePercent->assertStatus(200);
        $percentIds = collect($responsePercent->json('data'))->pluck('id')->all();
        $this->assertSame([$wPercent->id], $percentIds);
    }

    public function test_combined_filters_work_together(): void
    {
        $target = Workshop::factory()->open()->create([
            'code' => 'TARGET-01',
            'title' => 'Target Workshop',
            'instructor' => 'Target Instructor',
            'starts_at' => Carbon::parse('2026-11-15 10:00:00', 'UTC'),
            'capacity' => 10,
        ]);

        // Wrong status
        Workshop::factory()->draft()->create([
            'title' => 'Target Draft',
            'starts_at' => Carbon::parse('2026-11-15 10:00:00', 'UTC'),
        ]);

        // Wrong date
        Workshop::factory()->open()->create([
            'title' => 'Target Next Month',
            'starts_at' => Carbon::parse('2026-12-15 10:00:00', 'UTC'),
        ]);

        // Full
        $full = Workshop::factory()->open()->create([
            'title' => 'Target Full',
            'starts_at' => Carbon::parse('2026-11-15 10:00:00', 'UTC'),
            'capacity' => 1,
        ]);
        Registration::factory()->active()->create(['workshop_id' => $full->id]);

        $response = $this->actingAs($this->manager, 'sanctum')->getJson(
            '/api/workshops?from=2026-11-10&to=2026-11-20&status=open&has_seats=true&q=Target'
        );

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame($target->id, $data[0]['id']);
    }

    public function test_sort_starts_at_ascending_and_descending(): void
    {
        $wEarly = Workshop::factory()->create(['starts_at' => Carbon::parse('2026-11-01 09:00:00', 'UTC')]);
        $wLate = Workshop::factory()->create(['starts_at' => Carbon::parse('2026-11-10 09:00:00', 'UTC')]);

        // Default / asc
        $resAsc = $this->actingAs($this->manager, 'sanctum')->getJson('/api/workshops?sort=starts_at');
        $resAsc->assertStatus(200);
        $ascIds = collect($resAsc->json('data'))->pluck('id')->all();
        $this->assertSame([$wEarly->id, $wLate->id], $ascIds);

        // Desc
        $resDesc = $this->actingAs($this->manager, 'sanctum')->getJson('/api/workshops?sort=-starts_at');
        $resDesc->assertStatus(200);
        $descIds = collect($resDesc->json('data'))->pluck('id')->all();
        $this->assertSame([$wLate->id, $wEarly->id], $descIds);
    }

    public function test_pagination_and_per_page_capped_at_100(): void
    {
        Workshop::factory()->count(25)->create();

        $response = $this->actingAs($this->manager, 'sanctum')->getJson('/api/workshops?per_page=10');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'links',
                'meta' => ['current_page', 'per_page', 'total'],
            ]);

        $this->assertCount(10, $response->json('data'));
        $this->assertSame(10, $response->json('meta.per_page'));

        // Requesting 150 gets capped at 100
        $responseCap = $this->actingAs($this->manager, 'sanctum')->getJson('/api/workshops?per_page=150');
        $responseCap->assertStatus(422)
            ->assertJsonValidationErrors(['per_page']);
    }
}

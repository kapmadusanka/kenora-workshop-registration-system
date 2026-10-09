<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\WorkshopStatus;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Database\Seeder;

class WorkshopSeeder extends Seeder
{
    public function run(): void
    {
        $manager = User::where('email', 'manager@example.com')->firstOrFail();

        $today = now();

        $workshops = [
            [
                'code' => 'POT-2026-01',
                'title' => 'Introduction to Pottery',
                'instructor' => 'Maria Chen',
                'starts_at' => $today->copy()->addDays(2)->setTime(9, 0),
                'ends_at' => $today->copy()->addDays(2)->setTime(12, 0),
                'location' => 'Studio A',
                'description' => 'Learn the basics of wheel-throwing and hand-building techniques.',
                'capacity' => 12,
                'status' => WorkshopStatus::Open->value,
            ],
            [
                'code' => 'CODE-2026-01',
                'title' => 'Python for Beginners',
                'instructor' => 'James Wright',
                'starts_at' => $today->copy()->addDays(3)->setTime(10, 0),
                'ends_at' => $today->copy()->addDays(3)->setTime(16, 0),
                'location' => 'Lab 2',
                'description' => 'A full-day introduction to programming with Python.',
                'capacity' => 20,
                'status' => WorkshopStatus::Open->value,
            ],
            [
                'code' => 'FIT-2026-01',
                'title' => 'Morning Yoga & Mindfulness',
                'instructor' => 'Priya Sharma',
                'starts_at' => $today->copy()->addDay()->setTime(7, 0),
                'ends_at' => $today->copy()->addDay()->setTime(8, 30),
                'location' => 'Wellness Centre',
                'description' => 'Start your week with a rejuvenating yoga session.',
                'capacity' => 15,
                'status' => WorkshopStatus::Open->value,
            ],
            [
                'code' => 'POT-2026-02',
                'title' => 'Advanced Glazing Techniques',
                'instructor' => 'Maria Chen',
                'starts_at' => $today->copy()->addWeeks(2)->setTime(9, 0),
                'ends_at' => $today->copy()->addWeeks(2)->setTime(13, 0),
                'location' => 'Studio A',
                'description' => 'Explore layering, wax resist, and specialty glazes.',
                'capacity' => 3,  // intentionally small for capacity tests
                'status' => WorkshopStatus::Open->value,
            ],
            [
                'code' => 'COOK-2026-01',
                'title' => 'French Pastry Masterclass',
                'instructor' => 'Henri Dubois',
                'starts_at' => $today->copy()->addDays(5)->setTime(14, 0),
                'ends_at' => $today->copy()->addDays(5)->setTime(17, 0),
                'location' => 'Kitchen B',
                'description' => 'Learn croissants, éclairs, and macarons from a classically trained chef.',
                'capacity' => 8,
                'status' => WorkshopStatus::Open->value,
            ],
            [
                'code' => 'PHOTO-2026-01',
                'title' => 'Street Photography Fundamentals',
                'instructor' => 'Aiko Tanaka',
                'starts_at' => $today->copy()->subWeek()->setTime(9, 0),
                'ends_at' => $today->copy()->subWeek()->setTime(12, 0),
                'location' => 'City Centre',
                'description' => 'Capture candid moments in the urban environment.',
                'capacity' => 10,
                'status' => WorkshopStatus::Completed->value,
            ],
            [
                'code' => 'MUSIC-2026-01',
                'title' => 'Acoustic Guitar for Beginners',
                'instructor' => 'Carlos Rivera',
                'starts_at' => $today->copy()->addWeeks(3)->setTime(18, 0),
                'ends_at' => $today->copy()->addWeeks(3)->setTime(20, 0),
                'location' => 'Music Room 1',
                'description' => 'From zero to your first chord progression in one evening.',
                'capacity' => 10,
                'status' => WorkshopStatus::Draft->value,
            ],
            [
                'code' => 'FIT-2026-02',
                'title' => 'HIIT Bootcamp',
                'instructor' => 'Priya Sharma',
                'starts_at' => $today->copy()->addDays(4)->setTime(6, 30),
                'ends_at' => $today->copy()->addDays(4)->setTime(7, 30),
                'location' => 'Gym Hall',
                'description' => 'High-intensity interval training for all fitness levels.',
                'capacity' => 3,  // intentionally small for capacity tests
                'status' => WorkshopStatus::Cancelled->value,
            ],
        ];

        foreach ($workshops as $data) {
            Workshop::updateOrCreate(
                ['code' => $data['code']],
                array_merge($data, [
                    'created_by' => $manager->id,
                    'updated_by' => $manager->id,
                ])
            );
        }
    }
}

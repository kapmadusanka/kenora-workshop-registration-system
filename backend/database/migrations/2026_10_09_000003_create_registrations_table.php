<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workshop_id')
                ->constrained('workshops')
                ->restrictOnDelete();
            $table->string('attendee_name');
            $table->string('attendee_email');
            $table->string('status')->default('active');
            $table->foreignId('registered_by')
                ->constrained('users')
                ->restrictOnDelete();
            $table->timestamp('registered_at');
            $table->foreignId('cancelled_by')
                ->nullable()
                ->constrained('users')
                ->restrictOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->timestamps();

            // Composite index for fast capacity queries and filtering
            $table->index(['workshop_id', 'status']);
        });

        // STORED generated column: holds the email when active, NULL when cancelled.
        // The unique index on (workshop_id, active_key) prevents duplicate active registrations
        // at the database level. NULL values are excluded from unique indexes in MySQL.
        if (DB::getDriverName() === 'sqlite') {
            DB::statement("
                ALTER TABLE registrations
                ADD COLUMN active_key TEXT GENERATED ALWAYS AS (
                    CASE WHEN status = 'active' THEN attendee_email ELSE NULL END
                ) STORED
            ");

            DB::statement('
                CREATE UNIQUE INDEX registrations_workshop_active_key_unique ON registrations (workshop_id, active_key)
            ');
        } else {
            DB::statement("
                ALTER TABLE registrations
                ADD COLUMN active_key VARCHAR(255) AS (
                    IF(status = 'active', attendee_email, NULL)
                ) STORED
            ");

            DB::statement('
                ALTER TABLE registrations
                ADD UNIQUE INDEX registrations_workshop_active_key_unique (workshop_id, active_key)
            ');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('registrations');
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workshops', function (Blueprint $table) {
            $table->index(['status', 'starts_at'], 'workshops_status_starts_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('workshops', function (Blueprint $table) {
            $table->dropIndex('workshops_status_starts_at_index');
        });
    }
};

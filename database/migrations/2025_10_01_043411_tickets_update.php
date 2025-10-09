<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->text('cc')->nullable();
            $table->string('ticket_notice', 50)->nullable();
            $table->string('ticket_source', 50);
            $table->string('help_topic', 100);
            $table->string('department', 100);
            $table->string('sla_plan', 100)->nullable();
            $table->timestamp('due_date')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users');
            $table->string('canned_response', 255)->nullable();
            $table->text('response')->nullable();
            $table->string('status', 50)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
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
            $table->foreignId('user_id');
            $table->text('cc')->nullable();
            $table->string('ticket_notice', 50)->nullable();
            $table->string('ticket_source', 50);
            $table->string('help_topic', 100);
            $table->string('department', 100);
            $table->string('sla_plan', 100)->nullable();
            $table->timestamp('due_date')->nullable();
            $table->unsignedBigInteger('assigned_to')->nullable();
            $table->string('canned_response', 255)->nullable();
            $table->text('response')->nullable();
            $table->string('status', 50)->nullable();
            $table->timestamps();
            
            // Add foreign key constraints separately to avoid issues
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('assigned_to')->references('id')->on('users');
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
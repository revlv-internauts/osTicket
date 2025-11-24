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
            $table->string('ticket_name')->unique();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('ticket_source', 50);
            $table->foreignId('help_topic')->constrained('help_topics')->onDelete('cascade');
            $table->string('department', 100);
            $table->timestamp('downtime')->nullable();
            $table->foreignId('opened_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('uptime')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->integer('resolution_time')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->longText('body')->nullable();
            $table->string('status', 50)->default('Open');
            $table->string('priority', 50)->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('assigned_to');
            $table->index('help_topic');
            $table->index('status');
            $table->index('priority');
            $table->index('resolution_time');
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
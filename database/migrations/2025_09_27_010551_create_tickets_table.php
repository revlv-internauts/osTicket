<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTicketsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_name')->nullable();
            $table->foreignId('user_id')->constrained();
            $table->foreignId('cc')->nullable()->constrained('emails');
            $table->string('ticket_source', 50);
            $table->foreignId('help_topic')->constrained('help_topics');
            $table->string('department', 100);
            $table->string('sla_plan', 100)->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users');
            $table->text('response')->nullable();
            $table->string('status', 50)->nullable();
            $table->string('priority', 50)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void     
     */
    public function down()
    {
        Schema::dropIfExists('tickets');
    }
}
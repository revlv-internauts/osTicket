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
        Schema::table('tickets', function (Blueprint $table) {
            // Get the foreign key name
            $foreignKeys = Schema::getConnection()->getDoctrineSchemaManager()->listTableForeignKeys('tickets');
            foreach ($foreignKeys as $foreignKey) {
                if (in_array('assigned_to', $foreignKey->getLocalColumns())) {
                    $table->dropForeign($foreignKey->getName());
                    break;
                }
            }
            
            // Now drop the column
            $table->dropColumn('assigned_to');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // Re-add the column if we need to roll back
            $table->unsignedBigInteger('assigned_to')->nullable()->after('due_date');
            $table->foreign('assigned_to')->references('id')->on('users');
        });
    }
};
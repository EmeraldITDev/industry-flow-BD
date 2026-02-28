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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('sector')->nullable();
            $table->enum('status', ['active', 'on-hold', 'completed'])->default('active');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('client_name')->nullable();
            $table->string('client_contact')->nullable();
            $table->string('pipeline_stage')->default('cold');
            $table->date('pipeline_intake_date')->nullable();
            $table->string('oem')->nullable();
            $table->string('location')->nullable();
            $table->date('expected_close_date')->nullable();
            $table->string('business_segment')->nullable();
            $table->string('product')->nullable();
            $table->string('sub_product')->nullable();
            $table->unsignedBigInteger('project_lead_id')->nullable();
            $table->unsignedBigInteger('assignee_id')->nullable();
            $table->string('channel_partner')->nullable();
            $table->decimal('contract_value_ngn', 15, 2)->default(0);
            $table->decimal('contract_value_usd', 15, 2)->default(0);
            $table->decimal('margin_percent_ngn', 5, 2)->default(0);
            $table->decimal('margin_percent_usd', 5, 2)->default(0);
            $table->decimal('margin_value_ngn', 15, 2)->default(0);
            $table->decimal('margin_value_usd', 15, 2)->default(0);
            $table->text('project_lead_comments')->nullable();
            $table->string('deal_probability')->default('low');
            $table->integer('progress')->default(0);
            $table->timestamps();
            
            // Add indexes for common queries
            $table->index('status');
            $table->index('sector');
            $table->index('pipeline_stage');
            $table->index('deal_probability');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};

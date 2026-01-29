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
        Schema::create('mail_configs', function (Blueprint $table) {
            $table->id();
            $table->string('from_email');
            $table->string('from_name')->default('Project Manager');
            $table->string('reply_to_email')->nullable();
            $table->boolean('notification_enabled')->default(true);
            $table->string('smtp_host');
            $table->integer('smtp_port')->default(587);
            $table->string('smtp_username');
            $table->string('smtp_password');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mail_configs');
    }
};

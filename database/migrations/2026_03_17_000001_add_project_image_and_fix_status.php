<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Fix status enum to include 'inactive'
        // For PostgreSQL, we need to alter the type
        DB::statement("ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check");
        DB::statement("ALTER TABLE projects ALTER COLUMN status TYPE VARCHAR(20)");
        DB::statement("ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('active', 'on-hold', 'completed', 'inactive'))");

        // Add project_image column
        Schema::table('projects', function (Blueprint $table) {
            $table->longText('project_image')->nullable()->after('progress');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('project_image');
        });

        DB::statement("ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check");
        DB::statement("ALTER TABLE projects ALTER COLUMN status TYPE VARCHAR(20)");
        DB::statement("ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('active', 'on-hold', 'completed'))");
    }
};

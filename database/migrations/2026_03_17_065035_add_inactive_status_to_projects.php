<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE projects ALTER COLUMN status TYPE VARCHAR(20)");
            DB::statement("ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check");
            DB::statement("ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('active', 'on-hold', 'completed', 'inactive'))");
            DB::statement("ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active'");
            return;
        }

        DB::statement("ALTER TABLE projects MODIFY COLUMN status ENUM('active', 'on-hold', 'completed', 'inactive') DEFAULT 'active'");
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE projects ALTER COLUMN status TYPE VARCHAR(20)");
            DB::statement("ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check");
            DB::statement("ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('active', 'on-hold', 'completed'))");
            DB::statement("ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active'");
            return;
        }

        DB::statement("ALTER TABLE projects MODIFY COLUMN status ENUM('active', 'on-hold', 'completed') DEFAULT 'active'");
    }
};

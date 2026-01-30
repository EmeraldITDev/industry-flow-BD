# Backend Projects API Setup

## Required Backend Endpoints

Your frontend is trying to access these endpoints:
- `GET /api/projects` - Get all projects
- `GET /api/projects/stats` - Get dashboard statistics
- `GET /api/projects/{id}` - Get single project
- `POST /api/projects` - Create new project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

## Laravel Backend Implementation

### Step 1: Create Migration

Create file: `database/migrations/2026_01_30_000000_create_projects_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
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
            $table->string('pipeline_stage')->default('initiation');
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
            $table->decimal('contract_value_ngn', 15, 2)->nullable();
            $table->decimal('contract_value_usd', 15, 2')->nullable();
            $table->decimal('margin_percent_ngn', 5, 2)->nullable();
            $table->decimal('margin_percent_usd', 5, 2)->nullable();
            $table->decimal('margin_value_ngn', 15, 2)->nullable();
            $table->decimal('margin_value_usd', 15, 2)->nullable();
            $table->text('project_lead_comments')->nullable();
            $table->string('deal_probability')->default('low');
            $table->integer('progress')->default(0);
            $table->timestamps();
            
            $table->foreign('project_lead_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('assignee_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::dropIfExists('projects');
    }
};
```

### Step 2: Create Model

Create file: `app/Models/Project.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'name',
        'description',
        'sector',
        'status',
        'start_date',
        'end_date',
        'client_name',
        'client_contact',
        'pipeline_stage',
        'pipeline_intake_date',
        'oem',
        'location',
        'expected_close_date',
        'business_segment',
        'product',
        'sub_product',
        'project_lead_id',
        'assignee_id',
        'channel_partner',
        'contract_value_ngn',
        'contract_value_usd',
        'margin_percent_ngn',
        'margin_percent_usd',
        'margin_value_ngn',
        'margin_value_usd',
        'project_lead_comments',
        'deal_probability',
        'progress',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'pipeline_intake_date' => 'date',
        'expected_close_date' => 'date',
        'contract_value_ngn' => 'decimal:2',
        'contract_value_usd' => 'decimal:2',
        'margin_percent_ngn' => 'decimal:2',
        'margin_percent_usd' => 'decimal:2',
        'margin_value_ngn' => 'decimal:2',
        'margin_value_usd' => 'decimal:2',
        'progress' => 'integer',
    ];

    public function projectLead()
    {
        return $this->belongsTo(User::class, 'project_lead_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }
}
```

### Step 3: Create Controller

Create file: `app/Http/Controllers/ProjectController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProjectController extends Controller
{
    /**
     * Get all projects
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Project::with(['projectLead', 'assignee']);

            // Apply filters
            if ($request->has('sector')) {
                $query->where('sector', $request->sector);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('pipeline_stage')) {
                $query->where('pipeline_stage', $request->pipeline_stage);
            }

            $projects = $query->orderBy('created_at', 'desc')->get();

            return response()->json($projects);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch projects',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    public function stats(): JsonResponse
    {
        try {
            $total = Project::count();
            $active = Project::where('status', 'active')->count();
            $completed = Project::where('status', 'completed')->count();
            $highRisk = Project::whereIn('deal_probability', ['high', 'critical'])->count();

            $totalValueNgn = Project::sum('contract_value_ngn') ?? 0;
            $totalValueUsd = Project::sum('contract_value_usd') ?? 0;

            $averageProgress = Project::avg('progress') ?? 0;

            $stats = [
                'total' => $total,
                'totalProjects' => $total,
                'active' => $active,
                'activeProjects' => $active,
                'completed' => $completed,
                'completedProjects' => $completed,
                'highRisk' => $highRisk,
                'totalValueNgn' => (float) $totalValueNgn,
                'totalValueUsd' => (float) $totalValueUsd,
                'averageProgress' => round($averageProgress, 1),
                'completedTasks' => 0,
                'pendingTasks' => 0,
                'overdueTasks' => 0,
                'byStatus' => [
                    'active' => $active,
                    'on_hold' => Project::where('status', 'on-hold')->count(),
                    'completed' => $completed,
                    'cancelled' => 0,
                ],
                'byStage' => [],
                'byAssignee' => [],
                'recent' => Project::orderBy('created_at', 'desc')->limit(5)->get(),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch statistics',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single project
     */
    public function show($id): JsonResponse
    {
        try {
            $project = Project::with(['projectLead', 'assignee', 'tasks'])->findOrFail($id);
            return response()->json($project);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Project not found',
                'message' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create new project
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'sector' => 'nullable|string',
                'status' => 'nullable|in:active,on-hold,completed',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date',
                'client_name' => 'nullable|string',
                'client_contact' => 'nullable|string',
                'pipeline_stage' => 'nullable|string',
                'contract_value_ngn' => 'nullable|numeric',
                'contract_value_usd' => 'nullable|numeric',
                'deal_probability' => 'nullable|string',
            ]);

            $project = Project::create($validated);

            return response()->json($project, 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create project',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update project
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $project = Project::findOrFail($id);
            
            $project->update($request->all());

            return response()->json($project);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update project',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete project
     */
    public function destroy($id): JsonResponse
    {
        try {
            $project = Project::findOrFail($id);
            $project->delete();

            return response()->json(['message' => 'Project deleted successfully']);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete project',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
```

### Step 4: Add Routes

Add to `routes/api.php`:

```php
use App\Http\Controllers\ProjectController;

Route::middleware('auth:sanctum')->group(function () {
    // Projects routes
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/stats', [ProjectController::class, 'stats']);
    Route::get('/projects/{id}', [ProjectController::class, 'show']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::put('/projects/{id}', [ProjectController::class, 'update']);
    Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);
});
```

### Step 5: Run Migration

```bash
php artisan migrate
```

### Step 6: Add Sample Data (Optional)

Create file: `database/seeders/ProjectSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models\Project;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    public function run()
    {
        Project::create([
            'name' => 'Sample Manufacturing Project',
            'description' => 'Test project for manufacturing sector',
            'sector' => 'EMR_MFG',
            'status' => 'active',
            'start_date' => now(),
            'client_name' => 'ABC Corporation',
            'pipeline_stage' => 'proposal',
            'contract_value_ngn' => 5000000,
            'contract_value_usd' => 3125,
            'deal_probability' => 'medium',
            'progress' => 35,
        ]);

        Project::create([
            'name' => 'Oil & Gas Pipeline',
            'description' => 'Major pipeline project',
            'sector' => 'EMR_OGP',
            'status' => 'active',
            'start_date' => now()->subDays(30),
            'client_name' => 'XYZ Energy',
            'pipeline_stage' => 'negotiation',
            'contract_value_ngn' => 25000000,
            'contract_value_usd' => 15625,
            'deal_probability' => 'high',
            'progress' => 60,
        ]);
    }
}
```

Run seeder:
```bash
php artisan db:seed --class=ProjectSeeder
```

## Testing

Test the endpoints:

```bash
# Get all projects
curl -X GET https://industry-flow-backend.onrender.com/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get stats
curl -X GET https://industry-flow-backend.onrender.com/api/projects/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

1. Deploy these files to your backend at `https://industry-flow-backend.onrender.com`
2. Run the migration to create the projects table
3. Optionally run the seeder to add sample data
4. The frontend will automatically start displaying the projects

## CORS Configuration

Make sure your backend has CORS enabled in `config/cors.php`:

```php
'paths' => ['api/*'],
'allowed_origins' => ['https://industry-flow-bd.vercel.app', 'http://localhost:5173'],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'credentials' => true,
```

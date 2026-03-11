<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ProjectController extends Controller
{
    /**
     * Get all projects
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Project::query();

            // Apply filters
            if ($request->has('sector') && $request->sector !== 'all') {
                $query->where('sector', $request->sector);
            }

            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->has('pipeline_stage') && $request->pipeline_stage !== 'all') {
                $query->where('pipeline_stage', $request->pipeline_stage);
            }

            if ($request->has('business_segment') && $request->business_segment !== 'all') {
                $query->where('business_segment', $request->business_segment);
            }

            if ($request->has('project_lead_id')) {
                $query->where('project_lead_id', $request->project_lead_id);
            }

            if ($request->has('assignee_id')) {
                $query->where('assignee_id', $request->assignee_id);
            }

            $projects = $query->withCount('tasks')->orderBy('created_at', 'desc')->get();

            Log::info('Projects fetched', ['count' => $projects->count()]);

            return response()->json($projects);
        } catch (\Exception $e) {
            Log::error('Failed to fetch projects', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
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

            $averageProgress = Project::where('status', 'active')->avg('progress') ?? 0;

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

            Log::info('Stats fetched', $stats);

            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Failed to fetch statistics', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
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
            $project = Project::withCount('tasks')->findOrFail($id);
            
            return response()->json([
                'data' => $project
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch project', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'error' => 'Project not found',
                'message' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create new project
     * Converts camelCase input from frontend to snake_case for database
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Convert camelCase to snake_case for validation
            $data = $request->all();
            $convertedData = $this->convertCamelCaseToSnakeCase($data);
            
            $validated = validator($convertedData, [
                'name' => 'required|string|max:255',
                'description' => 'required|string',
                'sector' => 'required|string',
                'status' => 'nullable|in:active,on-hold,completed',
                'start_date' => 'required|date',
                'end_date' => 'nullable|date',
                'client_name' => 'nullable|string',
                'client_contact' => 'nullable|string',
                'pipeline_stage' => 'nullable|string',
                'pipeline_intake_date' => 'nullable|date',
                'oem' => 'nullable|string',
                'location' => 'nullable|string',
                'expected_close_date' => 'nullable|date',
                'business_segment' => 'nullable|string',
                'product' => 'nullable|string',
                'sub_product' => 'nullable|string',
                'project_lead_id' => 'nullable|integer',
                'assignee_id' => 'nullable|integer',
                'channel_partner' => 'nullable|string',
                'contract_value_ngn' => 'nullable|numeric',
                'contract_value_usd' => 'nullable|numeric',
                'margin_percent_ngn' => 'nullable|numeric',
                'margin_percent_usd' => 'nullable|numeric',
                'margin_value_ngn' => 'nullable|numeric',
                'margin_value_usd' => 'nullable|numeric',
                'project_lead_comments' => 'nullable|string',
                'deal_probability' => 'nullable|string',
                'progress' => 'nullable|integer|min:0|max:100',
            ])->validate();

            $project = Project::create($validated);

            Log::info('Project created', ['id' => $project->id, 'name' => $project->name]);

            return response()->json([
                'data' => $project
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to create project', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to create project',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Convert camelCase keys to snake_case
     */
    private function convertCamelCaseToSnakeCase($data): array
    {
        $converted = [];
        
        foreach ($data as $key => $value) {
            // Convert camelCase to snake_case
            $snakeKey = strtolower(preg_replace('/([a-z])([A-Z])/', '$1_$2', $key));
            $converted[$snakeKey] = $value;
        }
        
        return $converted;
    }

    /**
     * Update project
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $project = Project::findOrFail($id);
            
            // Get all request data and filter out nulls if needed
            $data = $request->all();
            
            // Update the project
            $project->update($data);
            
            // Refresh to get updated data
            $project->refresh();

            Log::info('Project updated', ['id' => $project->id, 'name' => $project->name]);

            return response()->json([
                'data' => $project
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update project', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
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
            $projectName = $project->name;
            
            $project->delete();

            Log::info('Project deleted', ['id' => $id, 'name' => $projectName]);

            return response()->json([
                'message' => 'Project deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete project', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'error' => 'Failed to delete project',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}

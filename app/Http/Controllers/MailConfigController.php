<?php

namespace App\Http\Controllers;

use App\Models\MailConfig;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MailConfigController extends Controller
{
    /**
     * Get current mail configuration
     */
    public function show(): JsonResponse
    {
        try {
            $config = MailConfig::getConfig();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'from_email' => $config->from_email ?? '',
                    'from_name' => $config->from_name ?? 'Project Manager',
                    'reply_to_email' => $config->reply_to_email ?? '',
                    'notification_enabled' => $config->notification_enabled ?? false,
                    'smtp_host' => $config->smtp_host ?? '',
                    'smtp_port' => $config->smtp_port ?? 587,
                    'smtp_username' => $config->smtp_username ?? '',
                    'smtp_password' => $config->smtp_password ?? '',
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve mail configuration: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update mail configuration
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'from_email' => 'required|email',
                'from_name' => 'required|string|max:255',
                'reply_to_email' => 'nullable|email',
                'notification_enabled' => 'boolean',
                'smtp_host' => 'required|string|max:255',
                'smtp_port' => 'required|integer|between:1,65535',
                'smtp_username' => 'required|string|max:255',
                'smtp_password' => 'required|string',
            ]);

            $config = MailConfig::updateConfig($validated);

            return response()->json([
                'success' => true,
                'message' => 'Mail configuration updated successfully',
                'data' => $config
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update mail configuration: ' . $e->getMessage()
            ], 500);
        }
    }
}

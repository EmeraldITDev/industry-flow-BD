# Backend Integration - Copy-Paste Solution

**For:** Backend developers or server administrators  
**Time Required:** 10 minutes  
**Difficulty:** Easy  

Copy and paste the code below directly into your Laravel backend.

---

## Step 1: Create Model File

**Create file:** `app/Models/MailConfig.php`

Copy this entire content:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MailConfig extends Model
{
    protected $table = 'mail_configs';
    
    protected $fillable = [
        'from_email',
        'from_name',
        'reply_to_email',
        'notification_enabled',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
    ];

    protected $casts = [
        'notification_enabled' => 'boolean',
        'smtp_port' => 'integer',
    ];

    /**
     * Get the default or only mail config
     */
    public static function getConfig()
    {
        return self::first() ?? new self();
    }

    /**
     * Update or create the mail config
     */
    public static function updateConfig(array $data)
    {
        $config = self::first();
        
        if ($config) {
            $config->update($data);
        } else {
            $config = self::create($data);
        }
        
        return $config;
    }
}
```

---

## Step 2: Create Controller File

**Create file:** `app/Http/Controllers/MailConfigController.php`

Copy this entire content:

```php
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
```

---

## Step 3: Create Migration File

**Run this command in your backend terminal:**

```bash
php artisan make:migration create_mail_config_table
```

**Then replace the content of the generated file with this:**

`database/migrations/XXXX_XX_XX_XXXXXX_create_mail_config_table.php`

```php
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
```

---

## Step 4: Add Routes

**Open:** `routes/api.php`

**Find the line:** `Route::middleware('auth:sanctum')->group(function () {`

**Add these 2 routes inside that group:**

```php
Route::middleware('auth:sanctum')->group(function () {
    // ... your existing routes ...
    
    // Mail configuration endpoints (ADD THESE 2 LINES)
    Route::get('/mail/config', [App\Http\Controllers\MailConfigController::class, 'show']);
    Route::post('/mail/config', [App\Http\Controllers\MailConfigController::class, 'update']);
    
    // ... rest of your routes ...
});
```

**Or if you don't have `auth:sanctum` group yet, add this anywhere in api.php:**

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/mail/config', [\App\Http\Controllers\MailConfigController::class, 'show']);
    Route::post('/mail/config', [\App\Http\Controllers\MailConfigController::class, 'update']);
});
```

---

## Step 5: Run Migration

**In your backend terminal:**

```bash
php artisan migrate
```

**Expected output:**
```
Migration table created successfully.
Migrating: XXXX_XX_XX_XXXXXX_create_mail_config_table
Migrated:  XXXX_XX_XX_XXXXXX_create_mail_config_table (0.XX seconds)
```

---

## Step 6: Deploy

**Commit and push your changes:**

```bash
git add app/Models/MailConfig.php
git add app/Http/Controllers/MailConfigController.php
git add database/migrations/*create_mail_config_table.php
git add routes/api.php

git commit -m "Add mail configuration endpoints for email notifications"

git push origin main
```

**Wait 2-3 minutes for Render to auto-deploy.**

---

## Step 7: Test the Endpoints

### Test GET endpoint:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://industry-flow-backend.onrender.com/api/mail/config
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "from_email": "",
    "from_name": "Project Manager",
    "reply_to_email": "",
    "notification_enabled": false,
    "smtp_host": "",
    "smtp_port": 587,
    "smtp_username": "",
    "smtp_password": ""
  }
}
```

### Test POST endpoint:

```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from_email": "test@example.com",
    "from_name": "Test User",
    "reply_to_email": "reply@example.com",
    "notification_enabled": true,
    "smtp_host": "smtp.office365.com",
    "smtp_port": 587,
    "smtp_username": "test@example.com",
    "smtp_password": "password123"
  }' \
  https://industry-flow-backend.onrender.com/api/mail/config
```

**Expected response:**
```json
{
  "success": true,
  "message": "Mail configuration updated successfully",
  "data": {
    "id": 1,
    "from_email": "test@example.com",
    "from_name": "Test User",
    "reply_to_email": "reply@example.com",
    "notification_enabled": true,
    "smtp_host": "smtp.office365.com",
    "smtp_port": 587,
    "smtp_username": "test@example.com",
    "smtp_password": "password123",
    "created_at": "2026-01-29T...",
    "updated_at": "2026-01-29T..."
  }
}
```

---

## Step 8: Frontend Test

**In the frontend app:**

1. Go to Settings → Email
2. Fill in your SMTP configuration:
   - **From Email:** your@email.com
   - **From Name:** Your Name
   - **SMTP Host:** smtp.office365.com
   - **SMTP Port:** 587
   - **SMTP Username:** your@email.com
   - **SMTP Password:** your-app-password

3. Click "Save Settings"

**Expected result:** ✅ Toast says "Mail settings saved successfully!"

4. Refresh the page

**Expected result:** ✅ Settings are still there (not lost)

---

## Troubleshooting

### Still getting 404?

Check that routes were added to `routes/api.php`:
```bash
grep -n "mail/config" routes/api.php
```

Should output 2 lines with your routes.

### Getting validation error (422)?

Check that all required fields are being sent:
- from_email (required, must be email)
- from_name (required, max 255 chars)
- smtp_host (required, max 255 chars)
- smtp_port (required, integer 1-65535)
- smtp_username (required, max 255 chars)
- smtp_password (required, any string)

Optional fields:
- reply_to_email (optional, must be email if provided)
- notification_enabled (optional, boolean)

### Getting 500 error?

Check Laravel logs:
```bash
tail -f storage/logs/laravel.log
```

Look for the error and fix the issue in the controller.

### Database table not created?

Verify migration ran:
```bash
php artisan migrate:status
```

If not showing as migrated, run:
```bash
php artisan migrate
```

---

## Summary

✅ **Files Created:** 2 (Model + Controller)
✅ **Files Modified:** 2 (Migration created + routes.api.php updated)
✅ **Database Changes:** 1 new table (mail_configs)
✅ **API Endpoints Added:** 2 (GET and POST /api/mail/config)
✅ **Time Required:** 10 minutes
✅ **Difficulty:** Easy

**After completing these steps, the email notification system will be 100% functional!**

---

## Questions?

- 📖 See `EMAIL_SYSTEM_STATUS.md` for full overview
- 🔗 See `BACKEND_INTEGRATION_URGENT.md` for detailed info
- 📋 See `MAIL_NOTIFICATIONS_SETUP.md` for email sending implementation

Good luck! 🚀

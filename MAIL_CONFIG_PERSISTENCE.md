# Mail Configuration Persistence - Laravel Backend Setup

## Problem
The email notification settings aren't being saved to the backend. When you refresh the page, settings revert to defaults.

## Solution
Implement backend endpoints to save and retrieve mail configuration.

---

## 🔧 Step 1: Create Database Migration

```bash
php artisan make:migration create_mail_config_table
```

Edit `database/migrations/XXXX_XX_XX_XXXXXX_create_mail_config_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mail_configs', function (Blueprint $table) {
            $table->id();
            $table->string('from_email')->nullable();
            $table->string('from_name')->nullable();
            $table->string('reply_to_email')->nullable();
            $table->boolean('notification_enabled')->default(false);
            $table->string('smtp_host')->nullable();
            $table->integer('smtp_port')->nullable();
            $table->string('smtp_username')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_configs');
    }
};
```

Run migration:
```bash
php artisan migrate
```

---

## 🔧 Step 2: Create Model

```bash
php artisan make:model MailConfig
```

Edit `app/Models/MailConfig.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MailConfig extends Model
{
    protected $fillable = [
        'from_email',
        'from_name',
        'reply_to_email',
        'notification_enabled',
        'smtp_host',
        'smtp_port',
        'smtp_username',
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

## 🔧 Step 3: Create Controller

```bash
php artisan make:controller MailConfigController --api
```

Edit `app/Http/Controllers/MailConfigController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\MailConfig;
use Illuminate\Http\Request;

class MailConfigController extends Controller
{
    /**
     * GET /api/mail/config
     * Get mail configuration
     */
    public function show()
    {
        $config = MailConfig::getConfig();
        
        return response()->json([
            'success' => true,
            'data' => $config,
        ]);
    }

    /**
     * POST /api/mail/config
     * Update mail configuration (admin only)
     */
    public function update(Request $request)
    {
        // Check if user is admin
        if (!auth()->user() || !auth()->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $validated = $request->validate([
            'from_email' => 'required|email',
            'from_name' => 'required|string|max:255',
            'reply_to_email' => 'nullable|email',
            'notification_enabled' => 'boolean',
            'smtp_host' => 'nullable|string',
            'smtp_port' => 'nullable|integer',
            'smtp_username' => 'nullable|string',
        ]);

        try {
            $config = MailConfig::updateConfig($validated);

            // Update Laravel config in memory
            config([
                'mail.from.address' => $config->from_email,
                'mail.from.name' => $config->from_name,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Mail configuration updated successfully',
                'data' => $config,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update mail configuration: ' . $e->getMessage(),
            ], 500);
        }
    }
}
```

---

## 🔧 Step 4: Create Routes

Edit `routes/api.php`:

```php
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MailConfigController;

// ... existing routes ...

Route::middleware('auth:sanctum')->group(function () {
    // Mail configuration endpoints
    Route::get('/mail/config', [MailConfigController::class, 'show']);
    Route::post('/mail/config', [MailConfigController::class, 'update']);
    
    // ... other authenticated routes ...
});
```

---

## 🔧 Step 5: Add Admin Check Helper (if needed)

If your User model doesn't have an `isAdmin()` method, add it:

```php
// In app/Models/User.php

public function isAdmin(): bool
{
    return $this->role === 'admin' || $this->access_level === 'admin';
}
```

---

## ✅ Testing

### 1. Get Current Config
```bash
curl -X GET http://localhost/api/mail/config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "from_email": "noreply@company.com",
    "from_name": "Industry Flow",
    "reply_to_email": null,
    "notification_enabled": true,
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_username": "your-email@gmail.com",
    "created_at": "2026-01-29T...",
    "updated_at": "2026-01-29T..."
  }
}
```

### 2. Save Config
```bash
curl -X POST http://localhost/api/mail/config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from_email": "noreply@company.com",
    "from_name": "Industry Flow",
    "notification_enabled": true,
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_username": "email@gmail.com"
  }'
```

### 3. Test via UI
1. Go to Settings → Email
2. Change a setting
3. Click "Save Settings"
4. Should see success message
5. Refresh page
6. Settings should persist

---

## 🔍 Troubleshooting

### Settings not saving?
1. Check browser console (F12) for errors
2. Check Laravel logs: `tail storage/logs/laravel.log`
3. Verify POST request reaches backend: Add logging to controller
4. Verify user is authenticated: Check Authorization header

### 401 Unauthorized error?
- Ensure user is logged in
- Check token is being sent: `Authorization: Bearer {token}`
- Verify token is valid and not expired

### 403 Forbidden error?
- Check user has admin role
- Verify `isAdmin()` method returns true for your user
- Check access_level or role field in users table

### Database errors?
- Run: `php artisan migrate`
- Check database connection in `.env`
- Verify `mail_configs` table exists: `php artisan tinker` then `DB::table('mail_configs')->get()`

---

## 📝 Alternative: Store in Config Cache

If you don't want a database table, store in cache instead:

```php
// In controller
public function show()
{
    $config = [
        'from_email' => config('mail.from.address'),
        'from_name' => config('mail.from.name'),
        'notification_enabled' => config('mail.notifications_enabled', false),
    ];
    
    return response()->json(['success' => true, 'data' => $config]);
}

public function update(Request $request)
{
    // Write to config cache or .env
    // Note: This is less ideal for production
    
    $config = $request->all();
    cache()->put('mail_config', $config);
    
    return response()->json(['success' => true, 'data' => $config]);
}
```

**Note:** Database approach is recommended for production.

---

## 📊 Summary

After implementing this:

✅ Settings will be saved to database  
✅ Settings will persist after refresh  
✅ Admin can configure all mail options  
✅ Configuration validated before save  
✅ Admin-only access enforced  

The frontend will now properly save and retrieve mail configuration from your Laravel backend.

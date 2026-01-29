# ⚡ Fix Mail Settings Persistence - 10 Minute Setup

The issue: Mail settings aren't being saved to the database, so they reset when you refresh.

**Solution Time:** 10 minutes

---

## 🔧 Quick Setup (Copy-Paste)

### Step 1: Create Migration (1 min)
```bash
php artisan make:migration create_mail_config_table
```

Paste into the new migration file:
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

Run:
```bash
php artisan migrate
```

### Step 2: Create Model (2 min)
```bash
php artisan make:model MailConfig
```

Paste into `app/Models/MailConfig.php`:
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

    public static function getConfig()
    {
        return self::first() ?? new self();
    }

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

### Step 3: Create Controller (3 min)
```bash
php artisan make:controller MailConfigController --api
```

Paste into `app/Http/Controllers/MailConfigController.php`:
```php
<?php

namespace App\Http\Controllers;

use App\Models\MailConfig;
use Illuminate\Http\Request;

class MailConfigController extends Controller
{
    public function show()
    {
        $config = MailConfig::getConfig();
        return response()->json(['success' => true, 'data' => $config]);
    }

    public function update(Request $request)
    {
        // Check admin access
        if (!auth()->user() || !$this->isAdmin(auth()->user())) {
            return response()->json([
                'success' => false,
                'message' => 'Admin access required',
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
            return response()->json([
                'success' => true,
                'message' => 'Mail configuration updated',
                'data' => $config,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function isAdmin($user): bool
    {
        return $user->role === 'admin' || 
               $user->access_level === 'admin' || 
               ($user->is_admin ?? false);
    }
}
```

### Step 4: Add Routes (2 min)
Add this to `routes/api.php` in the `middleware('auth:sanctum')` group:

```php
Route::get('/mail/config', [MailConfigController::class, 'show']);
Route::post('/mail/config', [MailConfigController::class, 'update']);
```

---

## ✅ Done!

Now test:
1. Go to **Settings → Email**
2. **Enable Notifications** toggle ON
3. Fill in: **From Email** and **From Name**
4. Click **Save Settings**
5. You should see a **success message**
6. **Refresh the page** (F5)
7. Settings should **still be there** ✅

---

## 🧪 If it's Still Not Working

Check the browser console (F12):
```
Look for [MailNotificationSettings] Config saved successfully log
or error message
```

Check Laravel logs:
```bash
tail -f storage/logs/laravel.log
```

Common issues:
- ❌ 403 error → User is not admin
- ❌ 404 error → Routes not added
- ❌ 500 error → Check Laravel logs
- ❌ No response → Check network tab (F12 → Network)

---

## 📝 Files to Reference

For detailed explanation, see: `MAIL_CONFIG_PERSISTENCE.md`

---

**That's it! Mail settings will now save and persist.** 🎉

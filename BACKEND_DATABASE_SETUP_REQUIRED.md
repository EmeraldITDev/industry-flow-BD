# Backend Database Setup - Required to Show Contract/PO Values

## Critical: This MUST be done for contract values to appear

The frontend is 100% ready to display contract/PO values. However, the **backend database must be set up** first.

---

## Where to Run These Commands

### Option A: Render Dashboard (Recommended)

1. Go to https://dashboard.render.com
2. Find your backend service
3. Click it → Select **"Shell"** tab
4. Run commands in the shell

### Option B: SSH to Your Server

```bash
ssh your-server-connection
cd /path/to/backend
```

### Option C: Local Development

```bash
cd /path/to/backend
php artisan migrate
php artisan db:seed --class=ProjectSeeder
```

---

## Step 1: Run Migrations

This creates all the database tables and columns needed for financial data:

```bash
php artisan migrate
```

**Expected Output:**
```
Migrating: 2026_01_29_000000_create_mail_config_table
Migrated:  2026_01_29_000000_create_mail_config_table (xxx ms)
Migrating: 2026_01_30_000001_create_projects_table
Migrated:  2026_01_30_000001_create_projects_table (xxx ms)
...
```

**What This Does:**
- ✅ Creates `projects` table with financial columns
- ✅ Creates `mail_configs` table for email settings
- ✅ Sets up all indexes for performance

---

## Step 2: Seed Sample Data

This creates 7 sample projects with populated contract values:

```bash
php artisan db:seed --class=ProjectSeeder
```

**Expected Output:**
```
Seeding: ProjectSeeder
Successfully seeded 7 projects!
Database seeding completed successfully.
```

**What This Creates:**
- Manufacturing Equipment Upgrade (₦12.5M / $7,812)
- Oil & Gas Pipeline Inspection (₦45.0M / $28,125)
- Healthcare IT Infrastructure (₦8.75M / $5,468)
- Renewable Energy Installation (₦16.0M / $10,000)
- Corporate IT Services (₦24.0M / $15,000)
- Trading Platform Development (₦32.0M / $20,000)
- Business Development Services (₦6.4M / $4,000)

**Total Contract Value: ₦144.65M / $91,406**

All with status = **"active"** so they appear on dashboard.

---

## Step 3: Verify Setup

Run this command to confirm financial data exists:

```bash
php artisan tinker
```

Then type:
```php
>>> DB::table('projects')->count()
// Should return 7

>>> DB::table('projects')->sum('contract_value_ngn')
// Should return 144650000

>>> Project::where('status', 'active')->count()
// Should return 7

>>> exit
```

If all checks pass ✅ → Go to frontend and check dashboard!

---

## What Happens Next (Frontend)

Once database is ready, the frontend will:

1. **Automatically fetch** projects from `/api/projects`
2. **Normalize** snake_case (backend) to camelCase (frontend)
3. **Display in Dashboard:**
   - Stat cards showing total contract values
   - "Active Projects" card listing projects with values
   - Revenue analytics showing breakdown by sector, lead, client
   - All currency conversions (NGN ↔ USD) handled automatically

---

## Troubleshooting Database Setup

### Error: "SQLSTATE[HY000]: General error: 1030"

**Cause:** Database server connection issue

**Fix:**
- Verify `.env` file has correct database credentials
- Check database server is running and accessible
- For Render: Check DATABASE_URL is correct

---

### Error: "Class ProjectSeeder does not exist"

**Cause:** Seeder file not in right place

**Check:**
- File must be: `database/seeders/ProjectSeeder.php`
- Namespace must be: `Database\Seeders`
- Run: `composer dump-autoload` then retry

---

### Migration Already Run But Still No Data

**Solution:** Run seeder specifically:
```bash
php artisan db:seed --class=ProjectSeeder
```

Or seed everything:
```bash
php artisan db:seed
```

---

### Need to Reset Database (CAREFUL!)

⚠️ **This will DELETE all data!**

```bash
php artisan migrate:reset
php artisan migrate
php artisan db:seed
```

---

## After Setup: Verify in Frontend

1. Open Dashboard
2. Look for **"Active Projects"** card (bottom left)
3. You should see:
   ```
   📌 Manufacturing Equipment Upgrade
      Value: ₦12.5M (or $7.8K in USD)
      Margin: ₦3.1M
      Progress: 65%
   ```
4. If not visible → Check browser console and run diagnostic

---

## Commands Quick Reference

```bash
# Check migrations are ready
php artisan migrate --help

# Run all pending migrations
php artisan migrate

# See migration status
php artisan migrate:status

# Seed database with sample projects
php artisan db:seed --class=ProjectSeeder

# Verify in tinker shell
php artisan tinker
>>> Project::count()

# If needed: Reset everything (CAREFUL!)
php artisan migrate:reset
php artisan migrate
php artisan db:seed
```

---

## Success Indicators ✅

After completing migrations and seeding, you should see:

- [ ] No errors when running `php artisan migrate`
- [ ] No errors when running `php artisan db:seed`
- [ ] `Project::count()` returns 7 in tinker
- [ ] Dashboard shows "Active Projects" section
- [ ] Projects list shows contract values
- [ ] Stat cards show portfolio totals

---

## Important: Encryption Keys

If you see "No supported encrypter found", run:
```bash
php artisan key:generate
```

This generates APP_KEY in `.env` needed for the app to run.

---

## Need Help?

Check your backend server logs:
- Render: Check **Logs** tab in your service
- Local/SSH: Check `storage/logs/laravel.log`

Common log issues:
- Database connection failed
- Encryption key missing
- Migration file syntax error


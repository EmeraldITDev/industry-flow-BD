# Fix Contract/PO Values Not Appearing on Dashboard

## Quick Diagnostics

Before implementing fixes, determine the root cause:

### Step 1: Run Diagnostic in Browser Console

1. Open Dashboard page
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Copy and paste the entire content of `verify-backend-financial-data.js`
5. Press Enter and watch the output

The diagnostic will tell you exactly what's wrong.

---

## Common Issues & Fixes

### Issue 1: "No projects returned! Database might be empty or not seeded."

**Cause:** Backend database has no projects at all

**Fix (Run on Backend Server):**
```bash
php artisan db:seed --class=ProjectSeeder
```

This creates 7 sample projects with full financial data.

---

### Issue 2: "Projects exist but have NO financial data"

**Cause:** The database columns don't exist OR projects were created before migrations

**Fix (Run on Backend Server):**
```bash
# First, run migrations to create columns
php artisan migrate

# Then, seed sample data
php artisan db:seed --class=ProjectSeeder
```

**Alternative (for existing projects without data):**
- Go to **Projects** page in frontend
- Click on any project
- Edit and add contract values
- Save → Data will persist to backend

---

### Issue 3: "Projects with values exist but none are ACTIVE"

**Cause:** All projects have status "on-hold" or "completed"

**Fix:** 
- Go to **Projects** page
- Edit each project  
- Change **Status** to "Active"
- Save

Or run on backend:
```php
<?php
// In Laravel tinker or a script
DB::table('projects')->update(['status' => 'active']);
```

---

### Issue 4: "PERFECT! Backend has data... still not showing?"

**Cause:** Frontend cache or display issue

**Fix:**
1. **Hard refresh browser:** Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Check console errors:** Look for red errors in F12 Console
3. **Verify currency selector:** Top right of dashboard - ensure NGN or USD is selected
4. **Check localStorage:** Sometimes old preferences interfere
   ```javascript
   localStorage.clear(); // In console, then refresh page
   ```

---

## For Backend Administrators

### Full Setup Checklist

If setting up a fresh backend server:

1. **Create/Update Migration Files**
   - ✅ Ensure `database/migrations/2026_01_30_000001_create_projects_table.php` exists
   - ✅ Includes all financial columns: `contract_value_ngn`, `contract_value_usd`, etc.

2. **Create Models**
   - ✅ `app/Models/Project.php` with all fillable fields

3. **Create Controller**
   - ✅ `app/Http/Controllers/ProjectController.php`

4. **Create Seeder**
   - ✅ `database/seeders/ProjectSeeder.php`

5. **Run Setup Commands**
   ```bash
   # Create tables in database
   php artisan migrate
   
   # Load sample data with financial values
   php artisan db:seed --class=ProjectSeeder
   
   # Verify
   php artisan tinker
   >>> Project::count()           # Should return 7
   >>> Project::sum('contract_value_ngn')  # Should return 144650000
   ```

---

## Expected Dashboard Behavior

### After Fixes Applied ✅

The **Dashboard** should show:

1. **Stat Cards at Top**
   - Total Portfolio Value (in selected currency)
   - Total Won Deals
   - Active Pipeline Value
   
2. **Active Projects Card (bottom left)**
   - Lists projects with status = "active"
   - Shows for each:
     - Project name
     - Status badge
     - **Contract Value:** ₦12.5M (or equivalent in USD)
     - **Margin:** ₦3.1M
     - Progress bar
     
3. **Revenue Analytics**
   - Shows revenue by sales lead, customer, segment
   - Revenue totals should match stat cards

### Sample Output

```
Active Projects
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Manufacturing Equipment Upgrade
   Status: active
   Value: ₦12.5M
   Margin: ₦3.1M
   Progress: 65%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Oil & Gas Pipeline Inspection
   Status: active
   Value: ₦45.0M
   Margin: ₦13.5M
   Progress: 45%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Troubleshooting

| Issue | Check | Fix |
|-------|-------|-----|
| Contract values show as "$0" or "₦0" | Is NGN_PER_USD in `.env` set? | Set to `1600` in frontend `.env` |
| Still seeing old data | Browser cache | Hard refresh: `Ctrl+Shift+R` |
| Variables show correctly in console but not in UI | React state not updating | Check RecentProjects component is mounted |
| API returns 401 | Authentication | Check Bearer token / API key |
| API returns 404 | Wrong endpoint | Verify `VITE_API_BASE_URL` in `.env` |

---

## Manual Test (If Backend Issues)

### Create a test project via API

```bash
curl -X POST https://industry-flow-backend.onrender.com/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Project",
    "description": "Test with financial data",
    "sector": "EMR_MFG",
    "status": "active",
    "start_date": "2026-03-01",
    "contract_value_ngn": 10000000,
    "contract_value_usd": 6250,
    "margin_percent_ngn": 25,
    "margin_percent_usd": 25
  }'
```

Then check Dashboard → it should appear in Active Projects with the contract value!

---

## Next Steps

1. **Run the diagnostic** script in browser console
2. **Follow the specific fix** for your issue
3. **Hard refresh** the dashboard
4. **Verify** contract values appear in Active Projects card
5. **Check other cards** are showing financial totals

Done! 🎉

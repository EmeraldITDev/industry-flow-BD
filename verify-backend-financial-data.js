/**
 * Diagnostic Script: Verify Backend Financial Data
 * 
 * This script checks if the backend API is returning contract/PO values correctly.
 * It helps identify where the issue is: Frontend, API, or Database.
 * 
 * Usage:
 * 1. Open your browser console (F12)
 * 2. Copy-paste this entire script
 * 3. Run it and check the output
 */

console.log('🔍 BACKEND FINANCIAL DATA DIAGNOSTIC\n');

const API_URL = 'https://industry-flow-backend.onrender.com/api/projects';
const NGN_PER_USD = 1600; // From .env

async function diagnoseBackend() {
  try {
    console.log('📡 Fetching projects from:', API_URL);
    
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    console.log(`\n✓ API Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error Details:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n📦 Raw API Response Structure:', data);

    // Parse response based on pagination
    let projects = [];
    if (Array.isArray(data)) {
      projects = data;
    } else if (Array.isArray(data?.data)) {
      projects = data.data;
    } else if (Array.isArray(data?.results)) {
      projects = data.results;
    } else if (Array.isArray(data?.projects)) {
      projects = data.projects;
    }

    console.log(`\n📊 Total Projects Found: ${projects.length}`);

    if (projects.length === 0) {
      console.warn('⚠️  No projects returned! Database might be empty or not seeded.');
      return;
    }

    // Analyze first project
    const first = projects[0];
    console.log('\n🔬 First Project Sample:');
    console.log({
      id: first.id,
      name: first.name,
      contract_value_ngn: first.contract_value_ngn,
      contractValueNGN: first.contractValueNGN,
      contract_value_usd: first.contract_value_usd,
      contractValueUSD: first.contractValueUSD,
      status: first.status,
    });

    // Count projects with financial data
    const withFinancialData = projects.filter(p => {
      const ngn = parseFloat(p.contract_value_ngn ?? p.contractValueNGN ?? 0) || 0;
      const usd = parseFloat(p.contract_value_usd ?? p.contractValueUSD ?? 0) || 0;
      return ngn > 0 || usd > 0;
    });

    console.log(`\n💰 Projects with Contract Values: ${withFinancialData.length} / ${projects.length}`);

    if (withFinancialData.length > 0) {
      console.log('✅ GOOD: Financial data is in the database!');
      console.log('\nProjects with values:');
      withFinancialData.slice(0, 3).forEach(p => {
        const ngn = parseFloat(p.contract_value_ngn ?? p.contractValueNGN ?? 0) || 0;
        const usd = parseFloat(p.contract_value_usd ?? p.contractValueUSD ?? 0) || 0;
        console.log(`  • ${p.name}: ₦${ngn.toLocaleString()} / $${usd.toLocaleString()}`);
      });
    } else {
      console.warn('❌ PROBLEM: No projects have contract values!');
      console.warn('This means either:');
      console.warn('  1. Backend database migration not run (missing columns)');
      console.warn('  2. Seeder not executed (no sample data)');
      console.warn('  3. Projects created before financial fields existed');
    }

    // Check for camelCase vs snake_case
    const usesSnakeCase = first.contract_value_ngn !== undefined;
    const usesCamelCase = first.contractValueNGN !== undefined;

    console.log(`\n🔤 Field Name Format:`);
    console.log(`  Snake Case (contract_value_ngn): ${usesSnakeCase ? '✅ Yes' : '❌ No'}`);
    console.log(`  Camel Case (contractValueNGN): ${usesCamelCase ? '✅ Yes' : '❌ No'}`);

    // Active projects check
    const activeProjects = projects.filter(p => p.status === 'active');
    console.log(`\n📌 Active Projects: ${activeProjects.length} / ${projects.length}`);
    
    if (activeProjects.length === 0) {
      console.warn('⚠️  No active projects! Dashboard "Active Projects" card will be empty.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSIS SUMMARY:');
    console.log('='.repeat(60));
    
    if (projects.length === 0) {
      console.log('❌ Backend has NO projects at all');
      console.log('FIX: Run: php artisan db:seed --class=ProjectSeeder');
    } else if (withFinancialData.length === 0) {
      console.log('❌ Projects exist but have NO financial data');
      console.log('FIX: Either:');
      console.log('  1. Run migration: php artisan migrate');
      console.log('  2. Run seeder: php artisan db:seed');
      console.log('  3. Edit projects to add contract values');
    } else if (activeProjects.length === 0) {
      console.log('⚠️  Projects with values exist but none are ACTIVE');
      console.log('FIX: Edit projects to set status = "active"');
    } else {
      console.log('✅ PERFECT! Backend has active projects with contract values');
      console.log('Frontend should be displaying them now.');
      console.log('If still not showing:');
      console.log('  1. Hard refresh browser (Ctrl+Shift+R)');
      console.log('  2. Check browser console for errors');
      console.log('  3. Check currency settings (USD vs NGN)');
    }

  } catch (error) {
    console.error('🔥 Error during diagnosis:', error);
    console.error('\nPossible causes:');
    console.error('  1. API URL is wrong');
    console.error('  2. Backend server is down');
    console.error('  3. CORS issues (check Network tab)');
    console.error('  4. Authentication required');
  }
}

// Run diagnosis
diagnoseBackend();

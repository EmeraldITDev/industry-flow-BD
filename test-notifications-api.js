/**
 * Quick test script to verify notifications API endpoints
 * 
 * Usage:
 * 1. Get your auth token from the browser (localStorage.getItem('authToken'))
 * 2. Update the BASE_URL and TOKEN below
 * 3. Run: node test-notifications-api.js
 */

const BASE_URL = 'https://industry-flow-backend.onrender.com'; // Update this
const TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Get this from browser localStorage

const endpoints = [
  {
    name: 'Get All Notifications',
    method: 'GET',
    url: `${BASE_URL}/api/notifications`,
  },
  {
    name: 'Get Unread Count',
    method: 'GET',
    url: `${BASE_URL}/api/notifications/unread-count`,
  },
];

async function testEndpoint(endpoint) {
  try {
    console.log(`\n🧪 Testing: ${endpoint.name}`);
    console.log(`   ${endpoint.method} ${endpoint.url}`);
    
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const status = response.status;
    const statusText = response.statusText;
    
    console.log(`   Status: ${status} ${statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText}`);
      return { success: false, status, error: errorText };
    }

    const data = await response.json();
    console.log(`   ✅ Success!`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    return { success: true, status, data };
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('📋 Testing Notifications API Endpoints');
  console.log('='.repeat(50));
  
  if (TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
    console.error('\n❌ Please update the TOKEN variable with your actual auth token!');
    console.log('   You can get it from browser console: localStorage.getItem("authToken")');
    process.exit(1);
  }

  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push({ endpoint: endpoint.name, ...result });
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`   ${icon} ${result.endpoint}: ${result.success ? `Status ${result.status}` : result.error}`);
  });
}

// Run tests
runTests().catch(console.error);

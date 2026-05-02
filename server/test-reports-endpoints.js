const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TOKEN = 'your-admin-token-here'; // You'll need to get this from localStorage

const endpoints = [
  // Overview
  { name: 'Overview', url: '/api/reports/overview?range=30d' },
  { name: 'Sales Trend', url: '/api/reports/sales-trend?range=30d&granularity=day' },
  { name: 'Category Breakdown', url: '/api/reports/category-breakdown?range=30d' },
  { name: 'Payment Mix', url: '/api/reports/payment-mix?range=30d' },
  { name: 'Order Type Mix', url: '/api/reports/order-type-mix?range=30d' },
  
  // Sales
  { name: 'Hourly Load', url: '/api/reports/hourly-load?range=30d' },
  { name: 'Discounts', url: '/api/reports/discounts?range=30d' },
  
  // Products
  { name: 'Top Items', url: '/api/reports/top-items?range=30d&metric=revenue&limit=30' },
  { name: 'Slow Movers', url: '/api/reports/slow-movers?range=30d&limit=20' },
  
  // Customers
  { name: 'Customers', url: '/api/reports/customers?range=30d&limit=25' },
  
  // Operations
  { name: 'Heatmap', url: '/api/reports/heatmap?range=30d' },
  { name: 'Table Performance', url: '/api/reports/table-performance?range=30d' },
  { name: 'Staff Activity', url: '/api/reports/staff-activity?range=30d' },
  
  // Inventory
  { name: 'Inventory Valuation', url: '/api/reports/inventory-valuation' },
  
  // P&L
  { name: 'Profit & Loss', url: '/api/reports/profit-loss?range=30d' },
  { name: 'P&L Trend', url: '/api/reports/profit-loss-trend?range=30d' },
  
  // Expenses
  { name: 'Expenses', url: '/api/reports/expenses?range=30d' },
  { name: 'Expense Categories', url: '/api/reports/expense-categories?range=30d' },
  
  // Data Check
  { name: 'Data Check', url: '/api/reports/data-check' },
];

async function testEndpoint(endpoint) {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeout: 5000
    });
    console.log(`✅ ${endpoint.name}: ${response.status}`);
    return { ...endpoint, status: 'OK', code: response.status };
  } catch (error) {
    const status = error.response?.status || 'ERROR';
    const message = error.response?.data?.error || error.message;
    console.log(`❌ ${endpoint.name}: ${status} - ${message}`);
    return { ...endpoint, status: 'FAIL', code: status, error: message };
  }
}

async function testAll() {
  console.log('🧪 Testing all report endpoints...\n');
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }
  
  console.log('\n📊 Summary:');
  const passed = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed endpoints:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
}

testAll().catch(console.error);

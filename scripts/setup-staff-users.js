#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Setup script to create default staff users for all roles
function setupStaffUsers() {
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Default staff credentials for each role
    const staffCredentials = {
      // Manager
      MANAGER_USERNAME: 'manager',
      MANAGER_PASSWORD: 'Manager2024!',
      
      // Chef
      CHEF_USERNAME: 'chef',
      CHEF_PASSWORD: 'Chef2024!',
      
      // Waiter
      WAITER_USERNAME: 'waiter',
      WAITER_PASSWORD: 'Waiter2024!',
      
      // Cashier
      CASHIER_USERNAME: 'cashier',
      CASHIER_PASSWORD: 'Cashier2024!'
    };
    
    let updated = false;
    
    // Add missing staff credentials
    Object.entries(staffCredentials).forEach(([key, value]) => {
      if (!envContent.includes(`${key}=`)) {
        envContent += `\n${key}=${value}`;
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Staff credentials configured:');
      console.log('Manager - Username: manager, Password: Manager2024!');
      console.log('Chef - Username: chef, Password: Chef2024!');
      console.log('Waiter - Username: waiter, Password: Waiter2024!');
      console.log('Cashier - Username: cashier, Password: Cashier2024!');
    } else {
      console.log('✅ Staff credentials already configured');
    }
  } catch (error) {
    console.error('❌ Error setting up staff credentials:', error.message);
  }
}

setupStaffUsers();

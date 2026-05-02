#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Setup script to ensure admin credentials are always configured
function setupAdmin() {
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Check if admin credentials exist
    const hasAdminUsername = envContent.includes('ADMIN_USERNAME=');
    const hasAdminPassword = envContent.includes('ADMIN_PASSWORD=');
    
    if (!hasAdminUsername || !hasAdminPassword) {
      console.log('🔧 Setting up admin credentials...');
      
      if (!hasAdminUsername) {
        envContent += '\nADMIN_USERNAME=admin';
      }
      if (!hasAdminPassword) {
        envContent += '\nADMIN_PASSWORD=FoodZone2024!';
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Admin credentials configured');
      console.log('Username: admin');
      console.log('Password: FoodZone2024!');
    } else {
      console.log('✅ Admin credentials already configured');
    }
  } catch (error) {
    console.error('❌ Error setting up admin credentials:', error.message);
  }
}

setupAdmin();

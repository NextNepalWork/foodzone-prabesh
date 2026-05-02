const bcrypt = require('bcrypt');

async function generateAdminHash() {
  const password = process.env.ADMIN_PASSWORD || 'FoodZone2024!';
  const saltRounds = 12;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Generated admin password hash:');
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log('\nAdd this to your .env file and remove ADMIN_PASSWORD for security.');
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateAdminHash();

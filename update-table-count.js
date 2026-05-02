// Quick script to update table count
// Run this in the browser console while logged into admin panel

async function updateTableCount(newCount) {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    console.error('❌ Not logged in as admin. Please login first.');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        items: [
          { key: 'tables.table_count', value: newCount }
        ]
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Table count updated to:', newCount);
      console.log('🔄 Refresh the page to see changes');
      return data;
    } else {
      console.error('❌ Failed to update:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Update to 30 tables (or any number you want)
updateTableCount(30);

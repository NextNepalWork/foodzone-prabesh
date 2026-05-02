const axios = require('axios');

// Test delivery orders data
const deliveryOrders = [
  {
    customer_name: 'John Smith',
    phone: '+977-9841234567',
    address: 'Thamel, Kathmandu',
    items: [
      { name: 'Chicken Momo', price: 250, quantity: 2 },
      { name: 'Fried Rice', price: 180, quantity: 1 }
    ],
    total: 680,
    order_type: 'delivery'
  },
  {
    customer_name: 'Sarah Johnson',
    phone: '+977-9851234568',
    address: 'Baneshwor, Kathmandu',
    items: [
      { name: 'Dal Bhat', price: 120, quantity: 1 },
      { name: 'Chicken Curry', price: 200, quantity: 1 },
      { name: 'Lassi', price: 80, quantity: 2 }
    ],
    total: 480,
    order_type: 'delivery'
  },
  {
    customer_name: 'Mike Wilson',
    phone: '+977-9861234569',
    address: 'Lalitpur, Patan',
    items: [
      { name: 'Pizza Margherita', price: 450, quantity: 1 },
      { name: 'Coke', price: 50, quantity: 2 }
    ],
    total: 550,
    order_type: 'delivery'
  },
  {
    customer_name: 'Emma Davis',
    phone: '+977-9871234570',
    address: 'Bhaktapur Durbar Square',
    items: [
      { name: 'Buff Sekuwa', price: 320, quantity: 1 },
      { name: 'Chatamari', price: 150, quantity: 2 },
      { name: 'Local Beer', price: 200, quantity: 1 }
    ],
    total: 820,
    order_type: 'delivery'
  },
  {
    customer_name: 'David Brown',
    phone: '+977-9881234571',
    address: 'Kirtipur, Kathmandu',
    items: [
      { name: 'Thukpa', price: 180, quantity: 1 },
      { name: 'Chowmein', price: 160, quantity: 1 },
      { name: 'Tea', price: 30, quantity: 2 }
    ],
    total: 400,
    order_type: 'delivery'
  }
];

async function createTestOrders() {
  const baseURL = 'http://localhost:3002';
  
  // First, let's try to authenticate as admin
  try {
    const authResponse = await axios.post(`${baseURL}/api/staff/auth`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = authResponse.data.token;
    console.log('✅ Authenticated successfully');
    
    // Create each delivery order
    for (let i = 0; i < deliveryOrders.length; i++) {
      const order = deliveryOrders[i];
      const orderNumber = `DEL${Date.now()}${i.toString().padStart(3, '0')}`;
      
      try {
        const orderData = {
          ...order,
          order_number: orderNumber,
          status: 'pending',
          payment_status: 'pending'
        };
        
        const response = await axios.post(`${baseURL}/api/orders`, orderData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ Created delivery order: ${orderNumber} for ${order.customer_name}`);
        
        // Small delay between orders
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to create order for ${order.customer_name}:`, error.response?.data || error.message);
      }
    }
    
    console.log('\n🎉 Finished creating test delivery orders!');
    console.log('You can now test the order handlers in the admin panel.');
    
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    console.log('\nTrying alternative approach...');
    
    // Alternative: Create orders directly via database if server allows
    await createOrdersDirectly();
  }
}

async function createOrdersDirectly() {
  // Try creating orders without authentication (if endpoint allows)
  const baseURL = 'http://localhost:3002';
  
  for (let i = 0; i < deliveryOrders.length; i++) {
    const order = deliveryOrders[i];
    const orderNumber = `DEL${Date.now()}${i.toString().padStart(3, '0')}`;
    
    try {
      const orderData = {
        ...order,
        order_number: orderNumber,
        status: 'pending',
        payment_status: 'pending'
      };
      
      // Try different endpoints
      const endpoints = ['/api/orders', '/api/order', '/orders'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.post(`${baseURL}${endpoint}`, orderData, {
            headers: { 'Content-Type': 'application/json' }
          });
          
          console.log(`✅ Created delivery order: ${orderNumber} for ${order.customer_name}`);
          break;
        } catch (err) {
          if (endpoint === endpoints[endpoints.length - 1]) {
            throw err;
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to create order for ${order.customer_name}:`, error.response?.data || error.message);
    }
  }
}

// Run the script
createTestOrders().catch(console.error);

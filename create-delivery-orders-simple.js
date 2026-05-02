// Simple script to create delivery orders via backend server
const http = require('http');

const deliveryOrders = [
  {
    tableId: 'Delivery',
    customerName: 'John Smith',
    phone: '+977-9841234567',
    address: 'Thamel, Kathmandu',
    deliveryNotes: 'Ring the bell',
    items: [
      { name: 'Chicken Momo', price: 250, quantity: 2 },
      { name: 'Fried Rice', price: 180, quantity: 1 }
    ],
    orderType: 'delivery',
    totalAmount: 680,
    deliveryFee: 50
  },
  {
    tableId: 'Delivery',
    customerName: 'Sarah Johnson',
    phone: '+977-9851234568',
    address: 'Baneshwor, Kathmandu',
    deliveryNotes: 'Call on arrival',
    items: [
      { name: 'Dal Bhat', price: 120, quantity: 1 },
      { name: 'Chicken Curry', price: 200, quantity: 1 },
      { name: 'Lassi', price: 80, quantity: 2 }
    ],
    orderType: 'delivery',
    totalAmount: 480,
    deliveryFee: 50
  },
  {
    tableId: 'Delivery',
    customerName: 'Mike Wilson',
    phone: '+977-9861234569',
    address: 'Lalitpur, Patan',
    deliveryNotes: 'Leave at door',
    items: [
      { name: 'Pizza Margherita', price: 450, quantity: 1 },
      { name: 'Coke', price: 50, quantity: 2 }
    ],
    orderType: 'delivery',
    totalAmount: 550,
    deliveryFee: 50
  }
];

async function createOrder(orderData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(orderData);
    
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/order',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function createAllOrders() {
  console.log('🚚 Creating delivery orders...');
  
  for (let i = 0; i < deliveryOrders.length; i++) {
    const order = deliveryOrders[i];
    
    try {
      const result = await createOrder(order);
      console.log(`✅ Created delivery order for ${order.customerName}`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`❌ Failed to create order for ${order.customerName}: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Finished creating delivery orders!');
  console.log('Refresh your Order Management page to see them in the Delivery Orders section.');
}

createAllOrders().catch(console.error);

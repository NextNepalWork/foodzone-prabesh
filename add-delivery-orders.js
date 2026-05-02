const { Client } = require('pg');
require('dotenv').config({ path: './server/.env' });

async function addDeliveryOrders() {
  // Try different database connection methods
  const connectionConfigs = [
    process.env.DATABASE_URL,
    'postgresql://postgres:password@localhost:5432/foodzone_local',
    'postgresql://localhost:5432/foodzone_local'
  ];

  let client;
  let connected = false;

  for (const config of connectionConfigs) {
    if (!config) continue;
    
    try {
      console.log(`Trying to connect with: ${config.replace(/password/g, '***')}`);
      client = new Client({ connectionString: config });
      await client.connect();
      connected = true;
      console.log('✅ Database connected successfully!');
      break;
    } catch (error) {
      console.log(`❌ Failed to connect: ${error.message}`);
      if (client) {
        try { await client.end(); } catch {}
      }
    }
  }

  if (!connected) {
    console.log('\n🔄 Trying alternative approach...');
    return createOrdersViaAPI();
  }

  try {
    const deliveryOrders = [
      {
        order_number: `DEL${Date.now()}001`,
        customer_name: 'John Smith',
        phone: '+977-9841234567',
        address: 'Thamel, Kathmandu',
        items: JSON.stringify([
          { name: 'Chicken Momo', price: 250, quantity: 2 },
          { name: 'Fried Rice', price: 180, quantity: 1 }
        ]),
        total: 680,
        order_type: 'delivery'
      },
      {
        order_number: `DEL${Date.now()}002`,
        customer_name: 'Sarah Johnson',
        phone: '+977-9851234568',
        address: 'Baneshwor, Kathmandu',
        items: JSON.stringify([
          { name: 'Dal Bhat', price: 120, quantity: 1 },
          { name: 'Chicken Curry', price: 200, quantity: 1 },
          { name: 'Lassi', price: 80, quantity: 2 }
        ]),
        total: 480,
        order_type: 'delivery'
      },
      {
        order_number: `DEL${Date.now()}003`,
        customer_name: 'Mike Wilson',
        phone: '+977-9861234569',
        address: 'Lalitpur, Patan',
        items: JSON.stringify([
          { name: 'Pizza Margherita', price: 450, quantity: 1 },
          { name: 'Coke', price: 50, quantity: 2 }
        ]),
        total: 550,
        order_type: 'delivery'
      }
    ];

    for (const order of deliveryOrders) {
      await client.query(`
        INSERT INTO orders (
          order_number, customer_name, phone, address, items, 
          total, order_type, status, payment_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        order.order_number,
        order.customer_name,
        order.phone,
        order.address,
        order.items,
        order.total,
        order.order_type,
        'pending',
        'pending'
      ]);
      
      console.log(`✅ Created delivery order: ${order.order_number} for ${order.customer_name}`);
    }
    
    console.log('\n🎉 Successfully created 3 delivery orders in pending status!');
    console.log('Refresh your Order Management page to see them.');
    
  } catch (error) {
    console.error('❌ Error creating orders:', error.message);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

async function createOrdersViaAPI() {
  console.log('📡 Attempting to create orders via API...');
  
  // Wait for rate limit to reset
  console.log('⏳ Waiting 10 seconds for rate limit reset...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  const fetch = require('node-fetch');
  
  try {
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
        order_type: 'delivery',
        status: 'pending',
        payment_status: 'pending'
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
        order_type: 'delivery',
        status: 'pending',
        payment_status: 'pending'
      }
    ];

    for (const order of deliveryOrders) {
      try {
        const response = await fetch('http://localhost:3002/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(order)
        });

        if (response.ok) {
          console.log(`✅ Created delivery order for ${order.customer_name}`);
        } else {
          console.log(`❌ Failed to create order for ${order.customer_name}: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ API error for ${order.customer_name}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ API approach failed:', error.message);
  }
}

addDeliveryOrders().catch(console.error);

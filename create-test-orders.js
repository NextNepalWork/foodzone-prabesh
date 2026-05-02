// Simple script to create test delivery orders
const fs = require('fs');
const path = require('path');

// Read the server.js to understand the database structure
const serverPath = path.join(__dirname, 'server', 'server.js');

console.log('Creating test delivery orders...');

// Test delivery orders data
const deliveryOrders = [
  {
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
    customer_name: 'Mike Wilson',
    phone: '+977-9861234569',
    address: 'Lalitpur, Patan',
    items: JSON.stringify([
      { name: 'Pizza Margherita', price: 450, quantity: 1 },
      { name: 'Coke', price: 50, quantity: 2 }
    ]),
    total: 550,
    order_type: 'delivery'
  },
  {
    customer_name: 'Emma Davis',
    phone: '+977-9871234570',
    address: 'Bhaktapur Durbar Square',
    items: JSON.stringify([
      { name: 'Buff Sekuwa', price: 320, quantity: 1 },
      { name: 'Chatamari', price: 150, quantity: 2 },
      { name: 'Local Beer', price: 200, quantity: 1 }
    ]),
    total: 820,
    order_type: 'delivery'
  },
  {
    customer_name: 'David Brown',
    phone: '+977-9881234571',
    address: 'Kirtipur, Kathmandu',
    items: JSON.stringify([
      { name: 'Thukpa', price: 180, quantity: 1 },
      { name: 'Chowmein', price: 160, quantity: 1 },
      { name: 'Tea', price: 30, quantity: 2 }
    ]),
    total: 400,
    order_type: 'delivery'
  }
];

// Generate SQL INSERT statements
let sqlStatements = '';
deliveryOrders.forEach((order, index) => {
  const orderNumber = `DEL${Date.now()}${index.toString().padStart(3, '0')}`;
  
  sqlStatements += `INSERT INTO orders (
    order_number, customer_name, phone, address, items, 
    total, order_type, status, payment_status, created_at
  ) VALUES (
    '${orderNumber}',
    '${order.customer_name}',
    '${order.phone}',
    '${order.address}',
    '${order.items}',
    ${order.total},
    '${order.order_type}',
    'pending',
    'pending',
    NOW()
  );\n\n`;
});

// Write SQL file
const sqlFilePath = path.join(__dirname, 'test-delivery-orders.sql');
fs.writeFileSync(sqlFilePath, sqlStatements);

console.log('✅ Generated SQL file: test-delivery-orders.sql');
console.log('\nTo add these test orders to your database, run:');
console.log('1. Connect to your database (PostgreSQL)');
console.log('2. Execute the SQL file or copy-paste the statements');
console.log('\nSQL Statements:');
console.log('================');
console.log(sqlStatements);

console.log('🎯 These 5 delivery orders will be created in PENDING status for testing!');

# Food Zone Restaurant - Ordering System (Foodzone.com.np)

A full-stack restaurant ordering system built with React (frontend) and Express.js (backend) featuring real-time order management and QR code table ordering.

## Features

### Frontend (React)
- **Homepage** (`/`) - Welcome page with restaurant information
- **Menu** (`/menu`) - Browse menu items with cart functionality
- **Table Ordering** (`/[tableId]`) - Table-specific ordering for tables 1-25
- **Admin Panel** (`/admin`) - Real-time order management
- **Sticky Table Banner** - Shows current table number for 1 hour
- **Cart System** - Persistent cart tied to table sessions
- **Custom Orders** - Free-write order box for custom items
- **QR Code Support** - Direct links like `/1`, `/2`, etc. for QR codes

### Backend (Express.js)
- **RESTful API** endpoints for menu, orders, and table management
- **Real-time updates** using Socket.IO
- **Session management** with 1-hour TTL for table sessions
- **In-memory storage** (easily replaceable with MongoDB)

## API Endpoints

- `GET /api/menu` - Fetch menu items
- `POST /api/order` - Submit new order
- `GET /api/orders` - Get all orders (admin)
- `POST /api/clear-table/:tableId` - Clear table session (admin)

## Quick Start

1. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

2. **Start the development servers:**
   ```bash
   npm run dev
   ```

This will start:
- Backend server on http://localhost:5000
- Frontend React app on http://localhost:3000

## Usage

### For Customers
1. Scan QR code at your table (e.g., `/1` for table 1)
2. Browse menu and add items to cart
3. Add custom items if needed
4. Provide name and phone number
5. Submit order

### For Staff
1. Visit `/admin` to view incoming orders in real-time
2. Clear tables when customers leave
3. Monitor order queue and preparation status

## Table URLs
- Tables 1-25 are accessible via `/1`, `/2`, `/3`, etc.
- Each table maintains its own cart session for 1 hour
- QR codes should point to these direct URLs

## Technology Stack
- **Frontend:** React, React Router, Tailwind CSS, Socket.IO Client
- **Backend:** Express.js, Socket.IO, CORS
- **Storage:** In-memory (configurable for MongoDB)
- **Real-time:** Socket.IO for live order updates

## Deployment Ready
The application is configured for easy deployment with proper build scripts and environment configuration.

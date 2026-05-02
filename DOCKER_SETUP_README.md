# Food Zone Docker Database Setup Guide

This guide will help you set up the Food Zone restaurant ordering system with a PostgreSQL database running in Docker Desktop.

## Prerequisites

1. **Docker Desktop** - Make sure Docker Desktop is installed and running
2. **Node.js** - Version 14 or higher
3. **npm** - Node package manager

## Quick Setup

### 1. Start the Database

Run the setup script to start PostgreSQL in Docker:

```bash
./setup-docker-db.sh
```

This will:
- Start a PostgreSQL container with the Food Zone database
- Initialize the database with tables and sample data
- Optionally start pgAdmin for database management

### 2. Start the Server

Use the local development startup script:

```bash
./start-local.sh
```

Or manually start the server:

```bash
cd server
npm install
NODE_ENV=development node server.js
```

## Database Details

- **Host**: localhost
- **Port**: 5432
- **Database**: foodzone_db
- **Username**: foodzone_user
- **Password**: foodzone_password_2024

## pgAdmin Access (Optional)

If you started pgAdmin, access it at:
- **URL**: http://localhost:8080
- **Email**: admin@foodzone.com
- **Password**: admin123

## Environment Configuration

The `.env.local` file contains all the necessary configuration for local development:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=foodzone_db
DB_USER=foodzone_user
DB_PASSWORD=foodzone_password_2024
PORT=3001
NODE_ENV=development
```

## Docker Commands

### Start containers:
```bash
docker-compose up -d
```

### Stop containers:
```bash
docker-compose down
```

### View logs:
```bash
docker-compose logs postgres
```

### Reset database (remove all data):
```bash
docker-compose down -v
docker-compose up -d postgres
```

## Troubleshooting

### Database Connection Issues
1. Ensure Docker Desktop is running
2. Check if PostgreSQL container is running: `docker ps`
3. Restart containers: `docker-compose restart`

### Port Conflicts
If port 5432 is already in use, modify the port in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Change to available port
```

Then update `DB_PORT` in `.env.local` accordingly.

### Container Issues
Remove and recreate containers:
```bash
docker-compose down -v
docker-compose up -d --force-recreate
```

## Database Schema

The database includes these main tables:
- `customers` - Customer information
- `menu_items` - Restaurant menu with sample items
- `table_sessions` - Table booking and session management
- `orders` - Customer orders
- `order_items` - Individual order items
- `payments` - Payment records
- `staff` - Staff management
- `restaurant_settings` - Restaurant configuration

## Default Admin Account

- **Username**: admin
- **Password**: FoodZone2024!

## Next Steps

1. Start the React frontend: `cd client && npm start`
2. Access the application at http://localhost:3000
3. Access the admin panel with the default credentials
4. Test the ordering system functionality

## Security Note

The current setup is for development only. For production:
- Change all default passwords
- Use environment-specific secrets
- Enable SSL/TLS
- Implement proper authentication and authorization

# Food Zone Database Configuration
# Copy this file to .env and fill in your actual values

# PostgreSQL Database URL
# For Supabase: postgresql://postgres:[password]@[host]:5432/postgres
# For local: postgresql://username:password@localhost:5432/foodzone
DATABASE_URL=postgresql://postgres:your_password@your_host:5432/postgres

# Server Configuration
PORT=5001
NODE_ENV=development

# Restaurant Configuration
RESTAURANT_NAME="Food Zone Duwakot"
RESTAURANT_PHONE="9851234567"
RESTAURANT_ADDRESS="KMC Chowk, Duwakot, Bhaktapur"
RESTAURANT_LATITUDE=27.6710
RESTAURANT_LONGITUDE=85.4298

# Delivery Configuration
DELIVERY_RADIUS=5.0
MIN_DELIVERY_AMOUNT=200
BASE_DELIVERY_FEE=50

#!/bin/bash

echo "🔄 Copying live data to local database..."

# Export menu items from Railway
echo "📋 Exporting menu_items..."
PGPASSWORD=MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM psql -h hopper.proxy.rlwy.net -p 14242 -U postgres -d railway -c "\COPY menu_items TO '/tmp/menu_items.csv' CSV HEADER" 2>/dev/null

# Import to local
echo "📥 Importing menu_items..."
docker exec -i foodzone_postgres psql -U foodzone_user -d foodzone_db -c "\COPY menu_items FROM STDIN CSV HEADER" < /tmp/menu_items.csv 2>/dev/null

# Export orders
echo "📋 Exporting orders..."
PGPASSWORD=MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM psql -h hopper.proxy.rlwy.net -p 14242 -U postgres -d railway -c "\COPY orders TO '/tmp/orders.csv' CSV HEADER" 2>/dev/null

# Import orders
echo "📥 Importing orders..."
docker exec -i foodzone_postgres psql -U foodzone_user -d foodzone_db -c "\COPY orders FROM STDIN CSV HEADER" < /tmp/orders.csv 2>/dev/null

# Count rows
echo ""
echo "✅ Import complete!"
echo ""
docker exec foodzone_postgres psql -U foodzone_user -d foodzone_db -c "SELECT 'menu_items' as table, COUNT(*) as rows FROM menu_items UNION ALL SELECT 'orders', COUNT(*) FROM orders;"

# Cleanup
rm -f /tmp/menu_items.csv /tmp/orders.csv

#!/bin/bash

echo "🔄 Importing data from live Railway database to local Docker database..."

# Railway database credentials
RAILWAY_HOST="hopper.proxy.rlwy.net"
RAILWAY_PORT="14242"
RAILWAY_USER="postgres"
RAILWAY_PASS="MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM"
RAILWAY_DB="railway"

# Local database credentials
LOCAL_HOST="localhost"
LOCAL_PORT="5433"
LOCAL_USER="foodzone_user"
LOCAL_PASS="foodzone_password_2024"
LOCAL_DB="foodzone_db"

# Tables to copy (in order due to foreign key constraints)
TABLES=(
  "restaurant_settings"
  "menu_items"
  "customers"
  "customer_addresses"
  "staff"
  "tables"
  "table_sessions"
  "orders"
  "order_items"
  "payments"
  "daybook_opening_balance"
  "daybook_transactions"
)

echo "📊 Copying ${#TABLES[@]} tables..."

for table in "${TABLES[@]}"; do
  echo "  📋 Copying $table..."
  
  # Export from Railway
  PGPASSWORD=$RAILWAY_PASS pg_dump \
    -h $RAILWAY_HOST \
    -p $RAILWAY_PORT \
    -U $RAILWAY_USER \
    -d $RAILWAY_DB \
    -t $table \
    --data-only \
    --no-owner \
    --no-acl \
    --column-inserts \
    > /tmp/${table}_data.sql 2>/dev/null
  
  if [ $? -eq 0 ]; then
    # Import to local
    PGPASSWORD=$LOCAL_PASS psql \
      -h $LOCAL_HOST \
      -p $LOCAL_PORT \
      -U $LOCAL_USER \
      -d $LOCAL_DB \
      -f /tmp/${table}_data.sql \
      > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
      # Count rows
      count=$(PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
      echo "    ✅ $table: $count rows"
    else
      echo "    ⚠️  $table: import failed (table may not exist yet)"
    fi
    
    # Cleanup
    rm -f /tmp/${table}_data.sql
  else
    echo "    ⚠️  $table: export failed (table may not exist)"
  fi
done

echo ""
echo "✅ Data import complete!"
echo ""
echo "📊 Summary:"
PGPASSWORD=$LOCAL_PASS psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -c "
SELECT 
  schemaname,
  tablename,
  n_tup_ins as rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
" 2>/dev/null

echo ""
echo "🎉 You can now test with live data in your local environment!"

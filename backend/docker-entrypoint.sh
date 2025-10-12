#!/bin/sh
set -e

echo "🚀 Starting Football Data Backend..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h postgres -p 5432 -U football_user 2>/dev/null; do
  echo "   PostgreSQL not ready yet, retrying in 2s..."
  sleep 2
done

echo "✅ PostgreSQL ready!"

# Run migrations
echo "📦 Running database migrations..."
npm run db:migrate

# Check if we should initialize database (first deployment)
if [ "$INIT_DB" = "true" ]; then
  echo ""
  echo "🔥 INIT_DB=true detected - Loading ALL data (2-4 hours)..."
  echo ""
  
  echo "🌱 Seeding lookup tables..."
  node dist/src/db/seed-positions.js
  node dist/src/db/seed-event-types.js
  
  echo ""
  echo "📊 Loading Matches ETL..."
  node dist/src/etl/load-matches.js
  
  echo ""
  echo "🏆 Loading Competitions ETL..."
  node dist/src/etl/load-competitions.js
  
  echo ""
  echo "👥 Loading Lineups ETL..."
  node dist/src/etl/load-lineups.js
  
  echo ""
  echo "📹 Loading 360 Frames ETL..."
  node dist/src/etl/load-360.js
  
  echo ""
  echo "⚽ Loading Events ETL (this will take 2-3 hours)..."
  node dist/src/etl/load-events.js
  
  echo ""
  echo "✅ ALL DATA LOADED!"
  echo "⚠️  IMPORTANT: Set INIT_DB=false in .env and redeploy!"
  echo ""
else
  echo "ℹ️  INIT_DB=false - Skipping data load"
fi

echo "🎉 Starting application..."

# Execute the main command (passed as arguments)
exec "$@"


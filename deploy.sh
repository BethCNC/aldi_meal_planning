#!/bin/bash

# Deployment script for Aldi Meal Planner
# Usage: ./deploy.sh [docker|pm2]

set -e

DEPLOY_METHOD=${1:-docker}

echo "🚀 Starting deployment with method: $DEPLOY_METHOD"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please create .env file from .env.example and fill in your values"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate required environment variables
REQUIRED_VARS=("SUPABASE_URL" "VITE_SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "VITE_SUPABASE_ANON_KEY" "GEMINI_API_KEY")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env file"
        exit 1
    fi
done

echo "✅ Environment variables validated"

if [ "$DEPLOY_METHOD" = "docker" ]; then
    echo "🐳 Building Docker image..."
    
    docker build \
        --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
        --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
        -t aldi-meal-planner:latest .
    
    echo "🛑 Stopping existing container (if any)..."
    docker stop aldi-meal-planner 2>/dev/null || true
    docker rm aldi-meal-planner 2>/dev/null || true
    
    echo "🚀 Starting new container..."
    docker run -d \
        --name aldi-meal-planner \
        --restart unless-stopped \
        -p 3000:3000 \
        --env-file .env \
        aldi-meal-planner:latest
    
    echo "✅ Container started!"
    echo "📊 Container status:"
    docker ps | grep aldi-meal-planner
    
    echo "📋 View logs with: docker logs -f aldi-meal-planner"
    echo "🏥 Health check: curl http://localhost:3000/api/health"

elif [ "$DEPLOY_METHOD" = "pm2" ]; then
    echo "📦 Building frontend..."
    npm run build
    
    echo "🔄 Restarting PM2 process..."
    pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
    
    echo "✅ Application restarted!"
    echo "📊 PM2 status:"
    pm2 status
    
    echo "📋 View logs with: pm2 logs aldi-meal-planner"
    echo "🏥 Health check: curl http://localhost:3000/api/health"
else
    echo "❌ Unknown deployment method: $DEPLOY_METHOD"
    echo "Usage: ./deploy.sh [docker|pm2]"
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"

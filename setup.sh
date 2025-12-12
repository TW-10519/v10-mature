#!/bin/bash

# Quick Start Script for PostgreSQL Migration
# This script automates the setup process

set -e

echo ""
echo "============================================================"
echo "  Shift Scheduler - PostgreSQL Migration Setup"
echo "============================================================"
echo ""

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if services are already running
if docker-compose ps | grep -q "postgres"; then
    echo "⚠️  PostgreSQL container is already running"
    read -p "Do you want to restart the services? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Stopping existing services..."
        docker-compose down
    else
        echo "ℹ️  Keeping existing services running"
    fi
fi

echo ""
echo "🚀 Starting PostgreSQL and Backend services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if services are running
if docker-compose ps | grep -q "postgres.*Up"; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL failed to start"
    echo ""
    echo "📋 Logs:"
    docker-compose logs postgres
    exit 1
fi

if docker-compose ps | grep -q "backend.*Up"; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend is still starting..."
    sleep 3
fi

echo ""
echo "🔄 Running migration script..."
docker-compose exec -T backend python migrate.py

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================================"
    echo "✅ SETUP COMPLETED SUCCESSFULLY!"
    echo "============================================================"
    echo ""
    echo "📊 Service Status:"
    docker-compose ps
    echo ""
    echo "🧪 Testing health endpoint..."
    sleep 2
    
    HEALTH=$(curl -s http://localhost:5000/api/health 2>/dev/null || echo "")
    if [[ $HEALTH == *"healthy"* ]]; then
        echo "✅ Backend is healthy and responding"
    else
        echo "⚠️  Backend may still be initializing. Try again in a moment."
    fi
    
    echo ""
    echo "📝 Next steps:"
    echo "   1. Frontend should start connecting to http://localhost:5000"
    echo "   2. All data has been migrated to PostgreSQL"
    echo "   3. JSON files are kept as backup (optional: delete them)"
    echo ""
    echo "📚 For more information, see POSTGRESQL_SETUP.md"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo ""
    echo "📋 Backend logs:"
    docker-compose logs backend
    exit 1
fi

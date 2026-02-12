#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# 1. Pull latest changes
echo "📥 Pulling from git..."
git pull --ff-only origin main

# 2. Install dependencies (in case of new packages)
echo "📦 Installing dependencies..."
npm install

# 3. Database Migration (CRITICAL for 502 errors)
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# 4. Generate Client
echo "🔄 Generating Prisma Client..."
npx prisma generate

# 5. Build Next.js app
echo "🏗️ Building application..."
npm run build

# 6. Restart Server (Systemd)
# CHANGE THIS to your actual service name if different
SERVICE_NAME="police-feedback" 

echo "♻️ Restarting systemd service: $SERVICE_NAME..."
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    sudo systemctl restart $SERVICE_NAME
    echo "✅ Service restarted."
else
    echo "⚠️ Service '$SERVICE_NAME' not found or not active."
    echo "   Please run: sudo systemctl restart <your-service-name>"
fi

echo "✅ Deployment complete!"

#!/bin/bash

echo "🚀 Starting deployment..."

# 1. Pull latest changes
echo "📥 Pulling from git..."
git pull origin main

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

# 6. Restart Server (assuming PM2)
echo "♻️ Restarting server..."
if command -v pm2 &> /dev/null
then
    pm2 restart all
else
    echo "⚠️ PM2 not found. Please restart your server manually."
fi

echo "✅ Deployment complete!"

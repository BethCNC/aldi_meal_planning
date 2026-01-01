# Deployment Guide - Aldi Meal Planner

This guide covers deploying the Aldi Meal Planner application to a production server with a custom domain.

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Supabase Project** - Set up at [supabase.com](https://supabase.com)
   - Note your project URL and API keys
   - Database migrations should be run (see `docs/migrations/`)

2. **Google Gemini API Key** - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

3. **Domain Name** (optional but recommended)
   - Configure DNS records for your domain

4. **Server Access**
   - VPS (DigitalOcean, Linode, AWS EC2, etc.)
   - Or use a platform like Railway, Render, Fly.io, Coolify

---

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

The project includes a Dockerfile optimized for production.

#### Step 1: Prepare Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:
- `SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_URL` - Same as above (for frontend build)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key from Supabase
- `VITE_SUPABASE_ANON_KEY` - Anon key from Supabase
- `GEMINI_API_KEY` - Your Gemini API key
- `PORT` - Server port (default: 3000)
- `NODE_ENV=production`

#### Step 2: Build Docker Image

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  -t aldi-meal-planner:latest .
```

#### Step 3: Run Container

```bash
docker run -d \
  --name aldi-meal-planner \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  aldi-meal-planner:latest
```

#### Step 4: Verify Deployment

```bash
# Check container status
docker ps

# Check logs
docker logs aldi-meal-planner

# Test health endpoint
curl http://localhost:3000/api/health
```

---

### Option 2: Manual Server Deployment (VPS)

#### Step 1: Server Setup

On your VPS (Ubuntu/Debian):

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx (for reverse proxy)
sudo apt install -y nginx
```

#### Step 2: Clone and Build

```bash
# Clone repository
git clone <your-repo-url> /var/www/aldi-meal-planner
cd /var/www/aldi-meal-planner

# Install dependencies
npm install

# Create .env file
cp .env.example .env
nano .env  # Edit with your values

# Build frontend
npm run build
```

#### Step 3: Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'aldi-meal-planner',
    script: 'server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable auto-start on boot
```

#### Step 4: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/aldi-meal-planner`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase timeouts for AI requests
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/aldi-meal-planner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

---

### Option 3: Platform Deployment

#### Railway

1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Railway will auto-detect Dockerfile and deploy

#### Render

1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `npm run build`
4. Set start command: `node server/index.js`
5. Add environment variables
6. Deploy

#### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Set secrets
fly secrets set SUPABASE_URL=...
fly secrets set VITE_SUPABASE_URL=...
fly secrets set SUPABASE_SERVICE_ROLE_KEY=...
fly secrets set VITE_SUPABASE_ANON_KEY=...
fly secrets set GEMINI_API_KEY=...
fly secrets set NODE_ENV=production
```

---

## 🔧 Post-Deployment Configuration

### 1. Update Supabase CORS Settings

In your Supabase dashboard:
- Go to Settings → API
- Add your domain to "Allowed CORS origins"
- Example: `https://yourdomain.com`

### 2. Verify Environment Variables

Ensure all environment variables are set correctly:

```bash
# Check if server can access env vars
curl http://localhost:3000/api/health
```

### 3. Test API Endpoints

```bash
# Health check
curl https://yourdomain.com/api/health

# Test authenticated endpoint (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://yourdomain.com/api/v1/recipes
```

---

## 🔍 Troubleshooting

### Server Won't Start

1. **Check environment variables:**
   ```bash
   # In Docker
   docker exec aldi-meal-planner env | grep -E 'SUPABASE|GEMINI'
   
   # On VPS
   pm2 logs aldi-meal-planner
   ```

2. **Check port availability:**
   ```bash
   sudo lsof -i :3000
   ```

3. **Check build output:**
   ```bash
   # Ensure dist/ folder exists
   ls -la dist/
   ```

### Frontend Not Loading

1. **Check if build completed:**
   ```bash
   npm run build
   ```

2. **Verify static file serving:**
   - Check `server/index.js` serves from `dist/`
   - Ensure `dist/index.html` exists

3. **Check browser console:**
   - Look for CORS errors
   - Verify API endpoints are accessible

### API Errors

1. **Supabase connection:**
   - Verify SUPABASE_URL is correct
   - Check API keys are valid
   - Ensure database migrations are run

2. **Gemini API:**
   - Verify GEMINI_API_KEY is set
   - Check API quota/limits
   - Review server logs for API errors

---

## 📊 Monitoring

### PM2 Monitoring

```bash
# View logs
pm2 logs aldi-meal-planner

# Monitor resources
pm2 monit

# Restart app
pm2 restart aldi-meal-planner
```

### Docker Monitoring

```bash
# View logs
docker logs -f aldi-meal-planner

# Check resource usage
docker stats aldi-meal-planner
```

---

## 🔄 Updating Deployment

### Docker

```bash
# Pull latest code
git pull

# Rebuild image
docker build --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  -t aldi-meal-planner:latest .

# Stop old container
docker stop aldi-meal-planner
docker rm aldi-meal-planner

# Start new container
docker run -d --name aldi-meal-planner --restart unless-stopped \
  -p 3000:3000 --env-file .env aldi-meal-planner:latest
```

### PM2

```bash
# Pull latest code
git pull

# Rebuild
npm run build

# Restart
pm2 restart aldi-meal-planner
```

---

## 🛡️ Security Checklist

- [ ] Environment variables are not committed to git
- [ ] `.env` file is in `.gitignore`
- [ ] SSL/HTTPS is enabled
- [ ] Supabase service role key is kept secret
- [ ] API rate limiting is configured (if needed)
- [ ] CORS is properly configured
- [ ] Server firewall is configured
- [ ] Regular security updates are applied

---

## 📝 Notes

- The Dockerfile uses a multi-stage build for optimal image size
- Frontend environment variables (`VITE_*`) are embedded at build time
- Backend environment variables are read at runtime
- The server serves the built frontend from `/dist` for all non-API routes
- Health check endpoint: `/api/health`

---

## 🆘 Need Help?

If you encounter issues:

1. Check server logs: `pm2 logs` or `docker logs`
2. Verify all environment variables are set
3. Ensure database migrations are complete
4. Test API endpoints individually
5. Check browser console for frontend errors

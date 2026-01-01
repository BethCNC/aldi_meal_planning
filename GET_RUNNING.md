# Get Your App Running - Simple Guide

Follow these steps to get your Aldi Meal Planner back online.

## Step 1: Get Your Server Ready

If you're using **Hetzner Cloud**:

1. Log into [Hetzner Cloud Console](https://console.hetzner.cloud)
2. Create a new server (or use existing):
   - Ubuntu 22.04 or 24.04
   - CPX11 (2 vCPU, 4GB RAM) - ~€8/month recommended
3. Note your server IP address
4. SSH into server: `ssh root@YOUR_SERVER_IP`

## Step 2: Install Docker

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install -y docker-compose-plugin
```

## Step 3: Clone Your Code

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/aldi_meal_planning.git
cd aldi_meal_planning
git checkout v2-new  # or your branch
```

## Step 4: Set Environment Variables

```bash
# Create .env file
cp env.template .env
nano .env
```

**Fill in these values:**

```env
SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
PORT=3000
NODE_ENV=production
```

Save and exit (Ctrl+X, Y, Enter)

## Step 5: Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy with Docker
./deploy.sh docker
```

Or manually:

```bash
# Build
docker build \
  --build-arg VITE_SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2) \
  --build-arg VITE_SUPABASE_ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d '=' -f2) \
  -t aldi-meal-planner:latest .

# Run
docker run -d \
  --name aldi-meal-planner \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  aldi-meal-planner:latest
```

## Step 6: Test It

```bash
# Check if it's running
docker logs aldi-meal-planner

# Test health endpoint
curl http://localhost:3000/api/health
```

You should see: `{"status":"ok","timestamp":"..."}`

## Step 7: Point Your Domain (Optional)

If you want to use a domain instead of IP:port:

### Install Nginx

```bash
apt install -y nginx certbot python3-certbot-nginx
```

### Create Nginx Config

```bash
nano /etc/nginx/sites-available/aldi-meal-planner
```

Paste this (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```

### Enable and Get SSL

```bash
# Enable site
ln -s /etc/nginx/sites-available/aldi-meal-planner /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Step 8: Access Your App

- **By IP**: `http://YOUR_SERVER_IP:3000`
- **By Domain**: `https://yourdomain.com`

---

## Troubleshooting

**App won't start?**
```bash
docker logs aldi-meal-planner
# Check for missing environment variables
```

**Port 3000 not accessible?**
- Check Hetzner Cloud Firewall: Allow port 3000 (or 80/443 if using Nginx)
- Check Docker: `docker ps` (should show aldi-meal-planner running)

**Need to update?**
```bash
cd /opt/aldi_meal_planning
git pull
./deploy.sh docker
```

**View logs?**
```bash
docker logs -f aldi-meal-planner
```

---

## That's It!

Your app should now be running. Need n8n workflows? See `docs/HETZNER_N8N_SETUP.md` for that setup.

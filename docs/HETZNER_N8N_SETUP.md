# Hetzner Cloud + n8n Setup Guide

This guide covers deploying the Aldi Meal Planner on **Hetzner Cloud** with **n8n** automation workflows.

---

## 🎯 Overview

This setup uses:
- **Hetzner Cloud VPS** - Cost-effective European cloud hosting
- **Docker** - Containerized application deployment
- **Nginx** - Reverse proxy and SSL termination
- **n8n** - Workflow automation for scheduled tasks
- **PM2** (optional) - Process management alternative

---

## 📋 Prerequisites

1. **Hetzner Cloud Account**
   - Sign up at [hetzner.com/cloud](https://www.hetzner.com/cloud)
   - Add payment method

2. **Domain Name** (recommended)
   - Point DNS A record to your Hetzner server IP

3. **All API Keys**
   - Supabase URL and keys
   - Google Gemini API key
   - (Optional) CRON_SECRET for n8n workflows

---

## 🚀 Step 1: Create Hetzner Cloud Server

1. **Go to Hetzner Cloud Console**
   - Navigate to "Servers" → "Add Server"

2. **Choose Configuration:**
   - **Location**: Choose closest to your users (e.g., Falkenstein, Nuremberg)
   - **Image**: Ubuntu 22.04 or 24.04
   - **Type**: 
     - Minimum: CX11 (1 vCPU, 2GB RAM) - ~€4/month
     - Recommended: CPX11 (2 vCPU, 4GB RAM) - ~€8/month
     - For n8n on same server: CPX21 (3 vCPU, 8GB RAM) - ~€15/month

3. **Network & Firewall:**
   - Create/select SSH key for access
   - Configure Firewall Rules:
     - Allow SSH (port 22)
     - Allow HTTP (port 80)
     - Allow HTTPS (port 443)
     - (Optional) Allow port 3000 for direct access

4. **Create Server**
   - Wait ~1 minute for provisioning
   - Note the IP address

---

## 🔧 Step 2: Initial Server Setup

SSH into your server:

```bash
ssh root@YOUR_SERVER_IP
# or: ssh -i ~/.ssh/your_key root@YOUR_SERVER_IP
```

### Update System

```bash
apt update && apt upgrade -y
```

### Create Non-Root User (Security Best Practice)

```bash
# Create user
adduser deploy
usermod -aG sudo deploy

# Set up SSH key for new user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Switch to deploy user
su - deploy
```

### Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Log out and back in for group changes
exit
# SSH back in: ssh deploy@YOUR_SERVER_IP
```

### Install Node.js (for PM2 option or manual setup)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (optional, if not using Docker)
sudo npm install -g pm2
```

### Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 📦 Step 3: Deploy Application

### Clone Repository

```bash
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/aldi_meal_planning.git
sudo chown -R deploy:deploy aldi_meal_planning
cd aldi_meal_planning
```

### Set Up Environment Variables

```bash
cp env.template .env
nano .env  # Edit with your actual values
```

**Required values:**
```env
SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
PORT=3000
NODE_ENV=production
CRON_SECRET=$(openssl rand -base64 32)  # Generate secure secret
```

### Build and Run with Docker

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy
./deploy.sh docker
```

Or manually:

```bash
# Build image
docker build \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  -t aldi-meal-planner:latest .

# Run container
docker run -d \
  --name aldi-meal-planner \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  aldi-meal-planner:latest

# Verify
docker logs aldi-meal-planner
curl http://localhost:3000/api/health
```

---

## 🌐 Step 4: Configure Nginx

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/aldi-meal-planner
```

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
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for AI requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/aldi-meal-planner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Set Up SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
# Test renewal: sudo certbot renew --dry-run
```

---

## 🤖 Step 5: Set Up n8n (Optional but Recommended)

n8n will handle automated workflows like weekly plan generation and price updates.

### Option A: n8n with Docker (Same Server)

```bash
cd /opt
mkdir n8n
cd n8n

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD:-change-me}
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      - GENERIC_TIMEZONE=UTC
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - app-network

volumes:
  n8n_data:

networks:
  app-network:
    driver: bridge
EOF

# Generate secure password
export N8N_PASSWORD=$(openssl rand -base64 16)
echo "N8N_PASSWORD=$N8N_PASSWORD" > .env
echo "Save this password: $N8N_PASSWORD"

# Start n8n
docker compose up -d

# Check logs
docker logs n8n
```

### Option B: n8n Cloud (Separate Service)

Use [n8n.cloud](https://n8n.io/cloud) for managed n8n hosting.

### Configure Nginx for n8n

Add to `/etc/nginx/sites-available/aldi-meal-planner` or create separate config:

```nginx
# n8n subdomain
server {
    listen 443 ssl http2;
    server_name n8n.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name n8n.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

Get SSL for n8n subdomain:

```bash
sudo certbot --nginx -d n8n.yourdomain.com
```

### Create n8n Workflows

1. **Access n8n:**
   - Navigate to: `https://n8n.yourdomain.com`
   - Login with credentials you set

2. **Weekly Plan Generation Workflow:**

   - **Trigger**: Schedule Trigger node
     - Set to: Weekly (e.g., Monday 08:00 UTC)
   
   - **Action**: HTTP Request node
     - Method: `POST`
     - URL: `https://yourdomain.com/api/cron/generate-plans`
     - Authentication: Generic Credential Type → Header Auth
       - Name: `Authorization`
       - Value: `Bearer YOUR_CRON_SECRET` (from .env file)
     - Send Headers:
       ```
       Content-Type: application/json
       ```

3. **Price Update Workflow:**
   
   - Similar setup
   - URL: `https://yourdomain.com/api/cron/update-prices`
   - Schedule: Daily or weekly as needed

4. **Test Workflows:**
   - Use "Execute Workflow" button to test
   - Check server logs: `docker logs aldi-meal-planner`
   - Verify endpoints respond correctly

---

## 🔄 Step 6: Enable Cron Endpoints

The cron endpoints are currently commented out. To enable them:

1. **Edit server/scheduledTasks.js:**

```bash
cd /opt/aldi_meal_planning
nano server/scheduledTasks.js
```

2. **Uncomment the routes** (lines 18-37)

3. **Verify script files exist:**
```bash
ls -la backend/scheduled/
# Should see: weeklyPlanGenerator.js, priceUpdater.js
```

4. **Restart container:**
```bash
docker restart aldi-meal-planner
```

5. **Test endpoint manually:**
```bash
curl -X POST http://localhost:3000/api/cron/generate-plans \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📊 Monitoring & Maintenance

### View Application Logs

```bash
# Docker logs
docker logs -f aldi-meal-planner

# n8n logs
docker logs -f n8n

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Update Application

```bash
cd /opt/aldi_meal_planning
git pull
./deploy.sh docker
```

### Update n8n

```bash
cd /opt/n8n
docker compose pull
docker compose up -d
```

### Backup n8n Workflows

n8n data is stored in Docker volume. Backup:

```bash
docker run --rm -v n8n_n8n_data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/n8n-backup-$(date +%Y%m%d).tar.gz /data
```

### Monitor Resources

```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Check memory
free -h
```

---

## 🔒 Security Checklist

- [ ] Firewall configured in Hetzner Cloud console
- [ ] SSH key authentication (disable password auth)
- [ ] Non-root user created
- [ ] SSL certificates installed and auto-renewing
- [ ] Environment variables secured (`.env` not in git)
- [ ] CRON_SECRET is strong and secret
- [ ] n8n password is strong
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Backups configured for n8n workflows

---

## 🐛 Troubleshooting

### Application Not Starting

```bash
# Check Docker logs
docker logs aldi-meal-planner

# Check environment variables
docker exec aldi-meal-planner env | grep -E 'SUPABASE|GEMINI'

# Verify build
docker images | grep aldi-meal-planner
```

### n8n Not Accessible

```bash
# Check if running
docker ps | grep n8n

# Check logs
docker logs n8n

# Verify Nginx config
sudo nginx -t
sudo systemctl status nginx
```

### Cron Endpoints Not Working

1. Verify CRON_SECRET matches in .env and n8n workflow
2. Check server logs for errors
3. Test endpoint manually with curl
4. Ensure routes are uncommented in scheduledTasks.js

---

## 💰 Cost Estimate (Hetzner Cloud)

- **CX11** (1 vCPU, 2GB): ~€4/month - Basic deployment
- **CPX11** (2 vCPU, 4GB): ~€8/month - Recommended
- **CPX21** (3 vCPU, 8GB): ~€15/month - With n8n on same server
- **Domain**: ~€10-15/year
- **Total**: ~€10-20/month for a production setup

---

## 📚 Additional Resources

- [Hetzner Cloud Docs](https://docs.hetzner.com/)
- [n8n Documentation](https://docs.n8n.io/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

**Need Help?** Check the main [DEPLOYMENT.md](../DEPLOYMENT.md) for general deployment guidance.

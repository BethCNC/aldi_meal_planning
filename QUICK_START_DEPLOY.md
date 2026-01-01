# Quick Start Deployment Guide

Get your app running on a server in 5 minutes!

## 🎯 Prerequisites Checklist

- [ ] Supabase project created (get URL and API keys)
- [ ] Google Gemini API key
- [ ] Server/VPS access OR platform account (Railway, Render, Fly.io)

---

## 🚀 Fastest Path: Docker Deployment

### Step 1: Create Environment File

```bash
# Copy the template
cp env.template .env

# Edit with your values
nano .env  # or use your preferred editor
```

**Required values:**
- `SUPABASE_URL` - From Supabase dashboard → Settings → API
- `VITE_SUPABASE_URL` - Same as above
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase dashboard → Settings → API
- `VITE_SUPABASE_ANON_KEY` - From Supabase dashboard → Settings → API
- `GEMINI_API_KEY` - From https://makersuite.google.com/app/apikey

### Step 2: Build and Run

```bash
# Option A: Use the deployment script
./deploy.sh docker

# Option B: Manual Docker commands
docker build \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  -t aldi-meal-planner:latest .

docker run -d \
  --name aldi-meal-planner \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  aldi-meal-planner:latest
```

### Step 3: Verify

```bash
# Check if it's running
curl http://localhost:3000/api/health

# Should return: {"status":"ok","timestamp":"..."}
```

---

## 🌐 Connect to Your Domain

### Option A: Nginx Reverse Proxy (Recommended)

1. **Install Nginx:**
   ```bash
   sudo apt install nginx
   ```

2. **Create config file** `/etc/nginx/sites-available/aldi-meal-planner`:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable and restart:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/aldi-meal-planner /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Add SSL (Let's Encrypt):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

### Option B: Direct Port Access

If you just want to test quickly:

```bash
# Make sure port 3000 is open in your firewall
sudo ufw allow 3000

# Access at: http://your-server-ip:3000
```

---

## 🔧 Platform-Specific Quick Deploys

### Railway

1. Connect GitHub repo
2. Add environment variables in dashboard
3. Deploy! (auto-detects Dockerfile)

### Render

1. New Web Service → Connect repo
2. Build: `npm run build`
3. Start: `node server/index.js`
4. Add env vars
5. Deploy!

### Fly.io

```bash
fly launch
fly secrets set SUPABASE_URL=...
fly secrets set VITE_SUPABASE_URL=...
fly secrets set SUPABASE_SERVICE_ROLE_KEY=...
fly secrets set VITE_SUPABASE_ANON_KEY=...
fly secrets set GEMINI_API_KEY=...
```

---

## ✅ Post-Deployment Checklist

- [ ] App responds at `/api/health`
- [ ] Frontend loads correctly
- [ ] Supabase CORS configured (add your domain)
- [ ] SSL certificate installed (if using domain)
- [ ] Environment variables verified
- [ ] Logs checked (no errors)

---

## 🐛 Common Issues

**"Missing Supabase environment variables"**
→ Check `.env` file has all required variables

**"Cannot connect to Supabase"**
→ Verify SUPABASE_URL and keys are correct
→ Check Supabase dashboard for project status

**"Frontend shows blank page"**
→ Run `npm run build` to create `dist/` folder
→ Check browser console for errors

**"Port already in use"**
→ Change PORT in `.env` or stop conflicting service

---

## 📚 Next Steps

- Read full [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions
- Set up monitoring and logging
- Configure backups
- Set up CI/CD pipeline

---

**Need help?** Check the full deployment guide or server logs!

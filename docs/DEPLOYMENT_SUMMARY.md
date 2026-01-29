# Deployment Setup Summary

## ✅ What's Been Set Up

Your application is now ready for deployment to a production server with a custom domain. Here's what has been configured:

### 📁 New Files Created

1. **`DEPLOYMENT.md`** - Comprehensive deployment guide with multiple options
2. **`QUICK_START_DEPLOY.md`** - Quick 5-minute deployment guide
3. **`env.template`** - Environment variables template
4. **`deploy.sh`** - Automated deployment script (Docker & PM2)
5. **`ecosystem.config.js`** - PM2 process manager configuration
6. **`scripts/verify-build.js`** - Pre-deployment verification script

### 🔧 Configuration Updates

1. **`Dockerfile`** - Fixed to include backend directory (needed by server routes)
2. **`.dockerignore`** - Updated to allow backend directory
3. **`server/index.js`** - Enhanced with:
   - Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
   - CORS configuration support
   - Better error handling for missing dist folder
   - Increased body size limits for image uploads
4. **`package.json`** - Added `verify:deploy` script

---

## 🚀 Quick Start (3 Steps)

**Note**: If you were previously using **Hetzner Cloud** and **n8n**, see the detailed guide:
- **[Hetzner + n8n Setup Guide](./docs/HETZNER_N8N_SETUP.md)** - Complete Hetzner Cloud deployment with n8n workflows

### Step 1: Set Up Environment Variables

```bash
cp env.template .env
# Edit .env with your actual values
```

**Required values:**
- `SUPABASE_URL` - From Supabase dashboard
- `VITE_SUPABASE_URL` - Same as above
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase dashboard
- `VITE_SUPABASE_ANON_KEY` - From Supabase dashboard  
- `GEMINI_API_KEY` - From Google AI Studio

### Step 2: Verify Build Readiness

```bash
npm run verify:deploy
```

This checks:
- ✅ dist/ folder exists
- ✅ Environment variables are set
- ✅ Server files are present
- ✅ Backend routes exist

### Step 3: Deploy

**Option A: Docker (Recommended)**
```bash
./deploy.sh docker
```

**Option B: PM2 (VPS)**
```bash
npm run build
./deploy.sh pm2
```

**Option C: Platform (Railway, Render, Fly.io)**
- Follow instructions in `DEPLOYMENT.md`

---

## 🌐 Connecting to Your Domain

### Using Nginx (Recommended)

1. Install Nginx: `sudo apt install nginx`
2. Create config (see `DEPLOYMENT.md` for full config)
3. Enable SSL: `sudo certbot --nginx -d yourdomain.com`

### Direct Access

- Make sure port 3000 is open: `sudo ufw allow 3000`
- Access at: `http://your-server-ip:3000`

---

## 📋 Post-Deployment Checklist

- [ ] App responds at `/api/health`
- [ ] Frontend loads correctly
- [ ] Supabase CORS configured (add your domain in Supabase dashboard)
- [ ] SSL certificate installed (if using domain)
- [ ] Environment variables verified
- [ ] Logs checked (no errors)

---

## 🔍 Verification Commands

```bash
# Check if server is running
curl http://localhost:3000/api/health

# View Docker logs
docker logs -f aldi-meal-planner

# View PM2 logs
pm2 logs aldi-meal-planner

# Check PM2 status
pm2 status
```

---

## 📚 Documentation

- **Quick Start**: See `QUICK_START_DEPLOY.md`
- **Full Guide**: See `DEPLOYMENT.md`
- **Troubleshooting**: See `DEPLOYMENT.md` → Troubleshooting section

---

## 🆘 Common Issues

**"Missing Supabase environment variables"**
→ Check `.env` file has all required variables

**"dist/ folder not found"**
→ Run `npm run build` first

**"Port already in use"**
→ Change PORT in `.env` or stop conflicting service

**"Frontend shows blank page"**
→ Check browser console for errors
→ Verify Supabase CORS is configured

---

## 🎯 Next Steps

1. **Set up your environment variables** in `.env`
2. **Run verification**: `npm run verify:deploy`
3. **Deploy**: `./deploy.sh docker` or your preferred method
4. **Configure domain** with Nginx and SSL
5. **Test** the application thoroughly
6. **Monitor** logs and performance

---

**Ready to deploy! 🚀**

For detailed instructions, see `DEPLOYMENT.md` or `QUICK_START_DEPLOY.md`.

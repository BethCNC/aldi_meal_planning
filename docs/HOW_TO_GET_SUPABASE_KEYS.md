# How to Get Supabase API Keys

## Quick Steps

### Step 1: Open Settings
- Look at the **left sidebar** in your Supabase dashboard
- Click on the **⚙️ Settings** icon (gear/cog icon)
- It's usually at the bottom of the sidebar

### Step 2: Click "API"
- In the Settings menu, you'll see several options
- Click on **"API"** (second option usually)

### Step 3: Find Your Keys
You'll see a page with several sections. Look for:

#### **Project URL**
- Under "Project URL" section
- It looks like: `https://xxxxxxxxxxxxx.supabase.co`
- Click the **copy icon** (📋) next to it to copy

#### **anon public key**
- Scroll down to "Project API keys" section
- Find the key labeled **"anon"** or **"public"**
- It's a long string starting with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Click the **eye icon** 👁️ to reveal it (if hidden)
- Click the **copy icon** (📋) to copy it

### Step 4: Add to Your .env File

Open your project's `.env` file and add:

```bash
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:** 
- Use the **anon/public** key (NOT the service_role key)
- Replace the `x` values with your actual URL and key

---

## Visual Guide

```
┌─────────────────────────────────────┐
│  Supabase Dashboard                 │
├─────────────────────────────────────┤
│                                     │
│  [Home]                             │
│  [Table Editor]                     │
│  [SQL Editor]                       │
│  ...                                │
│  ⚙️ Settings  ← Click here          │
│                                     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  Settings Menu                      │
├─────────────────────────────────────┤
│  • General                          │
│  • API              ← Click here    │
│  • Database                         │
│  • Auth                             │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  API Settings Page                  │
├─────────────────────────────────────┤
│                                     │
│  Project URL                        │
│  ┌───────────────────────────────┐ │
│  │ https://xxxxx.supabase.co     │ │
│  │                    [📋 Copy]  │ │
│  └───────────────────────────────┘ │
│                                     │
│  Project API keys                   │
│                                     │
│  anon public                        │
│  ┌───────────────────────────────┐ │
│  │ eyJhbGciOiJIUzI1NiIsInR5c... │ │
│  │                    [👁️] [📋] │ │
│  └───────────────────────────────┘ │
│                                     │
│  service_role (DO NOT USE THIS)     │
│  ┌───────────────────────────────┐ │
│  │ (hidden - keep this secret!)  │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## Which Key to Use?

✅ **Use:** `anon public` key  
❌ **Don't use:** `service_role` key (this is secret/admin key)

The `anon` key is safe to use in your client-side code and `.env` file.

---

## After Adding to .env

1. Save your `.env` file
2. Run: `node scripts/setup-supabase.js --check`
3. You should see: "✅ Connected to Supabase!"

---

## Troubleshooting

### "I don't see Settings"
- Look in the **bottom** of the left sidebar
- It might be collapsed - click the menu icon (☰) to expand

### "I don't see API option"
- Make sure you clicked **Settings** first
- The API option should be in the Settings submenu

### "The key is hidden"
- Click the **eye icon** 👁️ to reveal it
- Then copy it

### "Which key is which?"
- **anon/public** = Safe to use, starts with `eyJ...`
- **service_role** = Secret admin key, keep this hidden!

---

## Next Step

After you've added the keys to `.env`, continue with:
1. Create the database schema (Step 5 in Quick Start)
2. Import your data

Need help? Let me know!

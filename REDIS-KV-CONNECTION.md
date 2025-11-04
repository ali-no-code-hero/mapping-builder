# Connecting Redis KV to Vercel Project

## Error: Missing Environment Variables

If you're seeing:
```
Error: @vercel/kv: Missing required environment variables KV_REST_API_URL and KV_REST_API_TOKEN
```

This means the Redis KV store is not connected to your Vercel project.

## Solution: Connect KV Store in Vercel Dashboard

### Step 1: Go to Vercel Dashboard
1. Navigate to your project: https://vercel.com/dashboard
2. Select your project: `mapping-builder`

### Step 2: Connect KV Store
1. Go to **Settings** → **Storage**
2. Find your KV store: `redis-geocode-cities`
3. Click **Connect** or **Link**
4. Select your project if prompted

### Step 3: Verify Connection
The environment variables should be automatically added:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

These are automatically injected by Vercel when the KV store is connected.

### Step 4: Redeploy
After connecting:
1. The next deployment will automatically have the env vars
2. Or trigger a redeploy manually

## Alternative: Manual Environment Variables

If automatic connection doesn't work:

1. Go to **Settings** → **Environment Variables**
2. Add:
   - **Name:** `KV_REST_API_URL`
   - **Value:** (Get from KV store dashboard)
3. Add:
   - **Name:** `KV_REST_API_TOKEN`
   - **Value:** (Get from KV store dashboard)

## Verification

After connecting, check logs for:
- ✅ `"Loaded X cities from Redis KV"` (on startup)
- ✅ `"Saved CITY,STATE to Redis KV"` (when new city geocoded)
- ❌ No more "Missing required environment variables" errors

## Note

The code has been updated to gracefully handle missing Redis KV configuration. The system will:
- Continue working with CSV-only lookup
- Skip Redis operations silently if not configured
- Work normally once Redis KV is connected


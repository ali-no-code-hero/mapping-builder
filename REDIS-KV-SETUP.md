# Redis KV Setup for Geocoded Cities

## Overview
The geocoded cities cache now uses Vercel KV (Redis) for persistent storage. This allows newly geocoded cities to be saved and retrieved across function instances and deployments.

## Database Schema

**Redis Hash Key:** `geocoded-cities`

**Hash Field Format:** `"CITY,STATE"` (uppercase, normalized)
- Example: `"NEW YORK,NY"`, `"LOS ANGELES,CA"`

**Hash Value Format:** `{ lat: number, lng: number }`
- Example: `{ lat: 40.7128, lng: -74.0060 }`

## How It Works

1. **Initial Load:**
   - CSV file (~28K cities) loads into memory on startup
   - Redis KV loads additional cities that were geocoded via API

2. **Lookup Priority:**
   - In-memory cache (CSV + Redis KV data)
   - Redis KV (if not in memory)
   - Geocoding API (if not found anywhere)

3. **Saving New Cities:**
   - When a city is geocoded via API, it's automatically saved to Redis KV
   - Also cached in memory for the function instance lifetime

## Vercel Configuration

Make sure your Vercel project has:
- **KV Store:** `redis-geocode-cities` connected
- **Environment:** KV connection automatically configured via `@vercel/kv`

## Testing

Run the test script:
```bash
npx ts-node test-redis-kv.ts
```

Or test via the API:
1. Make a request with a city not in the CSV
2. Check logs to see "Saved CITY,STATE to Redis KV"
3. Make another request - should see "Loaded X cities from Redis KV"

## Migration

If you had existing data in `geocoded-cache.json`, you can import it:

```bash
# Create a migration script if needed
# The JSON file format matches the Redis KV format
```

## Notes

- Redis KV is persistent across deployments
- No size limits (unlike Edge Config)
- Fast reads/writes
- Automatically grows as new cities are geocoded


# Job Matcher Service

A high-performance Vercel serverless function that processes job listings with geocoding, distance calculation, and fuzzy keyword matching. Optimized with parallel processing for speed.

## Features

- **Parallel Processing**: Configurable concurrency for job processing and city geocoding
- **Smart Geocoding**: Caching and early-exit optimization to minimize API calls
- **Fuzzy Matching**: Uses Fuse.js for keyword-based job matching (passion, licenses)
- **Distance Sorting**: Haversine distance calculation with smart city selection
- **Comprehensive Debugging**: Detailed debug output matching original script behavior

## API Endpoint

**POST** `/api/job-matcher`

## Request Body

The service expects a JSON object with the following structure:

```typescript
{
  // Required: Job data
  nursing_form_jobs: {
    response_jobs: Array<{
      job_eid?: string;           // Job ID (preferred)
      id?: string;                 // Alternative ID field
      url?: string;                // Alternative ID field
      title?: string;              // Job title
      location?: string;           // Location string (e.g., "City1 CA, City2 NY")
      location_string?: string;    // Alternative location field
      description?: string;        // Job description
      searchable_text?: string;    // Searchable text content
      industry?: string;          // Industry field
      [key: string]: any;         // Any additional fields
    }>;
    
    // Subscriber location (required for distance calculation)
    latitude?: number | string;    // Subscriber latitude
    longitude?: number | string;   // Subscriber longitude
    city_latitude?: number | string;   // Alternative latitude field
    city_longitude?: number | string;  // Alternative longitude field
    subscriber_city?: string;      // Subscriber city name
    subscriber_state?: string;     // Subscriber state abbreviation (REQUIRED)
  };
  
  // Optional: Keyword matching
  job_passion?: string;            // Pipe/comma/semicolon separated phrases (e.g., "nursing|care")
  licenses?: string;               // Pipe/comma/semicolon separated phrases (e.g., "RN|LPN")
  
  // Optional: Configuration
  backfill_when_less_than_3?: boolean;  // Backfill if < 3 matches (default: false)
  job_concurrency?: number;              // Parallel job processing (default: 6)
  city_batch_size?: number;              // Cities geocoded per batch (default: 6)
  early_exit_km?: number;                // Stop geocoding when best ≤ this (default: 100)
  debug?: boolean;                       // Enable verbose debug output (default: false)
  
  // Optional: API Keys (fallback to environment variables)
  rapidapi_key?: string;                // RapidAPI key for geocoding
  google_maps_api_key?: string;         // Google Maps API key (alternative to RapidAPI)
}
```

## Environment Variables

You can also set these in Vercel's environment variables:

- `RAPIDAPI_KEY` - RapidAPI key for Google Maps Geocoding API
- `GOOGLE_MAPS_API_KEY` - Google Maps API key (alternative to RapidAPI)

## Response

```typescript
{
  result: Array<Job>;  // Top 3 matching jobs (max)
  __debug: {
    stage: string;
    inputs: { ... };
    steps: { ... };
    geocode_stats: { ... };
    errors: Array<{ ... }>;
    notes: Array<string>;
  };
}
```

## Example Request

```json
{
  "nursing_form_jobs": {
    "response_jobs": [
      {
        "job_eid": "job1",
        "title": "Registered Nurse",
        "location": "Sacramento CA, Los Angeles CA",
        "description": "Looking for an RN...",
        "searchable_text": "Registered Nurse RN..."
      },
      {
        "job_eid": "job2",
        "title": "Nurse Practitioner",
        "location": "San Francisco CA",
        "description": "NP position..."
      }
    ],
    "latitude": 37.7749,
    "longitude": -122.4194,
    "subscriber_city": "Oakland",
    "subscriber_state": "CA"
  },
  "job_passion": "nursing|RN|healthcare",
  "licenses": "RN|LPN",
  "job_concurrency": 8,
  "city_batch_size": 6,
  "early_exit_km": 100,
  "backfill_when_less_than_3": true,
  "debug": false
}
```

## Example Response

```json
{
  "result": [
    {
      "job_eid": "job1",
      "title": "Registered Nurse",
      "location": "San Francisco CA US",
      "location_string": "San Francisco CA US",
      "distance_km": 12.345
    }
  ],
  "__debug": {
    "stage": "completed",
    "inputs": { ... },
    "steps": { ... },
    "geocode_stats": {
      "cache_hits": 2,
      "cache_misses": 4,
      "http_ok": 4,
      "http_fail": 0,
      "parsed_ok": 4,
      "parsed_fail": 0,
      "calls_made": 4
    },
    "errors": [],
    "notes": []
  }
}
```

## Performance Optimizations

1. **Parallel Job Processing**: Processes multiple jobs concurrently (configurable via `job_concurrency`)
2. **Batch Geocoding**: Geocodes cities in parallel batches (configurable via `city_batch_size`)
3. **Early Exit**: Stops geocoding once a city within `early_exit_km` is found
4. **Caching**: Caches geocoding results per city/state combination
5. **Exact Match Shortcut**: Uses exact city name match without API calls when possible

## Deployment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `RAPIDAPI_KEY` (optional if provided in request)
   - `GOOGLE_MAPS_API_KEY` (optional, alternative to RapidAPI)

## Local Development

```bash
npm install
vercel dev
```

The API will be available at `http://localhost:3000/api/job-matcher`

## Algorithm Overview

1. **Filter by State**: Parse job locations and filter to only cities in subscriber's state
2. **Geocode Cities**: Geocode cities in parallel batches with early-exit optimization
3. **Calculate Distances**: Use Haversine formula to calculate distances
4. **Sort by Distance**: Sort jobs by distance (when coordinates available)
5. **Fuzzy Matching**: Apply Fuse.js fuzzy search for passion/license keywords
6. **Select Top 3**: Pick top 3 jobs matching criteria, with optional backfill

## Differences from Original Script

- **Modern Libraries**: Uses `@googlemaps/google-maps-services-js` for better geocoding support
- **Type Safety**: Fully typed with TypeScript
- **Modular Architecture**: Separated into classes for better maintainability
- **Vercel Optimized**: Built specifically for Vercel serverless functions
- **Better Error Handling**: Improved error handling and validation



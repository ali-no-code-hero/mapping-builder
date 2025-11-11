# Exact Input Format

This document shows **exactly** what needs to be sent to the API endpoint.

## Endpoint

**POST** `https://your-project.vercel.app/api/job-matcher`

## Required Fields

The request body **must** include:

```json
{
  "nursing_form_jobs": {
    "response_jobs": [ /* array of job objects */ ],
    "subscriber_state": "CA"  /* REQUIRED: state abbreviation */
  }
}
```

## Complete Input Object Structure

```json
{
  "nursing_form_jobs": {
    "response_jobs": [
      {
        "job_eid": "string (optional, used as ID)",
        "id": "string (optional, alternative ID)",
        "url": "string (optional, alternative ID)",
        "title": "string (optional)",
        "location": "string (required - format: 'City1 ST, City2 ST')",
        "location_string": "string (optional, alternative to location)",
        "description": "string (optional, used for fuzzy search)",
        "searchable_text": "string (optional, used for fuzzy search)",
        "industry": "string (optional, used for fuzzy search)"
      }
    ],
    "latitude": "number or string (optional)",
    "longitude": "number or string (optional)",
    "city_latitude": "number or string (optional, alternative to latitude)",
    "city_longitude": "number or string (optional, alternative to longitude)",
    "subscriber_city": "string (optional, used for exact match shortcut)",
    "subscriber_state": "string (REQUIRED - e.g., 'CA', 'NY')"
  },
  "job_passion": "string (optional - pipe/comma/semicolon separated: 'nursing|RN|care')",
  "licenses": "string (optional - pipe/comma/semicolon separated: 'RN|LPN')",
  "backfill_when_less_than_3": "boolean (optional, default: false)",
  "job_concurrency": "number (optional, default: 6)",
  "city_batch_size": "number (optional, default: 6)",
  "early_exit_km": "number (optional, default: 100)",
  "debug": "boolean (optional, default: false)",
  "rapidapi_key": "string (optional, falls back to env var)",
  "google_maps_api_key": "string (optional, alternative to RapidAPI)"
}
```

## Minimal Working Example

```json
{
  "nursing_form_jobs": {
    "response_jobs": [
      {
        "job_eid": "1",
        "title": "Nurse",
        "location": "San Francisco CA"
      }
    ],
    "subscriber_state": "CA"
  }
}
```

## Example with All Options

See `example-request.json` for a complete example.

## Response Format

```json
{
  "result": [
    {
      "job_eid": "string",
      "title": "string",
      "location": "City ST US",
      "location_string": "City ST US",
      "distance_km": 12.345,
      // ... all original job fields preserved
    }
  ],
  "__debug": {
    "stage": "completed",
    "inputs": { /* input summary */ },
    "steps": { /* processing steps */ },
    "geocode_stats": { /* geocoding statistics */ },
    "errors": [ /* any errors */ ],
    "notes": [ /* processing notes */ ]
  }
}
```

## cURL Example

```bash
curl -X POST https://your-project.vercel.app/api/job-matcher \
  -H "Content-Type: application/json" \
  -d @example-request.json
```

## JavaScript/TypeScript Example

```typescript
const response = await fetch('https://your-project.vercel.app/api/job-matcher', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    nursing_form_jobs: {
      response_jobs: [
        {
          job_eid: 'job-123',
          title: 'Registered Nurse',
          location: 'San Francisco CA, Oakland CA',
        },
      ],
      latitude: 37.7749,
      longitude: -122.4194,
      subscriber_city: 'Oakland',
      subscriber_state: 'CA',
    },
    job_passion: 'nursing|RN',
    licenses: 'RN',
    job_concurrency: 8,
    city_batch_size: 6,
    early_exit_km: 100,
  }),
});

const data = await response.json();
console.log(data.result); // Top 3 jobs
console.log(data.__debug); // Debug information
```

## Notes

1. **Location Format**: The `location` field should contain cities with state abbreviations, separated by commas. Format: `"City1 ST, City2 ST"` or `"City1 ST US, City2 ST US"`

2. **State Matching**: Only cities matching `subscriber_state` will be considered for each job.

3. **Distance Calculation**: Requires both `latitude` and `longitude` (or `city_latitude`/`city_longitude`) to be provided. If missing, jobs are sorted alphabetically.

4. **Fuzzy Matching**: If `job_passion` or `licenses` are provided, the service will only return jobs that match these keywords using fuzzy search.

5. **API Keys**: You can provide `rapidapi_key` in the request, or set `RAPIDAPI_KEY` environment variable in Vercel. Alternatively, use `GOOGLE_MAPS_API_KEY` for direct Google Maps API access.








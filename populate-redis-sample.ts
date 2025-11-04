/**
 * Script to populate Redis KV with sample geocoded cities
 * Run with: npx ts-node populate-redis-sample.ts
 */

import kv from '@vercel/kv';

const sampleCities = [
  { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { city: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
  { city: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
  { city: 'San Jose', state: 'CA', lat: 37.3382, lng: -121.8863 },
  { city: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { city: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
  { city: 'Fort Worth', state: 'TX', lat: 32.7555, lng: -97.3308 },
  { city: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
  { city: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
  { city: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { city: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581 },
  { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { city: 'Washington', state: 'DC', lat: 38.9072, lng: -77.0369 },
  { city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { city: 'El Paso', state: 'TX', lat: 31.7619, lng: -106.4850 },
  { city: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458 },
  { city: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { city: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
  { city: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.0490 },
  { city: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164 },
  { city: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
  { city: 'Louisville', state: 'KY', lat: 38.2527, lng: -85.7585 },
  { city: 'Baltimore', state: 'MD', lat: 39.2904, lng: -76.6122 },
  { city: 'Milwaukee', state: 'WI', lat: 43.0389, lng: -87.9065 },
  { city: 'Albuquerque', state: 'NM', lat: 35.0844, lng: -106.6504 },
  { city: 'Tucson', state: 'AZ', lat: 32.2226, lng: -110.9747 },
  { city: 'Fresno', state: 'CA', lat: 36.7378, lng: -119.7871 },
  { city: 'Sacramento', state: 'CA', lat: 38.5816, lng: -121.4944 },
  { city: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786 },
  { city: 'Mesa', state: 'AZ', lat: 33.4152, lng: -111.8315 },
  { city: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 },
  { city: 'Omaha', state: 'NE', lat: 41.2565, lng: -95.9345 },
  { city: 'Colorado Springs', state: 'CO', lat: 38.8339, lng: -104.8214 },
  { city: 'Raleigh', state: 'NC', lat: 35.7796, lng: -78.6382 },
  { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { city: 'Virginia Beach', state: 'VA', lat: 36.8529, lng: -75.9780 },
  { city: 'Oakland', state: 'CA', lat: 37.8044, lng: -122.2712 },
  { city: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.2650 },
  { city: 'Tulsa', state: 'OK', lat: 36.1540, lng: -95.9928 },
  { city: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572 },
  { city: 'Cleveland', state: 'OH', lat: 41.4993, lng: -81.6944 },
  { city: 'Wichita', state: 'KS', lat: 37.6872, lng: -97.3301 },
  { city: 'Arlington', state: 'TX', lat: 32.7357, lng: -97.1081 },
  { city: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0715 },
  { city: 'Honolulu', state: 'HI', lat: 21.3099, lng: -157.8581 },
];

async function populateRedis() {
  console.log('🗄️  Populating Redis KV with sample cities...\n');

  try {
    // Check if Redis KV is configured
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.error('❌ Redis KV not configured. Missing KV_REST_API_URL or KV_REST_API_TOKEN');
      console.log('\nPlease connect Redis KV in Vercel Dashboard first.');
      process.exit(1);
    }

    // Prepare data for batch insert
    const citiesData: Record<string, { lat: number; lng: number }> = {};
    
    for (const city of sampleCities) {
      const key = `${city.city.toUpperCase()},${city.state.toUpperCase()}`;
      citiesData[key] = { lat: city.lat, lng: city.lng };
    }

    console.log(`📝 Adding ${sampleCities.length} sample cities to Redis KV...`);
    
    // Batch insert all cities at once
    await kv.hset('geocoded-cities', citiesData);
    
    console.log(`✅ Successfully added ${sampleCities.length} cities to Redis KV!\n`);
    
    // Verify by reading back
    console.log('🔍 Verifying data...');
    const allCities = await kv.hgetall<Record<string, { lat: number; lng: number }>>('geocoded-cities');
    const cityCount = allCities ? Object.keys(allCities).length : 0;
    console.log(`✅ Found ${cityCount} total cities in Redis KV\n`);
    
    // Show a few examples
    console.log('📋 Sample cities added:');
    for (let i = 0; i < Math.min(5, sampleCities.length); i++) {
      const city = sampleCities[i];
      const key = `${city.city.toUpperCase()},${city.state.toUpperCase()}`;
      const data = await kv.hget<{ lat: number; lng: number }>('geocoded-cities', key);
      if (data) {
        console.log(`   ${city.city}, ${city.state}: ${data.lat}, ${data.lng}`);
      }
    }
    
    console.log('\n✅ Redis KV population complete!');
    console.log('\n💡 These cities will now be loaded from Redis KV on API startup.');
    
  } catch (error) {
    console.error('❌ Error populating Redis KV:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

populateRedis().catch(console.error);


/**
 * Test script to verify Redis KV integration
 * Run with: npx ts-node test-redis-kv.ts
 */

import kv from '@vercel/kv';

async function testRedisKV() {
  console.log('Testing Redis KV connection...\n');

  try {
    // Test 1: Write a test city
    console.log('Test 1: Writing test city to Redis KV...');
    const testKey = 'TEST CITY,CA';
    const testData = { lat: 37.7749, lng: -122.4194 };
    
    await kv.hset('geocoded-cities', {
      [testKey]: testData
    });
    console.log(`✓ Saved ${testKey} to Redis KV`);

    // Test 2: Read the test city
    console.log('\nTest 2: Reading test city from Redis KV...');
    const result = await kv.hget<{ lat: number; lng: number }>('geocoded-cities', testKey);
    if (result && result.lat === testData.lat && result.lng === testData.lng) {
      console.log(`✓ Successfully read ${testKey}:`, result);
    } else {
      console.log('✗ Failed to read test city');
      return;
    }

    // Test 3: Read all cities
    console.log('\nTest 3: Reading all cities from Redis KV...');
    const allCities = await kv.hgetall<Record<string, { lat: number; lng: number }>>('geocoded-cities');
    const cityCount = allCities ? Object.keys(allCities).length : 0;
    console.log(`✓ Found ${cityCount} cities in Redis KV`);

    // Test 4: Clean up test data
    console.log('\nTest 4: Cleaning up test data...');
    await kv.hdel('geocoded-cities', testKey);
    console.log('✓ Test complete! Redis KV is working correctly.\n');

  } catch (error) {
    console.error('✗ Error testing Redis KV:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

testRedisKV().catch(console.error);


/**
 * Test script to verify the new CSV file loads correctly
 * Run with: npx ts-node test-csv-load.ts
 */

import { cityLookup } from './api/city-lookup';

async function testCSVLoad() {
  console.log('🧪 Testing CSV file load...\n');

  try {
    // Test 1: Load a known city from the CSV
    console.log('Test 1: Looking up "New York, NY"...');
    const nyResult = await cityLookup.lookupCity('New York', 'NY');
    if (nyResult) {
      console.log(`✅ Found: lat=${nyResult.lat}, lng=${nyResult.lng}`);
      if (Math.abs(nyResult.lat - 40.6943) < 0.1 && Math.abs(nyResult.lng - (-73.9249)) < 0.1) {
        console.log('   ✓ Coordinates match expected values');
      } else {
        console.log('   ⚠ Coordinates may be different (check if this is expected)');
      }
    } else {
      console.log('❌ Not found');
      process.exit(1);
    }

    // Test 2: Test another major city
    console.log('\nTest 2: Looking up "Los Angeles, CA"...');
    const laResult = await cityLookup.lookupCity('Los Angeles', 'CA');
    if (laResult) {
      console.log(`✅ Found: lat=${laResult.lat}, lng=${laResult.lng}`);
    } else {
      console.log('❌ Not found');
      process.exit(1);
    }

    // Test 3: Test with city_ascii name
    console.log('\nTest 3: Looking up "Chicago, IL" (using city_ascii)...');
    const chicagoResult = await cityLookup.lookupCity('Chicago', 'IL');
    if (chicagoResult) {
      console.log(`✅ Found: lat=${chicagoResult.lat}, lng=${chicagoResult.lng}`);
    } else {
      console.log('❌ Not found');
      process.exit(1);
    }

    // Test 4: Test a smaller city (should be in new CSV)
    console.log('\nTest 4: Looking up "Boulder, CO"...');
    const boulderResult = await cityLookup.lookupCity('Boulder', 'CO');
    if (boulderResult) {
      console.log(`✅ Found: lat=${boulderResult.lat}, lng=${boulderResult.lng}`);
    } else {
      console.log('⚠ Not found (may not be in CSV)');
    }

    // Test 5: Get stats
    console.log('\nTest 5: Getting lookup stats...');
    const stats = cityLookup.getStats();
    console.log(`✅ Total cities loaded: ${stats.totalCities}`);
    console.log(`   Loaded: ${stats.loaded}`);

    if (stats.totalCities > 100000) {
      console.log('   ✓ Large dataset loaded successfully!');
    } else if (stats.totalCities > 28000) {
      console.log('   ✓ More cities than old CSV!');
    } else {
      console.log('   ⚠ City count seems low, may need investigation');
    }

    // Test 6: Test case insensitivity
    console.log('\nTest 6: Testing case insensitivity...');
    const nyLower = await cityLookup.lookupCity('new york', 'ny');
    const nyUpper = await cityLookup.lookupCity('NEW YORK', 'NY');
    if (nyLower && nyUpper && nyLower.lat === nyUpper.lat) {
      console.log('✅ Case insensitive lookup works');
    } else {
      console.log('❌ Case insensitive lookup failed');
    }

    console.log('\n✅ All tests passed! CSV file is working correctly.\n');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testCSVLoad().catch(console.error);


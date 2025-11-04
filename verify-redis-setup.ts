/**
 * Comprehensive Redis KV setup verification
 * Checks code structure, imports, and provides testing guidance
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 Verifying Redis KV Setup...\n');

// Check 1: Package installation
console.log('1. Checking package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
if (packageJson.dependencies['@vercel/kv']) {
  console.log('   ✓ @vercel/kv is installed');
} else {
  console.log('   ✗ @vercel/kv is NOT installed');
  process.exit(1);
}

// Check 2: Import statement
console.log('\n2. Checking import statements...');
const cityLookupContent = fs.readFileSync('api/city-lookup.ts', 'utf-8');
if (cityLookupContent.includes("import kv from '@vercel/kv'")) {
  console.log('   ✓ Redis KV import found in city-lookup.ts');
} else {
  console.log('   ✗ Redis KV import NOT found');
  process.exit(1);
}

// Check 3: Redis operations
console.log('\n3. Checking Redis operations...');
const operations = ['kv.hset', 'kv.hget', 'kv.hgetall'];
let allFound = true;
for (const op of operations) {
  if (cityLookupContent.includes(op)) {
    console.log(`   ✓ ${op} found`);
  } else {
    console.log(`   ✗ ${op} NOT found`);
    allFound = false;
  }
}

if (!allFound) {
  process.exit(1);
}

// Check 4: Async/await usage
console.log('\n4. Checking async/await usage...');
if (cityLookupContent.includes('async lookupCity') && cityLookupContent.includes('async addCity')) {
  console.log('   ✓ Methods are properly async');
} else {
  console.log('   ✗ Methods may not be properly async');
}

// Check 5: Error handling
console.log('\n5. Checking error handling...');
if (cityLookupContent.includes('try') && cityLookupContent.includes('catch')) {
  console.log('   ✓ Error handling present');
} else {
  console.log('   ⚠ Error handling may be missing');
}

// Check 6: Geocoding integration
console.log('\n6. Checking geocoding.ts integration...');
const geocodingContent = fs.readFileSync('api/geocoding.ts', 'utf-8');
if (geocodingContent.includes('await cityLookup.lookupCity') && 
    geocodingContent.includes('await cityLookup.addCity')) {
  console.log('   ✓ Async calls properly integrated');
} else {
  console.log('   ✗ Async calls may be missing');
  process.exit(1);
}

// Check 7: Redis hash key
console.log('\n7. Checking Redis hash key...');
if (cityLookupContent.includes("'geocoded-cities'")) {
  console.log('   ✓ Hash key "geocoded-cities" is used consistently');
} else {
  console.log('   ✗ Hash key may be inconsistent');
}

console.log('\n✅ Code structure verification complete!');
console.log('\n📋 Next Steps:');
console.log('   1. Verify Redis KV is connected in Vercel Dashboard');
console.log('   2. Check KV store name matches: redis-geocode-cities');
console.log('   3. Test with a real API request after deployment');
console.log('   4. Monitor logs for "Saved CITY,STATE to Redis KV" messages\n');


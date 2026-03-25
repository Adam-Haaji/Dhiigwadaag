/**
 * Matching engine test: 4 scenarios from docs/MATCHING_ENGINE.md
 * Run: npm run test:matching  (or node tests/matchingEngine.test.js from backend/)
 * Requires: mongodb-memory-server (in-memory MongoDB). If unavailable, exits with 0 and points to the doc.
 */

import { matchDonors } from '../src/services/matchingEngine.js';

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Donor from '../src/models/Donor.js';

let memServer;
let testUserId;

async function connectTestDb() {
  memServer = await MongoMemoryServer.create();
  const uri = memServer.getUri();
  await mongoose.connect(uri, { dbName: 'matching-test' });
  testUserId = new mongoose.Types.ObjectId();
}

async function disconnectTestDb() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (memServer) await memServer.stop();
}

function makeDonor(overrides = {}) {
  const base = {
    user: testUserId,
    fullName: 'Test Donor',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'male',
    phone: '0612345678',
    email: 'test@example.com',
    district: 'Hodan',
    bloodGroup: 'A+',
    weightKg: 60,
    consentGiven: true,
    emergencyContact: { name: 'Contact', relationship: 'Friend', phone: '0698765432' },
    availabilityStatus: 'available',
    isActive: true,
    nextAvailableDate: null,
  };
  return { ...base, ...overrides };
}

async function seedDonorsUniqueUser(docs) {
  let uid = testUserId;
  for (const d of docs) {
    await Donor.create(makeDonor({ ...d, user: uid }));
    uid = new mongoose.Types.ObjectId();
  }
}

async function runTest(name, seed, requestedBlood, requestedDistrict, expected) {
  await Donor.deleteMany({});
  if (seed && seed.length) {
    await seedDonorsUniqueUser(seed);
  }
  const result = await matchDonors(requestedBlood, requestedDistrict, {});
  const ok =
    result.match === expected.match &&
    result.bloodGroupUsed === expected.bloodGroupUsed &&
    result.districtUsed === expected.districtUsed &&
    result.reason === expected.reason &&
    (expected.userMessage == null ? result.userMessage == null : result.userMessage === expected.userMessage);
  if (!ok) {
    console.error(`FAIL: ${name}`);
    console.error('  Expected:', expected);
    console.error('  Got:     ', result);
    return false;
  }
  console.log(`PASS: ${name}`);
  return true;
}

async function main() {
  console.log('Matching engine tests (in-memory MongoDB)\n');
  try {
    await connectTestDb();
  } catch (e) {
    console.error('Could not start in-memory MongoDB. Run: npm install mongodb-memory-server (dev). Skipping integration tests.');
    console.log('Test matrix and expected outputs are in backend/docs/MATCHING_ENGINE.md');
    process.exit(0);
  }

  let passed = 0;
  let failed = 0;

  // 1) A+ requested in Hodan, A+ available in Hodan => match Hodan
  const r1 = await runTest(
    '1) Exact match same district (A+ in Hodan)',
    [{ bloodGroup: 'A+', district: 'Hodan' }],
    'A+',
    'Hodan',
    {
      match: true,
      bloodGroupUsed: 'A+',
      districtUsed: 'Hodan',
      reason: 'exact_same_district',
      userMessage: null,
    }
  );
  if (r1) passed++; else failed++;

  // 2) A+ requested in Hodan, A+ not in Hodan but in Waaberi => match Waaberi
  const r2 = await runTest(
    '2) Exact match nearest district (A+ in Waaberi only)',
    [{ bloodGroup: 'A+', district: 'Waaberi' }],
    'A+',
    'Hodan',
    {
      match: true,
      bloodGroupUsed: 'A+',
      districtUsed: 'Waaberi',
      reason: 'exact_nearest_district',
      userMessage: 'Not available in Hodan, found in Waaberi.',
    }
  );
  if (r2) passed++; else failed++;

  // 3) A+ requested in Hodan, no A+ anywhere, O+ in Waaberi => match O+ in Waaberi
  const r3 = await runTest(
    '3) Compatible blood in nearest district (O+ in Waaberi)',
    [{ bloodGroup: 'O+', district: 'Waaberi' }],
    'A+',
    'Hodan',
    {
      match: true,
      bloodGroupUsed: 'O+',
      districtUsed: 'Waaberi',
      reason: 'compatible',
      userMessage: 'Requested A+ not available. Found compatible blood O+ in Waaberi.',
    }
  );
  if (r3) passed++; else failed++;

  // 4) No compatible blood => not available
  const r4 = await runTest(
    '4) No compatible blood anywhere',
    [], // no donors
    'A+',
    'Hodan',
    {
      match: false,
      bloodGroupUsed: null,
      districtUsed: null,
      reason: 'not_available',
      userMessage: 'No compatible blood available.',
    }
  );
  if (r4) passed++; else failed++;

  await disconnectTestDb();
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

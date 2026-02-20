#!/usr/bin/env node
/**
 * Migration Script: Separate Users, Donors, and Requesters
 * 
 * This script migrates existing data to enforce collection separation:
 * - users collection: Only normal users (role: 'user' or 'none')
 * - donors collection: All donor records (linked via userId)
 * - requesters collection: All requester records (linked via userId)
 * 
 * IMPORTANT: This script does NOT delete data, it only reorganizes it.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Donor from '../src/models/Donor.js';
import Requester from '../src/models/Requester.js';
import BloodRequest from '../src/models/BloodRequest.js';
import Request from '../src/models/Request.js';

function redact(uri) {
  try {
    const u = new URL(uri);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '<invalid-uri>';
  }
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in backend/.env');
    process.exit(1);
  }
  
  let dbName = process.env.MONGO_DB_NAME || 'BloodDonationDB';
  try {
    const u = new URL(uri);
    const pathDb = (u.pathname || '').replace(/^\//, '');
    if (pathDb) dbName = pathDb;
  } catch {}
  
  const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';

  console.log('🔗 Connecting to:', redact(uri), 'dbName=', dbName, 'authSource=', authSource);
  await mongoose.connect(uri, { dbName, authSource });
  console.log('✅ Connected to MongoDB\n');

  let migratedDonors = 0;
  let migratedRequesters = 0;
  let usersUpdated = 0;
  let errors = [];

  try {
    // Step 1: Find all users with role 'donor' or 'both'
    console.log('📊 Step 1: Finding users with donor role...');
    const donorUsers = await User.find({ 
      role: { $in: ['donor', 'both'] } 
    }).lean();
    console.log(`   Found ${donorUsers.length} users with donor role\n`);

    // Step 2: Migrate donors
    for (const user of donorUsers) {
      try {
        // Check if donor record already exists
        const existingDonor = await Donor.findOne({ user: user._id }).lean();
        if (existingDonor) {
          console.log(`   ⏭️  Donor record already exists for user ${user.email}`);
          continue;
        }

        // Create donor record from user data
        const donorData = {
          user: user._id,
          fullName: user.name || 'Unknown',
          email: user.email || '',
          phone: user.phone || '',
          district: user.location || 'Unknown',
          bloodGroup: user.bloodType || 'O+',
          dateOfBirth: user.dateOfBirth || new Date(2000, 0, 1), // Default if missing
          gender: user.gender || 'male',
          weightKg: user.weightKg || 50,
          consentGiven: true,
          lastDonationDate: user.lastDonationDate || new Date(2000, 0, 1),
          availabilityStatus: user.donorStatus === 'available' ? 'available' : 'unavailable',
          isActive: user.availability !== false,
          emergencyContact: {
            name: user.name || 'Unknown',
            relationship: 'self',
            phone: user.phone || '',
          },
        };

        await Donor.create(donorData);
        migratedDonors++;
        console.log(`   ✅ Created donor record for ${user.email}`);
      } catch (err) {
        const errorMsg = `Failed to migrate donor ${user.email}: ${err.message}`;
        console.error(`   ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Step 3: Find all users with role 'requester' or 'both'
    console.log('\n📊 Step 2: Finding users with requester role...');
    const requesterUsers = await User.find({ 
      role: { $in: ['requester', 'both'] } 
    }).lean();
    console.log(`   Found ${requesterUsers.length} users with requester role\n`);

    // Step 4: Migrate requesters
    for (const user of requesterUsers) {
      try {
        // Check if requester record already exists
        const existingRequester = await Requester.findOne({ user: user._id }).lean();
        if (existingRequester) {
          console.log(`   ⏭️  Requester record already exists for user ${user.email}`);
          continue;
        }

        // Create requester record
        await Requester.create({ user: user._id });
        migratedRequesters++;
        console.log(`   ✅ Created requester record for ${user.email}`);
      } catch (err) {
        const errorMsg = `Failed to migrate requester ${user.email}: ${err.message}`;
        console.error(`   ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Step 5: Update all users to have role 'user' (except admins)
    console.log('\n📊 Step 3: Updating user roles to "user"...');
    const result = await User.updateMany(
      { role: { $in: ['donor', 'requester', 'both', 'none'] } },
      { $set: { role: 'user' } }
    );
    usersUpdated = result.modifiedCount;
    console.log(`   ✅ Updated ${usersUpdated} users to role 'user'\n`);

    // Step 6: Verify migration
    console.log('📊 Step 4: Verifying migration...');
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const totalDonors = await Donor.countDocuments();
    const totalRequesters = await Requester.countDocuments();
    
    console.log(`   Users (normal): ${totalUsers}`);
    console.log(`   Donors: ${totalDonors}`);
    console.log(`   Requesters: ${totalRequesters}\n`);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 MIGRATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Migrated ${migratedDonors} donors`);
    console.log(`✅ Migrated ${migratedRequesters} requesters`);
    console.log(`✅ Updated ${usersUpdated} users to role 'user'`);
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} errors occurred:`);
      errors.forEach(e => console.log(`   - ${e}`));
    } else {
      console.log('✅ No errors occurred');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('❌ Migration failed:', err?.message || err);
    console.error(err?.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main().catch(e => {
  console.error('Failed:', e?.message || e);
  process.exit(1);
});

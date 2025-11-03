#!/usr/bin/env node
// Backfill Donor.isActive, nextAvailableDate, and availabilityStatus based on lastDonationDate.
// Dry-run by default; use --write to persist changes.

import 'dotenv/config';
import connectDB from '../src/config/db.js';
import Donor from '../src/models/Donor.js';
import { addDays, isPast, yearsBetween } from '../src/utils/dateUtils.js';

const WRITE = process.argv.includes('--write');

function computeFields(d) {
  const out = {};
  // Compute age if missing
  if ((d.age === undefined || d.age === null) && d.dateOfBirth) {
    out.age = yearsBetween(d.dateOfBirth);
  }
  // Compute nextAvailableDate and isActive
  if (d.lastDonationDate) {
    const nextAvail = addDays(d.lastDonationDate, 90);
    out.nextAvailableDate = nextAvail;
    const active = isPast(nextAvail);
    out.isActive = active;
    // Align availabilityStatus with active flag if it is inconsistent
    const desiredStatus = active ? 'available' : 'unavailable';
    if (d.availabilityStatus !== desiredStatus) out.availabilityStatus = desiredStatus;
  } else {
    // If somehow missing lastDonationDate, default to active
    out.isActive = true;
    if (d.availabilityStatus !== 'available') out.availabilityStatus = 'available';
  }
  return out;
}

function diff(a, b) {
  const changed = {};
  for (const k of Object.keys(b)) {
    if (b[k] !== undefined && String(a[k]) !== String(b[k])) changed[k] = { from: a[k], to: b[k] };
  }
  return changed;
}

async function main() {
  await connectDB();
  const donors = await Donor.find({}).limit(10000);
  let changed = 0;
  for (const d of donors) {
    const updates = computeFields(d);
    const changes = diff(d.toObject(), updates);
    const keys = Object.keys(changes);
    if (keys.length) {
      console.log(`${WRITE ? '[WRITE]':'[DRY]'} Donor ${d.fullName} changes:`, changes);
      if (WRITE) {
        Object.assign(d, updates);
        await d.save();
      }
      changed++;
    }
  }
  console.log(`Donors processed: ${donors.length}. Donors changed: ${changed}. Mode: ${WRITE ? 'WRITE' : 'DRY-RUN'}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
// Sync and repair BloodRequest<->Donor matching state so you can verify the workflow end-to-end.
// Usage:
//   node ./scripts/sync-matches.mjs            # dry-run (default)
//   node ./scripts/sync-matches.mjs --write    # persist changes
//   node ./scripts/sync-matches.mjs --request <id>  # limit to one BloodRequest

import 'dotenv/config';
import connectDB from '../src/config/db.js';
import BloodRequest from '../src/models/BloodRequest.js';
import Donor from '../src/models/Donor.js';
import { addDays } from '../src/utils/dateUtils.js';

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const idxReq = argv.indexOf('--request');
const TARGET_ID = idxReq >= 0 ? argv[idxReq + 1] : null;

function logChange(kind, before, after) {
  const header = WRITE ? '[WRITE]' : '[DRY]';
  console.log(`${header} ${kind}:`, JSON.stringify({ before, after }, null, 2));
}

async function findEligibleDonor({ bloodGroup, district }) {
  const q = {
    bloodGroup,
    availabilityStatus: 'available',
    isActive: true,
  };
  if (district) q.district = district;
  return Donor.findOne(q).select('_id user bloodGroup district availabilityStatus isActive');
}

async function ensureMatchForRequest(reqDoc) {
  // If request is cancelled or completed, ensure donors don't stay stuck
  const status = String(reqDoc.status || '').toLowerCase();
  if (['cancelled', 'completed'].includes(status)) {
    if (reqDoc.donorId) {
      const donor = await Donor.findById(reqDoc.donorId).select('_id matchedRequest');
      if (donor && String(donor.matchedRequest) === String(reqDoc._id)) {
        logChange('clear matchedRequest (request closed)', { donorId: donor._id, matchedRequest: donor.matchedRequest }, { matchedRequest: null });
        if (WRITE) { donor.matchedRequest = null; await donor.save(); }
      }
    }
    return { matched: false };
  }

  // If already has a donor, ensure donor.matchedRequest is set
  if (reqDoc.donorId) {
    const donor = await Donor.findById(reqDoc.donorId).select('_id matchedRequest');
    if (donor && String(donor.matchedRequest) !== String(reqDoc._id)) {
      logChange('fix donor.matchedRequest', { donorId: donor._id, matchedRequest: donor.matchedRequest }, { matchedRequest: reqDoc._id });
      if (WRITE) { donor.matchedRequest = reqDoc._id; await donor.save(); }
    }
    // Ensure status reflects matched
    if (String(reqDoc.status).toLowerCase() === 'pending') {
      logChange('status->matched', { requestId: reqDoc._id, status: reqDoc.status }, { status: 'matched' });
      if (WRITE) { reqDoc.status = 'matched'; await reqDoc.save(); }
    }
    return { matched: true };
  }

  // Try to find a donor
  const donor = await findEligibleDonor({ bloodGroup: reqDoc.bloodGroup, district: reqDoc.district });
  if (!donor) return { matched: false };

  logChange('assign match', {
    requestId: reqDoc._id,
    status: reqDoc.status,
    donorId: null,
  }, {
    status: 'matched',
    donorId: donor._id,
    donorMatchedRequest: reqDoc._id,
  });
  if (WRITE) {
    reqDoc.status = 'matched';
    reqDoc.donorId = donor._id;
    await reqDoc.save();
    donor.matchedRequest = reqDoc._id;
    await donor.save();
  }
  return { matched: true };
}

async function enforceCooldownForDonated(reqDoc) {
  // Only for donated/completed
  const status = String(reqDoc.status || '').toLowerCase();
  if (!['donated', 'completed'].includes(status)) return false;
  if (!reqDoc.donorId && !reqDoc.fulfilledBy) return false;
  const donorId = reqDoc.fulfilledBy || reqDoc.donorId;
  const donor = await Donor.findById(donorId);
  if (!donor) return false;

  const now = new Date();
  const fulfilledAt = reqDoc.fulfilledAt || now;
  const nextAvail = addDays(fulfilledAt, 90);

  const needUpdate = !donor.lastDonationDate || donor.isActive || String(donor.availabilityStatus) !== 'unavailable';
  if (!needUpdate) return false;

  logChange('apply cooldown', {
    donorId: donor._id,
    availabilityStatus: donor.availabilityStatus,
    isActive: donor.isActive,
    lastDonationDate: donor.lastDonationDate,
    nextAvailableDate: donor.nextAvailableDate,
  }, {
    availabilityStatus: 'unavailable',
    isActive: false,
    lastDonationDate: fulfilledAt,
    nextAvailableDate: nextAvail,
  });
  if (WRITE) {
    donor.availabilityStatus = 'unavailable';
    donor.isActive = false;
    donor.lastDonationDate = fulfilledAt;
    donor.nextAvailableDate = nextAvail;
    await donor.save();
  }
  return true;
}

async function main() {
  await connectDB();
  const q = TARGET_ID ? { _id: TARGET_ID } : {};
  const reqs = await BloodRequest.find(q).sort({ createdAt: -1 });
  console.log(`Loaded ${reqs.length} BloodRequests${TARGET_ID ? ' (filtered)' : ''}. Mode: ${WRITE ? 'WRITE' : 'DRY-RUN'}`);

  let matchedCount = 0;
  let cooldownCount = 0;
  for (const reqDoc of reqs) {
    const res = await ensureMatchForRequest(reqDoc);
    if (res.matched) matchedCount++;
    const cd = await enforceCooldownForDonated(reqDoc);
    if (cd) cooldownCount++;
  }

  console.log(`Summary: { matchedAdjusted: ${matchedCount}, cooldownApplied: ${cooldownCount} }`);
  if (!WRITE) console.log('No changes were written. Re-run with --write to persist.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

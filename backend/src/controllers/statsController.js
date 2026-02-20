import Donor from '../models/Donor.js';
import User from '../models/User.js';
import Request from '../models/Request.js';
import BloodRequest from '../models/BloodRequest.js';

// GET /api/stats/summary
// Returns aggregate totals used by the home dashboard
export async function getSummary(req, res) {
  try {
    // Compute donors using multiple strategies to avoid undercounting:
    // 1) Count of Donor docs (covers profiles even if user ref missing in some older data)
    // 2) Count of Users with donor/both role (legacy donors)
    // 3) Unique union by user id when links are present
    const [donorDocs, donorsCount, donorUsers, legacyReqCount, brCount, legacyFulfilled, brFulfilled, brCompleted] = await Promise.all([
      Donor.find({}, { user: 1 }).lean(),
      Donor.countDocuments({}),
      Donor.find({}, { _id: 1 }).lean(),
      Request.countDocuments({}),
      BloodRequest.countDocuments({}),
      Request.countDocuments({ status: 'Fulfilled' }),
      BloodRequest.countDocuments({ status: 'fulfilled' }),
      BloodRequest.countDocuments({ status: 'completed' }),
    ]);

    const ids = new Set();
    for (const d of donorDocs) { if (d?.user) ids.add(String(d.user)); }
    for (const u of donorUsers) { if (u?._id) ids.add(String(u._id)); }
    const unionUnique = ids.size;

    const donorUsersCount = donorUsers.length;
    const totalDonors = Math.max(donorsCount, donorUsersCount, unionUnique);
    const totalRequests = legacyReqCount + brCount;
    const livesSaved = legacyFulfilled + brFulfilled + brCompleted;

    return res.json({ totalDonors, totalRequests, livesSaved });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to compute stats' });
  }
}

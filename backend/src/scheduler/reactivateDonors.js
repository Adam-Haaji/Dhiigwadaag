import cron from 'node-cron';
import Donor from '../models/Donor.js';
import Notification from '../models/Notification.js';
import { addDays, isPast } from '../utils/dateUtils.js';

function computeNextAvailableDate(lastDonationDate) {
  if (!lastDonationDate) return null;
  return addDays(lastDonationDate, 90);
}

export function startDonorReactivationCron() {
  // Run daily at 03:00 server time
  cron.schedule('0 3 * * *', async () => {
    try {
      const now = new Date();
      const candidates = await Donor.find({ isActive: false }).select('_id lastDonationDate nextAvailableDate availabilityStatus');
      const toUpdate = [];
      for (const d of candidates) {
        const nextAvail = d.nextAvailableDate || computeNextAvailableDate(d.lastDonationDate);
        if (nextAvail && isPast(nextAvail)) {
          toUpdate.push(d._id);
        }
      }
      if (toUpdate.length) {
        const donors = await Donor.find({ _id: { $in: toUpdate } }).select('_id user');
        await Donor.updateMany(
          { _id: { $in: toUpdate } },
          { $set: { isActive: true, availabilityStatus: 'available', nextAvailableDate: null, matchedRequest: null } }
        );
        // Notify donors that they are available again
        try {
          const notes = donors
            .filter(d => d.user)
            .map(d => ({
              userId: d.user,
              title: 'You are available again',
              message: 'Your donor status is now available again after the cooldown period.',
              type: 'request',
              urgent: false,
              meta: { source: 'scheduler', kind: 're-available' },
            }));
          if (notes.length) await Notification.insertMany(notes);
        } catch (notifyErr) {
          console.error('[cron] Reactivation notify error:', notifyErr?.message || notifyErr);
        }
        console.log(`[cron] Reactivated donors: ${toUpdate.length}`);
      }
    } catch (e) {
      console.error('[cron] Reactivation error:', e?.message || e);
    }
  });
}

export default { startDonorReactivationCron };

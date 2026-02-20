import Request from '../models/Request.js';
import BloodRequest from '../models/BloodRequest.js';
import Notification from '../models/Notification.js';
import { isDBReady } from '../config/db.js';

const MINUTE = 60 * 1000;

export function startExpiryScheduler({ intervalMinutes = 5 } = {}) {
  const intervalMs = Math.max(1, intervalMinutes) * MINUTE;

  async function tick() {
    const now = new Date();
    try {
      if (!isDBReady()) {
        // Database not ready yet; skip this tick silently
        return;
      }
      // Expire Request model records (legacy)
      const activeStatuses = ['Pending', 'Matched', 'Accepted', 'Contacted'];
      const toExpire = await Request.find({ 
        status: { $in: activeStatuses }, 
        expiresAt: { $exists: true, $lte: now } 
      }).select('_id requesterId status').lean();
      
      if (toExpire.length) {
        const ids = toExpire.map(r => r._id);
        await Request.updateMany({ _id: { $in: ids } }, { $set: { status: 'Expired' } });
        // Notify requesters
        const notifications = toExpire.map(r => ({
          userId: r.requesterId,
          title: 'Request Expired',
          message: 'Your blood request has expired. You can create a new one if needed.',
          type: 'request',
          urgent: false,
          meta: { requestId: r._id, status: 'Expired' },
        }));
        if (notifications.length) await Notification.insertMany(notifications);
      }

      // Expire BloodRequest model records
      const activeBloodStatuses = ['pending', 'matched', 'accepted'];
      const toExpireBlood = await BloodRequest.find({ 
        status: { $in: activeBloodStatuses }, 
        expiresAt: { $exists: true, $lte: now } 
      }).select('_id requesterId status').lean();
      
      if (toExpireBlood.length) {
        const ids = toExpireBlood.map(r => r._id);
        await BloodRequest.updateMany({ _id: { $in: ids } }, { $set: { status: 'expired' } });
        // Notify requesters
        const notifications = toExpireBlood.map(r => ({
          userId: r.requesterId,
          title: 'Request Expired',
          message: 'Your blood request has expired. You can create a new one if needed.',
          type: 'request',
          urgent: false,
          meta: { requestId: r._id, status: 'expired' },
        }));
        if (notifications.length) await Notification.insertMany(notifications);
      }
    } catch (e) {
      console.error('Expiry scheduler tick error:', e?.message || e);
    }
  }

  // Kick off
  tick();
  const handle = setInterval(tick, intervalMs);
  return handle;
}

export default startExpiryScheduler;
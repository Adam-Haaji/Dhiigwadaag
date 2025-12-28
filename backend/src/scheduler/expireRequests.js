import Request from '../models/Request.js';
import Notification from '../models/Notification.js';

const MINUTE = 60 * 1000;

export function startExpiryScheduler({ intervalMinutes = 5, emergencyHours = 1, normalHours = 12 } = {}) {
  const intervalMs = Math.max(1, intervalMinutes) * MINUTE;
  const emergencyMs = Math.max(1, emergencyHours) * 60 * MINUTE;
  const normalMs = Math.max(1, normalHours) * 60 * MINUTE;

  async function tick() {
    const now = Date.now();
    try {
      // Ensure expiresAt exists; backfill for missing records
      await Request.updateMany(
        { requestType: 'emergency', expiresAt: { $exists: false } },
        [{ $set: { expiresAt: { $add: ['$createdAt', emergencyMs] } } }]
      );
      await Request.updateMany(
        { $or: [{ requestType: { $exists: false } }, { requestType: 'normal' }], expiresAt: { $exists: false } },
        [{ $set: { expiresAt: { $add: ['$createdAt', normalMs] } } }]
      );

      // Expire any active requests past expiry
      const activeStatuses = ['Waiting', 'Matched', 'Accepted'];
      const toExpire = await Request.find({ status: { $in: activeStatuses }, expiresAt: { $lte: new Date(now) } }).select('_id requesterId status');
      if (toExpire.length) {
        const ids = toExpire.map(r => r._id);
        await Request.updateMany({ _id: { $in: ids } }, { $set: { status: 'Expired' } });
        // Optionally notify requesters
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
/**
 * Idempotent notification creation: at most one notification per (userId, requestId, eventType).
 * Prevents duplicate MATCHED / DONOR_ACCEPTED / FULFILLED notifications and regressions.
 * @param {Model} Notification - Mongoose Notification model
 * @param {{ userId: any, title: string, message: string, type?: string, urgent?: boolean, meta?: object }} payload
 * @returns {Promise<boolean>} - true if created, false if skipped (duplicate)
 */
export async function createNotificationOnce(Notification, payload) {
  const { userId, title, message, type = 'request', urgent = false, meta = {} } = payload;
  const requestId = meta?.requestId;
  const eventType = meta?.type;

  const debug = String(process.env.DEBUG_NOTIFICATIONS || '').toLowerCase();
  const debugOn = debug === '1' || debug === 'true' || debug === 'yes';
  const isRequesterAudience = String(meta?.audience || '').toLowerCase() === 'requester';
  if (debugOn && isRequesterAudience) {
    console.log('[notifications] requester:createOnce:attempt', {
      userId: String(userId),
      requestId: requestId ? String(requestId) : null,
      eventType: eventType ? String(eventType) : null,
      title,
    });
  }

  if (requestId && eventType) {
    const result = await Notification.updateOne(
      {
        userId,
        'meta.requestId': requestId,
        'meta.type': eventType,
      },
      {
        $setOnInsert: { userId, title, message, type, urgent, meta },
      },
      { upsert: true }
    );

    const created = !!(result && (result.upsertedId || result.upsertedCount));
    if (!created) {
      if (debugOn && isRequesterAudience) {
        console.log('[notifications] requester:createOnce:skip_duplicate', {
          userId: String(userId),
          requestId: String(requestId),
          eventType: String(eventType),
        });
      }
      return false;
    }

    if (debugOn && isRequesterAudience) {
      console.log('[notifications] requester:createOnce:created', {
        userId: String(userId),
        requestId: requestId ? String(requestId) : null,
        eventType: eventType ? String(eventType) : null,
      });
    }
    return true;
  }

  await Notification.create({ userId, title, message, type, urgent, meta });

  if (debugOn && isRequesterAudience) {
    console.log('[notifications] requester:createOnce:created', {
      userId: String(userId),
      requestId: requestId ? String(requestId) : null,
      eventType: eventType ? String(eventType) : null,
    });
  }
  return true;
}

/**
 * Filter an array of notification payloads to only those that do not already exist.
 * Use before insertMany for bulk idempotent creation.
 * @param {Model} Notification - Mongoose Notification model
 * @param {Array<{ userId: any, title: string, message: string, type?: string, urgent?: boolean, meta?: object }>} notes
 * @returns {Promise<Array>} - subset of notes that can be inserted without duplicates
 */
export async function filterNewNotifications(Notification, notes) {
  if (!notes || notes.length === 0) return [];
  const debug = String(process.env.DEBUG_NOTIFICATIONS || '').toLowerCase();
  const debugOn = debug === '1' || debug === 'true' || debug === 'yes';

  const toInsert = [];
  for (const n of notes) {
    const requestId = n.meta?.requestId;
    const eventType = n.meta?.type;
    if (!requestId || !eventType) {
      toInsert.push(n);
      continue;
    }
    const exists = await Notification.exists({
      userId: n.userId,
      'meta.requestId': requestId,
      'meta.type': eventType,
    });
    if (!exists) {
      toInsert.push(n);
      continue;
    }

    if (debugOn && String(n.meta?.audience || '').toLowerCase() === 'requester') {
      console.log('[notifications] requester:filterNew:skip_duplicate', {
        userId: String(n.userId),
        requestId: String(requestId),
        eventType: String(eventType),
      });
    }
  }
  return toInsert;
}

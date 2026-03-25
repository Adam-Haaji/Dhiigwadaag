import mongoose from 'mongoose';
let MongoMemoryServer = null;
try {
  // Optional dev dependency used only as fallback when Atlas is unreachable
  ({ MongoMemoryServer } = await import('mongodb-memory-server'));
} catch {}

// Track connection state to prevent repeated log spam + ensure single connect.
let connectionAttempted = false;
let usingMemoryDB = false;

let handlersRegistered = false;
let reconnectTimer = null;
let reconnectAttempt = 0;
let lastConnectConfig = null;
let connectInFlight = null;
let lastLoggedState = null; // 'connected' | 'disconnected' | 'reconnecting'

const envInt = (key, fallback) => {
  const raw = process.env[key];
  if (raw == null || String(raw).trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const logStateOnce = (state, message) => {
  if (lastLoggedState === state) return;
  lastLoggedState = state;
  // Keep logs short/consistent; callers decide emoji.
  console.log(message);
};

const registerConnectionHandlers = () => {
  if (handlersRegistered) return;
  handlersRegistered = true;

  const conn = mongoose.connection;

  conn.on('connected', () => {
    reconnectAttempt = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    logStateOnce('connected', '✅ Mongo connected');
  });

  conn.on('disconnected', () => {
    // Note: the driver may briefly disconnect/reconnect on network hiccups.
    // We only schedule a reconnect attempt after a backoff delay; if the driver
    // reconnects on its own before the timer fires, we'll cancel it in 'connected'.
    logStateOnce('disconnected', '⚠️ Mongo disconnected');
    scheduleReconnect('disconnected');
  });

  conn.on('error', (err) => {
    // Avoid reconnect storms: only schedule reconnect if we're not currently connected.
    console.error('Mongo connection error:', err?.message || err);
    if (mongoose.connection.readyState !== 1) {
      scheduleReconnect('error');
    }
  });
};

const scheduleReconnect = (reason) => {
  // Avoid reconnect loops if using in-memory fallback.
  if (usingMemoryDB) return;
  if (!lastConnectConfig) return;
  if (mongoose.connection.readyState === 1) return; // already connected
  if (connectInFlight) return; // a connect() is already in progress
  if (reconnectTimer) return; // already scheduled

  reconnectAttempt += 1;
  const base = envInt('MONGO_RECONNECT_BASE_MS', 1000);
  const max = envInt('MONGO_RECONNECT_MAX_MS', 30000);
  const delayNoJitter = Math.min(max, base * Math.pow(2, Math.min(reconnectAttempt - 1, 10)));
  const jitter = Math.floor(Math.random() * Math.min(250, delayNoJitter));
  const delay = delayNoJitter + jitter;

  logStateOnce('reconnecting', `⏳ Mongo reconnect scheduled in ${delay}ms (${reason})`);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await connectDB();
    } catch (e) {
      console.error('Mongo reconnect failed:', e?.message || e);
      scheduleReconnect('reconnect_failed');
    }
  }, delay);
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Mongo connection failed: MONGO_URI not set.');
    process.exit(1);
  }

  // Ensure exactly one connect attempt at a time.
  if (mongoose.connection.readyState === 1) return;
  if (connectInFlight) return connectInFlight;

  // Require SRV format for Atlas (do not use shard hostnames like ac-xxx-shard-00-01.xxx.mongodb.net)
  if (!uri.startsWith('mongodb+srv://')) {
    console.warn('MONGO_URI should use Atlas SRV format: mongodb+srv://<user>:<encodedPassword>@<cluster>.mongodb.net/<dbName>?retryWrites=true&w=majority');
  }
  if (!connectionAttempted) {
    console.log('Connecting to MongoDB...');
  }

  connectInFlight = (async () => {
    try {
      registerConnectionHandlers();

      // If URI path has no DB name, use MONGO_DB_NAME (fallback to 'blood-donation')
      let dbName = process.env.MONGO_DB_NAME || 'blood-donation';
      try {
        const u = new URL(uri);
        const pathDb = (u.pathname || '').replace(/^\//, '');
        if (pathDb) dbName = pathDb; // prefer DB in URI if provided
      } catch {
        // ignore URL parse errors; rely on env fallback
      }

      const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';

      const connectionOptions = {
        dbName,
        authSource,

        // Intermittent network + DNS/SRV quirks can need more time.
        serverSelectionTimeoutMS: envInt('MONGO_SERVER_SELECTION_TIMEOUT_MS', 30000),
        connectTimeoutMS: envInt('MONGO_CONNECT_TIMEOUT_MS', 30000),

        // Operation socket timeout. Defaulting to 0 avoids closing sockets during
        // momentary stalls; keep it configurable via env.
        socketTimeoutMS: envInt('MONGO_SOCKET_TIMEOUT_MS', 0),

        // Pool sizing: stable defaults for dev.
        maxPoolSize: envInt('MONGO_MAX_POOL_SIZE', 10),
        minPoolSize: envInt('MONGO_MIN_POOL_SIZE', 0),
        maxIdleTimeMS: envInt('MONGO_MAX_IDLE_TIME_MS', 120000),

        // Driver retries.
        retryWrites: true,
        retryReads: true,
      };

      lastConnectConfig = { uri, options: connectionOptions };

      await mongoose.connect(uri, connectionOptions);
      connectionAttempted = true;
      // Detailed one-time success line; subsequent reconnects use state-change logger.
      if (!usingMemoryDB) {
        console.log(`✅ Connected to MongoDB Atlas (db: ${dbName}, authSource: ${authSource})`);
      }
    } finally {
      connectInFlight = null;
    }
  })();

  try {
    await connectInFlight;
  } catch (err) {
    const message = err?.message || String(err);
    console.error('Mongo connection failed:', message);
    try {
      const uriSafe = process.env.MONGO_URI || '';
      let dbName = process.env.MONGO_DB_NAME || 'blood-donation';
      let host = '';
      try {
        const u = new URL(uriSafe);
        host = (u.hostname || u.host) || '';
        const pathDb = (u.pathname || '').replace(/^\//, '');
        if (pathDb) dbName = pathDb;
      } catch {}
      if (host.includes('shard-00')) {
        console.error('Use SRV format only. Do not use shard hostnames (e.g. ac-xxx-shard-00-01.xxx.mongodb.net). Use: mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/dbname?retryWrites=true&w=majority');
      }
      console.error(`- Host: ${host || '(unknown)'}`);
      console.error(`- Db:   ${dbName}`);
      console.error(`- AuthSource: ${process.env.MONGO_AUTH_SOURCE || 'admin'}`);
    } catch {}
    // Development fallback: start in-memory Mongo if available
    const allowMemory = String(process.env.MONGO_FALLBACK_MEMORY || 'true').toLowerCase() !== 'false';
    if (allowMemory && MongoMemoryServer) {
      try {
        const mem = await MongoMemoryServer.create();
        const memUri = mem.getUri();
        const dbName = process.env.MONGO_DB_NAME || 'blood-donation';
        await mongoose.connect(memUri, { dbName });
        usingMemoryDB = true;
        connectionAttempted = true;
        lastLoggedState = null;
        console.warn(`⚠️ Using in-memory MongoDB for development at ${memUri} (db: ${dbName}). Data resets on restart.`);
        return;
      } catch (e) {
        console.error('Failed to start in-memory MongoDB fallback:', e?.message || e);
      }
    }
    // If fallback not allowed/available, exit as before
    process.exit(1);
  }
};

// Helper function to check if database is ready
export const isDBReady = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

// Helper function to check if using memory DB
export const isUsingMemoryDB = () => {
  return usingMemoryDB;
};

export default connectDB;

import mongoose from 'mongoose';
let MongoMemoryServer = null;
try {
  // Optional dev dependency used only as fallback when Atlas is unreachable
  ({ MongoMemoryServer } = await import('mongodb-memory-server'));
} catch {}

// Track connection state to prevent repeated error logs
let connectionAttempted = false;
let usingMemoryDB = false;

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Mongo connection failed: MONGO_URI not set.');
    process.exit(1);
  }
  // Require SRV format for Atlas (do not use shard hostnames like ac-xxx-shard-00-01.xxx.mongodb.net)
  if (!uri.startsWith('mongodb+srv://')) {
    console.warn('MONGO_URI should use Atlas SRV format: mongodb+srv://<user>:<encodedPassword>@<cluster>.mongodb.net/<dbName>?retryWrites=true&w=majority');
  }
  console.log('Connecting to MongoDB...');

  try {
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
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
  };
  
  await mongoose.connect(uri, connectionOptions);
  connectionAttempted = true;
  console.log('Mongo connected.');
  console.log(`✅ Connected to MongoDB Atlas (db: ${dbName}, authSource: ${authSource})`);
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

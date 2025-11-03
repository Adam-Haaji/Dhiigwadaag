import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set');

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
  await mongoose.connect(uri, { dbName, authSource });
  console.log(`✅ Connected to MongoDB Atlas (db: ${dbName}, authSource: ${authSource})`);
  } catch (err) {
    const message = err?.message || err;
    try {
      const uri = process.env.MONGO_URI || '';
      let dbName = process.env.MONGO_DB_NAME || 'ai_blood_donation';
      let username = '';
      let host = '';
      try {
        const u = new URL(uri);
        username = u.username || '';
        host = u.host || '';
        const pathDb = (u.pathname || '').replace(/^\//, '');
        if (pathDb) dbName = pathDb;
      } catch {}
      console.error(`MongoDB connection error: ${message}`);
      console.error(`- Using host: ${host || '(unknown)'}`);
      console.error(`- Using user: ${username || '(none)'}`);
      console.error(`- Using db:   ${dbName}`);
      console.error(`- AuthSource: ${process.env.MONGO_AUTH_SOURCE || 'admin'}`);
    } catch {}
    process.exit(1);
  }
};

export default connectDB;

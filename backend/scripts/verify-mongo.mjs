#!/usr/bin/env node
import 'dotenv/config';
import mongoose from 'mongoose';

function redact(uri) {
  try {
    const u = new URL(uri);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '<invalid-uri>';
  }
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set. Check backend/.env');
    process.exit(1);
  }
  console.log('Testing MongoDB connection to:', redact(uri));
  try {
    // Respect MONGO_DB_NAME if URI has no path DB
  let dbName = process.env.MONGO_DB_NAME || 'blood-donation';
    const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';
    try {
      const u = new URL(uri);
      const pathDb = (u.pathname || '').replace(/^\//, '');
      if (pathDb) dbName = pathDb;
    } catch {}
    await mongoose.connect(uri, { dbName, authSource });
  const conn = mongoose.connection;
  const connectedDbName = conn?.db?.databaseName;
  console.log(`OK: Connected to ${connectedDbName || '(unknown db)'} (authSource: ${authSource})`);
    const collections = await conn.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).join(', ') || '(none)');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('FAIL:', msg);
    console.error('Hints:');
    console.error('- Ensure password is URL-encoded (use [System.Uri]::EscapeDataString in PowerShell)');
    console.error('- Ensure your IP is allowed in Atlas Network Access');
    console.error('- Ensure the user has readWrite on the cluster');
    process.exit(2);
  }
}

main();

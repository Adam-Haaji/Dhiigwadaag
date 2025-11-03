#!/usr/bin/env node
// Simple migration script: copy selected collections from a local MongoDB
// to a MongoDB Atlas database. Run this once to migrate existing users so
// they can continue to log in after switching MONGO_URI to Atlas.
//
// Usage (PowerShell):
//   node ./scripts/migrate-local-to-atlas.mjs \
//     --from "mongodb://localhost:27017/ai_blood_donation" \
//     --to   "mongodb+srv://USER:P%40ss%2Fword%3F@cluster0.wys18q3.mongodb.net/ai_blood_donation"
//
// Notes:
// - Ensure your Atlas IP Access list allows your IP.
// - Password must be URL-encoded.
// - Collections copied: users, donors, requests, bloodrequests, donations, notifications

import { MongoClient } from 'mongodb';

function parseArgs(argv) {
  const args = { from: '', to: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--from') args.from = argv[++i];
    else if (a === '--to') args.to = argv[++i];
  }
  return args;
}

async function copyCollection(srcDb, dstDb, name) {
  const src = srcDb.collection(name);
  const dst = dstDb.collection(name);
  const count = await src.estimatedDocumentCount();
  if (count === 0) {
    console.log(`- ${name}: source empty, skipping`);
    return;
  }
  console.log(`- ${name}: copying ${count} docs...`);
  const cursor = src.find({}, { noCursorTimeout: true });
  const batch = [];
  let copied = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    batch.push(doc);
    if (batch.length >= 1000) {
      await dst.bulkWrite(batch.map(d => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })), { ordered: false });
      copied += batch.length;
      batch.length = 0;
      process.stdout.write(`  copied ${copied}/${count}\r`);
    }
  }
  if (batch.length) {
    await dst.bulkWrite(batch.map(d => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })), { ordered: false });
    copied += batch.length;
  }
  console.log(`  done: ${copied} docs`);
}

async function main() {
  const { from, to } = parseArgs(process.argv);
  if (!from || !to) {
    console.error('Usage: node ./scripts/migrate-local-to-atlas.mjs --from "mongodb://localhost:27017/ai_blood_donation" --to "<atlas-uri>/ai_blood_donation"');
    process.exit(1);
  }
  console.log('Connecting to source (local)...');
  const srcClient = new MongoClient(from, { serverSelectionTimeoutMS: 10000 });
  console.log('Connecting to target (Atlas)...');
  const dstClient = new MongoClient(to, { serverSelectionTimeoutMS: 10000 });

  try {
    await srcClient.connect();
    await dstClient.connect();
    const srcDbName = new URL(from).pathname.replace(/^\//, '') || 'ai_blood_donation';
    const dstDbName = new URL(to).pathname.replace(/^\//, '') || srcDbName;
    const srcDb = srcClient.db(srcDbName);
    const dstDb = dstClient.db(dstDbName);

    console.log(`Source DB: ${srcDbName}`);
    console.log(`Target DB: ${dstDbName}`);

    const collections = ['users', 'donors', 'requests', 'bloodrequests', 'donations', 'notifications'];
    for (const name of collections) {
      await copyCollection(srcDb, dstDb, name);
    }

    console.log('Migration complete.');
  } catch (e) {
    console.error('Migration failed:', e?.message || e);
    process.exit(1);
  } finally {
    await srcClient.close().catch(() => {});
    await dstClient.close().catch(() => {});
  }
}

main();

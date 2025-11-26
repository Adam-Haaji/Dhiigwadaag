#!/usr/bin/env node
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from "bcryptjs";


function parseArgs(argv){
  const out = { email: '', password: '' };
  for (let i=2;i<argv.length;i++){
    const a = argv[i];
    if (a === '--email') out.email = argv[++i] || '';
    else if (a === '--password') out.password = argv[++i] || '';
  }
  return out;
}

function redact(uri){
  try { const u = new URL(uri); if (u.password) u.password = '***'; return u.toString(); } catch { return '<invalid-uri>'; }
}

async function main(){
  const { email, password } = parseArgs(process.argv);
  if (!email || !password) {
    console.error('Usage: npm run user:reset-password -- --email user@example.com --password NewPass123!');
    process.exit(1);
  }
  const uri = process.env.MONGO_URI;
  if (!uri){ console.error('MONGO_URI not set in backend/.env'); process.exit(1); }
  let dbName = process.env.MONGO_DB_NAME || 'blood-donation';
  try { const u = new URL(uri); const pathDb=(u.pathname||'').replace(/^\//,''); if (pathDb) dbName = pathDb; } catch {}
  const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';

  console.log('Connecting to:', redact(uri), 'dbName=', dbName, 'authSource=', authSource);
  await mongoose.connect(uri, { dbName, authSource });

  const userSchema = new mongoose.Schema({ email: String, password: String }, { strict: false });
  const User = mongoose.models.__UserReset || mongoose.model('__UserReset', userSchema, 'users');

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user){
    console.error('No user found with email:', email);
    process.exit(2);
  }
  const hash = await bcrypt.hash(password, 10);
  user.password = hash;
  await user.save();
  console.log('Password updated for', email);
  await mongoose.disconnect();
}

main().catch(e=>{ console.error('Failed:', e?.message||e); process.exit(1); });

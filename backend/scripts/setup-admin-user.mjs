#!/usr/bin/env node
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from "bcryptjs";

function redact(uri){
  try { 
    const u = new URL(uri); 
    if (u.password) u.password = '***'; 
    return u.toString(); 
  } catch { 
    return '<invalid-uri>'; 
  }
}

async function main(){
  const email = 'admin@gmail.com';
  const password = '1234';
  const name = 'Admin User';
  
  const uri = process.env.MONGO_URI;
  if (!uri){ 
    console.error('MONGO_URI not set in backend/.env'); 
    process.exit(1); 
  }
  
  let dbName = process.env.MONGO_DB_NAME || 'blood-donation';
  try { 
    const u = new URL(uri); 
    const pathDb = (u.pathname || '').replace(/^\//, ''); 
    if (pathDb) dbName = pathDb; 
  } catch {}
  
  const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';

  console.log('Connecting to:', redact(uri), 'dbName=', dbName, 'authSource=', authSource);
  
  try {
    await mongoose.connect(uri, { dbName, authSource });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  // Import User model
  const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String,
  }, { strict: false, timestamps: true });
  
  const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

  const normalizedEmail = email.trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if user exists
  let user = await User.findOne({ email: normalizedEmail });
  
  if (user) {
    console.log('Admin user found. Updating password and role...');
    user.password = hashedPassword;
    user.role = 'admin';
    user.name = name;
    await user.save();
    console.log('✅ Admin user updated successfully!');
    console.log('   Email:', normalizedEmail);
    console.log('   Password:', password);
    console.log('   Role: admin');
  } else {
    console.log('Admin user not found. Creating new admin user...');
    user = await User.create({
      name: name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'admin',
    });
    console.log('✅ Admin user created successfully!');
    console.log('   Email:', normalizedEmail);
    console.log('   Password:', password);
    console.log('   Role: admin');
  }

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

main().catch(e => { 
  console.error('Failed:', e?.message || e); 
  process.exit(1); 
});

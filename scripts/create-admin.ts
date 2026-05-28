// scripts/create-admin.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load from .env (not .env.local)
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  console.error('Please check your .env file');
  process.exit(1);
}

console.log('📡 Connecting to MongoDB...');
console.log(`Using URI: ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}`);

// Simple schema without pre-save hooks
const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  role: String,
  branch: String,
  active: Boolean,
  mustChangePassword: Boolean,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin exists
    const existing = await User.findOne({ email: 'admin@linkoptical.co.zw' });
    if (existing) {
      console.log('⚠️  Admin already exists!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email: admin@linkoptical.co.zw');
      console.log('Try password: Admin123!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Check if any user exists
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log(`📊 Database already has ${userCount} user(s):`);
      const users = await User.find().select('email role');
      users.forEach(u => console.log(`   - ${u.email} (${u.role})`));
      console.log('\nUse existing credentials');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Creating admin user...');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Admin123!', salt);

    // Create admin
    const admin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@linkoptical.co.zw',
      password: hashedPassword,
      role: 'super_admin',
      branch: 'Robinson House',
      active: true,
      mustChangePassword: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: admin@linkoptical.co.zw');
    console.log('🔑 Password: Admin123!');
    console.log('👤 Role: super_admin');
    console.log('🏢 Branch: Robinson House');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 Login at: http://localhost:3000/login');
    console.log('⚠️  Change password after first login!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAdmin();
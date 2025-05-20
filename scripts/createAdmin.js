require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const existingAdmin = await Admin.findOne({ adminId: 'admin' });
    if (existingAdmin) {
      console.log('Admin already exists');
      return process.exit(0);
    }

    const admin = new Admin({
      adminId: 'admin',
      password: 'admin123' // Will be hashed by pre-save hook
    });

    await admin.save();
    console.log('Admin created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
};

createAdmin();
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const updateAdminPermissions = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const adminId = 'admin'; // your adminId to find the document

    const update = {
      permissions: {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewReports: true,
        canAssignTasks: true,
      },
    };

    const updatedAdmin = await Admin.findOneAndUpdate(
      { adminId },
      { $set: update },
      { new: true } // return the updated doc
    );

    if (!updatedAdmin) {
      console.log(`Admin with adminId '${adminId}' not found`);
    } else {
      console.log('Admin updated:', updatedAdmin);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error updating admin:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

updateAdminPermissions();

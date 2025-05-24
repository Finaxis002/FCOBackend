const mongoose = require("mongoose");
const Role = require("./models/Role"); // Adjust if path differs
const connectDB = require("./config/db");

const seedRoles = async () => {
  try {
    // Await DB connection
    await connectDB();

    const roles = [
      {
        name: "User",
        permissions: { viewRights: true },
      },
      {
        name: "Authorized Person",
        permissions: { createCaseRights: true, edit: true },
      },
      {
        name: "State Head",
        permissions: { allCaseAccess: true },
      },
      {
        name: "Admin",
        permissions: {
          allCaseAccess: true,
          viewRights: true,
          createCaseRights: true,
          createUserRights: true,
          userRolesAndResponsibility: true,
          delete: true,
          edit: true,
          remarks: true,
          chat: true,
        },
      },
    ];

    await Role.deleteMany({});
    await Role.insertMany(roles);

    console.log("✅ Roles seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding roles:", error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
};

seedRoles();

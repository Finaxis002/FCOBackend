const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const defaultPermissions = {
  allCaseAccess: false,
  viewRights: false,
  createCaseRights: false,
  createUserRights: false,
  userRolesAndResponsibility: false,
  delete: false,
  edit: false,
  remarksAndChat: false,
  canShare: false,
};

const adminSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
    unique: true,
    default: "admin",
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: "Super Admin",
  },
  role: {
    type: String,
    default: "Admin",
  },
  permissions: {
    type: Object,
    default: defaultPermissions,
  },
});

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("Admin", adminSchema);

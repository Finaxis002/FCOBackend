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
};


const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true }, // ✅ added for login
    name: { type: String, required: true }, // 🔄 better to make name/email required
    email: { type: String, required: true, unique: true }, // ✅ unique = true for login
    password: { type: String, required: true, select: false }, // ✅ secure
    role: { type: String, required: true, default: "Back Office" }, // optional: default role
    avatarUrl: { type: String },
    dataAIHint: { type: String },
    permissions: {
      type: Object,
      default: defaultPermissions,
    },
  },
  { timestamps: true } // ✅ timestamps true for createdAt / updatedAt
);

// 🔐 Hash password before saving (only if modified)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔐 Compare entered password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;

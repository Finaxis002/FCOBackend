const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["User", "Authorized Person", "State Head", "Admin"],
      unique: true,
    },
    description: {
      type: String,
      default: "",
    },
    permissions: {
      allCaseAccess: { type: Boolean, default: false },
      viewRights: { type: Boolean, default: false },
      createCaseRights: { type: Boolean, default: false },
      createUserRights: { type: Boolean, default: false },
      userRolesAndResponsibility: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      remarks: { type: Boolean, default: false },
      chat: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Role", RoleSchema);

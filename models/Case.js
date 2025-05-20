const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema({
  srNo: String,
  ownerName: String,
  clientName: String,
  unitName: String,
  franchiseAddress: String,
  promoters: [String],
  authorizedPerson: String,
  services: [
    {
      id: String,
      name: String,
      status: {
        type: String,
        default: "Pending",
      },
      remarks: {
        type: String,
        default: "",
      },
      completionPercentage: {
        type: Number,
        default: 0,
      },
    },
  ],
  status: {
    type: String,
    enum: ["Pending", "In-Progress", "Completed", "Rejected", "Approved"],
    default: "Pending",
  },
   assignedUsers: [
  {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userId: String,   // your custom userId string
    name: String,
  },
],
  reasonForStatus: String,
  overallStatus: {
    type: String,
    default: "Pending",
  },
  lastUpdate: {
    type: Date,
    default: Date.now,
  },
});

// Make sure this line is present and correct
module.exports = mongoose.model("Case", caseSchema);

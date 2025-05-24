const express = require("express");
const router = require("express").Router({ mergeParams: true });
const Remark = require("../models/remark");
const Case = require("../models/Case");
const Notification = require("../models/Notification");
const Admin = require("../models/Admin");
const User = require("../models/User"); // <-- Add this line
const Service = require("../models/Service");  // Import your Service model

// GET /api/cases/:caseId/services/:serviceId/remarks
router.get("/:serviceId/remarks", async (req, res) => {
  const { caseId, serviceId } = req.params;
  try {
    const remarks = await Remark.find({ caseId, serviceId }).sort({
      createdAt: -1,
    });
    res.json(remarks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch remarks." });
  }
});

// POST /api/cases/:caseId/services/:serviceId/remarks


// POST /api/cases/:caseId/services/:serviceId/remarks
router.post("/:serviceId/remarks", async (req, res) => {
  const { caseId, serviceId } = req.params;
  const { userId, userName, remark } = req.body;

  if (!remark || !userId || !userName) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    // Save the remark first
    const newRemark = new Remark({
      caseId,
      serviceId,
      userId,
      userName,
      remark,
    });
    await newRemark.save();

    // Fetch the case to get assigned users
    const caseData = await Case.findById(caseId).select(
      "assignedUsers unitName"
    );

    if (!caseData) {
      return res
        .status(404)
        .json({ message: "Case not found for notification." });
    }

    // Notification message snippet (trim remark to 50 chars)
    const remarkSnippet =
      remark.length > 50 ? remark.slice(0, 47) + "..." : remark;

    const notificationMessage = `Remark added by ${userName}: "${remarkSnippet}"`;

    // Notify assigned users (except the one who added the remark)
    for (const assignedUser of caseData.assignedUsers) {
      if (assignedUser._id.toString() !== userId) {
        await Notification.create({
          type: "remark",
          message: notificationMessage,
          userId: assignedUser._id,
          userName: assignedUser.name,
          caseId,
          caseName: caseData.unitName,
          serviceId,
        });
      }
    }

    // Notify all admins
    const admins = await Admin.find().select("_id name");
    for (const admin of admins) {
      await Notification.create({
        type: "remark-added",
        message: notificationMessage,
        userId: admin._id,
        userName: admin.name,
        caseId,
        caseName: caseData.unitName,
        serviceId,
        createdBy: userId, // user who added remark
      });
    }

    res.status(201).json(newRemark);
  } catch (error) {
    console.error("Failed to save remark or send notifications:", error);
    res
      .status(500)
      .json({ message: "Failed to save remark and send notifications." });
  }
});

module.exports = router;

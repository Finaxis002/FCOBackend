const express = require("express");
const router = require("express").Router({ mergeParams: true });
const Remark = require("../models/remark");


// GET /api/cases/:caseId/services/:serviceId/remarks
router.get("/:serviceId/remarks", async (req, res) => {
  const { caseId, serviceId } = req.params;
  try {
    const remarks = await Remark.find({ caseId, serviceId }).sort({ createdAt: -1 });
    res.json(remarks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch remarks." });
  }
});



// POST /api/cases/:caseId/services/:serviceId/remarks
router.post("/:serviceId/remarks", async (req, res) => {
  const { caseId, serviceId } = req.params;
  const { userId, userName, remark } = req.body;

  if (!remark || !userId || !userName) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const newRemark = new Remark({ caseId, serviceId, userId, userName, remark });
    await newRemark.save();
    res.status(201).json(newRemark);
  } catch (error) {
    res.status(500).json({ message: "Failed to save remark." });
  }
});


module.exports = router;
const express = require("express");
const router = express.Router();
const Service = require("../models/Service");

// GET /api/services - fetch all services
router.get("/", async (req, res) => {
  try {
    const services = await Service.find({}).sort({ name: 1 }); // sorted alphabetically
    res.json(services);
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ message: "Server error fetching services" });
  }
});

// POST /api/services - add a new service
router.post("/", async (req, res) => {
  const { name } = req.body;

  try {
    // Avoid duplicates
    const existing = await Service.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Service already exists" });
    }

    const service = await Service.create({ name });
    res.status(201).json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add service" });
  }
});

module.exports = router;

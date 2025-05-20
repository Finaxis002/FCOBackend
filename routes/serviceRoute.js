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

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Service name is required" });
  }

  try {
    // Check if service already exists (case-insensitive)
    const existing = await Service.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
    if (existing) {
      return res.status(409).json({ message: "Service already exists" });
    }

    const newService = new Service({ name: name.trim() });
    await newService.save();

    res.status(201).json(newService);
  } catch (err) {
    console.error("Error adding service:", err);
    res.status(500).json({ message: "Server error adding service" });
  }
});

module.exports = router;

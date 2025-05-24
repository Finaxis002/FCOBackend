const express = require("express");
const router = express.Router();
const Service = require("../models/Service");
const Case = require("../models/Case");
const Notification = require("../models/Notification");
const Admin = require("../models/Admin");

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


// PUT update service by ID
router.put("/:id", async (req, res) => {
  try {
    const serviceId = req.params.id;
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Service name is required" });
    }

    // Check if service with new name already exists (optional)
    const existingService = await Service.findOne({ name: name.trim() });
    if (existingService && existingService._id.toString() !== serviceId) {
      return res.status(400).json({ message: "Service name already exists" });
    }

    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json(updatedService);
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ message: "Server error updating service" });
  }
});

module.exports = router;

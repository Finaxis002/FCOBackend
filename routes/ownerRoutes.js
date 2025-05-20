const express = require("express");
const router = express.Router();
const Owner = require("../models/owners");

// GET all owners
router.get("/", async (req, res) => {
  try {
    const owners = await Owner.find().sort({ name: 1 }); // Sorted alphabetically
    res.json(owners);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch owners" });
  }
});

// POST new owner
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Owner name is required" });
    }

    // Check if owner exists
    const existing = await Owner.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "Owner already exists" });
    }

    const owner = new Owner({ name: name.trim() });
    await owner.save();
    res.status(201).json(owner);
  } catch (err) {
    res.status(500).json({ message: "Failed to add owner" });
  }
});

module.exports = router;

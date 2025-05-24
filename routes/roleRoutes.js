const express = require("express");
const router = express.Router();
const Role = require("../models/Role");

// GET all roles
router.get("/", async (req, res) => {
  try {
    const roles = await Role.find({});
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update role permissions
router.put("/:id", async (req, res) => {
  try {
    const updated = await Role.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const Client = require("../models/clients");

// GET all clients
router.get("/", async (req, res) => {
  try {
    const clients = await Client.find().sort({ name: 1 }); // Sorted alphabetically
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch clients" });
  }
});

// POST new client
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Client name is required" });
    }

    // Check if client exists
    const existing = await Client.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "Client already exists" });
    }

    const client = new Client({ name: name.trim() });
    await client.save();
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ message: "Failed to add client" });
  }
});

module.exports = router;

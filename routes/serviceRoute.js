const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { authMiddleware } = require('../middleware/auth');

// Create new service
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Service name is required' });

    const newService = new Service({ name });
    await newService.save();

    res.status(201).json({ message: 'Service created', service: newService });
  } catch (err) {
    res.status(500).json({ message: 'Error creating service', error: err.message });
  }
});

// Get all services
router.get('/', authMiddleware, async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 }); // sorted alphabetically
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching services' });
  }
});

module.exports = router;

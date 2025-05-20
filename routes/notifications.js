// routes/notifications.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth'); // Add auth middleware as per your app

// Get notifications for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    let filter = {};
    if (req.userRole !== 'admin') {  // lowercase check here
      filter = { userId: req.user._id };
    }
    const notifications = await Notification.find(filter)
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});


// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Delete all notifications for user (optional)
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ message: 'All notifications deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting notifications' });
  }
});

module.exports = router;

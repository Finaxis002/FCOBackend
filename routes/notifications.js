// routes/notifications.js
const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { authMiddleware } = require("../middleware/auth"); // Add auth middleware as per your app

// Get notifications for current user
// router.get("/", authMiddleware, async (req, res) => {
//   try {
//     let filter = {};
//     if ((req.userRole || "").toLowerCase() !== "admin") {
//       filter = { userId: req.user._id };
//     }

//     const notifications = await Notification.find(filter)
//       .sort({ timestamp: -1 })
//       .limit(100);

//     res.json(notifications);
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching notifications" });
//   }
// });


router.get('/', authMiddleware, async (req, res) => {
  try {
    let filter = {};
    
    // Only filter by userId if role is not Admin or Super Admin
    const role = (req.userRole || req.user.role || "").toLowerCase();
    if (role !== 'admin' && role !== 'super admin') {
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
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notif)
      return res.status(404).json({ message: "Notification not found" });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: "Error marking notification as read" });
  }
});

// Delete notification
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const role = (req.userRole || req.user.role || "").toLowerCase();

    const filter = {
      _id: req.params.id,
      ...(role !== "admin" && role !== "super admin" && { userId: req.user._id.toString() }),
    };

    const notif = await Notification.findOneAndDelete(filter);

    if (!notif) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting notification" });
  }
});


// Delete all notifications for user (optional)
router.delete("/", authMiddleware, async (req, res) => {
  try {
    const role = (req.userRole || req.user.role || "").toLowerCase();

    const filter =
      role === "admin" || role === "super admin"
        ? {} // delete all notifications
        : { userId: req.user._id.toString() }; // delete only own

    await Notification.deleteMany(filter);
    res.json({ message: "All notifications deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting notifications" });
  }
});


module.exports = router;

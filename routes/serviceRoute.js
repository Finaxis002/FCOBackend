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
// router.put("/:id", async (req, res) => {
//   try {
//     const serviceId = req.params.id;
//     const { name } = req.body;

//     if (!name || name.trim() === "") {
//       return res.status(400).json({ message: "Service name is required" });
//     }

//     // Check if service with new name already exists (optional)
//     const existingService = await Service.findOne({ name: name.trim() });
//     if (existingService && existingService._id.toString() !== serviceId) {
//       return res.status(400).json({ message: "Service name already exists" });
//     }

//     const updatedService = await Service.findByIdAndUpdate(
//       serviceId,
//       { name: name.trim() },
//       { new: true, runValidators: true }
//     );

//     if (!updatedService) {
//       return res.status(404).json({ message: "Service not found" });
//     }

//     res.json(updatedService);
//   } catch (error) {
//     console.error("Error updating service:", error);
//     res.status(500).json({ message: "Server error updating service" });
//   }
// });

router.put("/:id", async (req, res) => {
  try {
    const serviceId = req.params.id;
    const { name, status, caseId, updatedByUserId, updatedByUserName } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Service name is required" });
    }

    // Check if service with new name already exists (optional)
    const existingService = await Service.findOne({ name: name.trim() });
    if (existingService && existingService._id.toString() !== serviceId) {
      return res.status(400).json({ message: "Service name already exists" });
    }

    // Find current service for status comparison
    const currentService = await Service.findById(serviceId);
    if (!currentService) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Update service fields
    currentService.name = name.trim();
    if (status) currentService.status = status;

    await currentService.save();

    // Check if status changed and send notifications
    if (status && currentService.status !== status) {
      // Fetch case data if caseId available (adjust as per your data model)
      let caseData = null;
      if (caseId) {
        caseData = await Case.findById(caseId).select("assignedUsers unitName");
      }

      const notificationMessage = `Service "${currentService.name}" status changed to "${status}"`;

      // Notify assigned users except updater
      if (caseData) {
        for (const assignedUser of caseData.assignedUsers) {
          if (assignedUser._id.toString() !== updatedByUserId) {
            await Notification.create({
              type: "service-status",
              message: notificationMessage,
              userId: assignedUser._id,
              userName: assignedUser.name,
              caseId: caseData._id,
              caseName: caseData.unitName,
              serviceId: currentService._id,
              serviceName: currentService.name,
              createdBy: updatedByUserId,
            });
          }
        }
      }

      // Notify all admins
      const admins = await Admin.find().select("_id name");
      for (const admin of admins) {
        await Notification.create({
          type: "service-status",
          message: notificationMessage,
          userId: admin._id,
          userName: admin.name,
          caseId: caseData ? caseData._id : null,
          caseName: caseData ? caseData.unitName : null,
          serviceId: currentService._id,
          serviceName: currentService.name,
          createdBy: updatedByUserId,
        });
      }
    }

    res.json(currentService);
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ message: "Server error updating service" });
  }
});


module.exports = router;

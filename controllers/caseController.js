const Case = require("../models/Case.js");
const User = require("../models/User.js");
const Notification = require("../models/Notification");
const Admin = require("../models/Admin"); // adjust path if needed
const notificationService = require("../services/notificationService");

const addCase = async (req, res) => {
  try {
    const {
      srNo,
      ownerName,
      clientName,
      unitName,
      franchiseAddress,
      promoters,
      authorizedPerson,
      services,
      assignedUsers,
      reasonForStatus,
      status,
    } = req.body;

    const userIds = Array.isArray(assignedUsers)
      ? assignedUsers.map((u) => (typeof u === "object" ? u._id : u))
      : [];

    const usersFromDb = await User.find({
      _id: { $in: userIds },
    }).select("userId name");

    const formattedAssignedUsers = userIds.map((userId) => {
      const user = usersFromDb.find(
        (u) => u._id.toString() === userId.toString()
      );
      return {
        _id: user ? user._id : userId,
        userId: user ? user.userId : null,
        name: user ? user.name : `User ${userId}`,
      };
    });

    const totalServices = services ? services.length : 0;
    const completedCount = services
      ? services.filter((s) => s.status === "Completed").length
      : 0;

    const base = 50;
    const remaining = 50;

    const overallCompletionPercentage =
      totalServices === 0
        ? 50
        : Math.min(base + (completedCount * remaining) / totalServices, 100);

    const newCase = new Case({
      srNo,
      ownerName,
      clientName,
      unitName,
      franchiseAddress,
      promoters,
      authorizedPerson,
      services,
      overallCompletionPercentage,
      overallStatus: status || "To-be-Started",
      status: status || "New-Case",
      assignedUsers: formattedAssignedUsers,
      reasonForStatus,
      lastUpdate: new Date(),
    });

    const savedCase = await newCase.save();

    // 🔔 Notify Assigned Users
    for (const assignedUser of formattedAssignedUsers) {
      await Notification.create({
        type: "creation",
        message: `You have been assigned to a new case: "${savedCase.unitName}".`,
        userId: assignedUser._id,
        userName: assignedUser.name,
        caseId: savedCase._id,
        caseName: savedCase.unitName,
      });
    }

    // 🔔 Notify All Admins (optional: only Super Admins if needed)
    const admins = await Admin.find().select("_id name"); // Adjust if you want only Super Admins
    const assignedNames = formattedAssignedUsers.map((u) => u.name).join(", ");

    for (const admin of admins) {
      await Notification.create({
        type: "creation",
        message: `A new case "${savedCase.unitName}" has been created and assigned to: ${assignedNames}.`,
        userId: admin._id,
        userName: admin.name,
        caseId: savedCase._id,
        caseName: savedCase.unitName,
      });
    }

    res.status(201).json({
      message: "Case created successfully",
      case: savedCase,
    });
  } catch (error) {
    console.error("Error adding case:", error);
    res.status(500).json({
      message: "Failed to create case",
      error: error.message,
    });
  }
};

const getCases = async (req, res) => {
  try {
    const cases = await Case.find().sort({ lastUpdate: -1 });

    // Convert legacy string assignments to objects
    const formattedCases = cases.map((c) => ({
      ...c._doc,
      assignedUsers: c.assignedUsers.map((u) =>
        typeof u === "string" ? { _id: u, name: u } : u
      ),
    }));

    res.status(200).json(formattedCases);
  } catch (error) {
    console.error("Error fetching cases:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch cases", error: error.message });
  }
};

const getcase = async (req, res) => {
  try {
    const found = await Case.findById(req.params.id);
    if (!found) return res.status(404).json({ message: "Case not found" });

    // assignedUsers formatting (your existing code)
    const assignedUsersFormatted = found.assignedUsers.map((u) =>
      typeof u === "string" ? { _id: u, name: u } : u
    );

    // Prepare response object using virtual calculatedCompletionPercentage
    const response = {
      ...found.toObject(), // toObject includes virtuals because of your schema setting
      assignedUsers: assignedUsersFormatted,
      overallCompletionPercentage: found.calculatedCompletionPercentage, // override with virtual
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ PUT - Update case by ID
const getServiceStatusChanges = (oldServices = [], newServices = []) => {
  const changes = [];

  // Create maps using service name as key (since IDs might be missing)
  const oldServicesMap = new Map();
  oldServices.forEach((service) => {
    oldServicesMap.set(service.name.toLowerCase(), service);
  });

  const newServicesMap = new Map();
  newServices.forEach((service) => {
    newServicesMap.set(service.name.toLowerCase(), service);
  });

  // Check for added services (only notify about truly new services)
  newServicesMap.forEach((newService, key) => {
    if (!oldServicesMap.has(key)) {
      changes.push({
        type: "service-added",
        message: `Service "${newService.name}" was added with status "${newService.status}".`,
      });
    }
  });

  // Check for status changes
  newServicesMap.forEach((newService, key) => {
    const oldService = oldServicesMap.get(key);
    if (oldService && oldService.status !== newService.status) {
      changes.push({
        type: "service-status",
        message: `Service "${newService.name}" status changed from "${oldService.status}" to "${newService.status}".`,
      });
    }
  });

  return changes;
};

const updateCase = async (req, res) => {
  try {
    const {
      srNo,
      ownerName,
      clientName,
      unitName,
      franchiseAddress,
      promoters,
      authorizedPerson,
      services,
      assignedUsers,
      reasonForStatus,
      status: reqStatus, // renamed to avoid const reassignment error
    } = req.body;

    let updatedStatus = reqStatus; // Mutable variable for status changes

    const caseId = req.params.id;
    const existingCase = await Case.findById(caseId);

    if (!existingCase) {
      return res.status(404).json({ message: "Case not found" });
    }

    // Track changes
    const changes = [];
    const excludedKeys = [
      "lastUpdate",
      "updatedAt",
      "assignedUsers",
      "services",
    ];

    // Track simple field changes
    for (const key in req.body) {
      if (excludedKeys.includes(key)) continue;

      const oldVal = existingCase[key];
      const newVal = req.body[key];

      if (
        oldVal !== newVal &&
        typeof oldVal !== "object" &&
        typeof newVal !== "object"
      ) {
        changes.push({
          type: "field-change",
          message: `${key} changed from "${oldVal}" to "${newVal}"`,
        });
      }
    }

    // Track status separately
    if (reqStatus && reqStatus !== existingCase.status) {
      changes.push({
        type: "status-change",
        message: `status changed from "${existingCase.status}" to "${reqStatus}"`,
      });
    }

    // Only check service changes if services were provided in the request
    if (services !== undefined) {
      const serviceStatusChanges = getServiceStatusChanges(
        existingCase.services || [],
        services || []
      );
      changes.push(...serviceStatusChanges);
    }

    // Process assignedUsers
    let formattedAssignedUsers = existingCase.assignedUsers;
    if (Array.isArray(assignedUsers)) {
      const newUserIds = assignedUsers.map((u) =>
        typeof u === "object" ? u._id.toString() : u.toString()
      );

      const usersFromDb = await User.find({ _id: { $in: newUserIds } }).select(
        "userId name"
      );
      formattedAssignedUsers = newUserIds.map((userId) => {
        const user = usersFromDb.find(
          (u) => u._id.toString() === userId.toString()
        );
        return {
          _id: user ? user._id : userId,
          userId: user ? user.userId : null,
          name: user ? user.name : `User ${userId}`,
        };
      });

      // Track user changes
      const oldUserIds = existingCase.assignedUsers.map((u) =>
        u._id.toString()
      );
      const addedUsers = newUserIds.filter((id) => !oldUserIds.includes(id));
      const removedUsers = oldUserIds.filter((id) => !newUserIds.includes(id));

      if (addedUsers.length > 0) {
        changes.push({
          type: "user-added",
          message: `${addedUsers.length} user(s) added to case`,
        });
      }
      if (removedUsers.length > 0) {
        changes.push({
          type: "user-removed",
          message: `${removedUsers.length} user(s) removed from case`,
        });
      }
    }

    // Calculate completion percentage
    const servicesToUse =
      services !== undefined ? services : existingCase.services;
    const totalServices = servicesToUse.length;
    const completedCount = servicesToUse.filter(
      (s) => s.status === "Completed"
    ).length;
    const overallCompletionPercentage =
      totalServices === 0
        ? 50
        : Math.min(50 + (completedCount * 50) / totalServices, 100);

    // Determine the new status based on service states
    let newStatus = reqStatus || existingCase.status;

    if (services !== undefined) {
      if (totalServices === 0) {
        newStatus = "New-Case";
      } else if (completedCount === totalServices) {
        newStatus = "Completed";
      } else if (completedCount > 0) {
        newStatus = "In-Progress";
      } else {
        newStatus = "New-Case";
      }
    }

    // Enforce backend consistency for status field
    if (newStatus === "Completed") {
      updatedStatus = "Completed";
    } else if (newStatus === "In-Progress") {
      updatedStatus = "In-Progress";
    } else {
      if (updatedStatus === "Completed" || updatedStatus === "In-Progress") {
        updatedStatus = newStatus;
      }
    }

    // Build update payload
    const updatePayload = {
      srNo: srNo !== undefined ? srNo : existingCase.srNo,
      ownerName: ownerName !== undefined ? ownerName : existingCase.ownerName,
      clientName: clientName !== undefined ? clientName : existingCase.clientName,
      unitName: unitName !== undefined ? unitName : existingCase.unitName,
      franchiseAddress:
        franchiseAddress !== undefined
          ? franchiseAddress
          : existingCase.franchiseAddress,
      promoters: promoters !== undefined ? promoters : existingCase.promoters,
      authorizedPerson:
        authorizedPerson !== undefined
          ? authorizedPerson
          : existingCase.authorizedPerson,
      services: services !== undefined ? services : existingCase.services,
      assignedUsers: formattedAssignedUsers,
      reasonForStatus:
        reasonForStatus !== undefined
          ? reasonForStatus
          : existingCase.reasonForStatus,
      status: updatedStatus !== undefined ? updatedStatus : existingCase.status,
      overallCompletionPercentage,
      overallStatus: newStatus,
      lastUpdate: new Date(),
    };

    // Update case
    const updated = await Case.findByIdAndUpdate(caseId, updatePayload, {
      new: true,
      runValidators: true,
    });

    // Send notifications only if there are actual changes
    if (changes.length > 0) {
      // Filter out service-added notifications if this isn't the first update
      const isFirstUpdate = existingCase.lastUpdate === existingCase.createdAt;
      const filteredChanges = changes.filter(
        (change) => change.type !== "service-added" || isFirstUpdate
      );

      if (filteredChanges.length > 0) {
        const changeMessage = `Case "${
          updated.unitName
        }" updated:\n${filteredChanges.map((c) => c.message).join(";\n")}`;

        for (const assignedUser of formattedAssignedUsers) {
          await Notification.create({
            type: "update",
            message: changeMessage,
            userId: assignedUser._id,
            userName: assignedUser.name,
            caseId: updated._id,
            caseName: updated.unitName,
          });
        }
      }
    }

    res.json({
      message: "Case updated successfully",
      case: updated,
      changes:
        changes.length > 0
          ? changes.map((c) => c.message)
          : ["No significant changes detected"],
    });
  } catch (err) {
    console.error("Error updating case:", err);
    res.status(500).json({
      message: "Failed to update case",
      error: err.message,
    });
  }
};



const deleteCase = async (req, res) => {
  try {
    const deleted = await Case.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Case not found" });
    }

    // Assuming req.user contains the logged-in user
    const deleterName = req.user?.name || "Someone";

    if (
      Array.isArray(deleted.assignedUsers) &&
      deleted.assignedUsers.length > 0
    ) {
      for (const assignedUser of deleted.assignedUsers) {
        await Notification.create({
          type: "deletion", // confirm enum value matches schema
          message: `Case "${deleted.unitName}" has been deleted by ${deleterName}.`,
          userId: assignedUser._id,
          userName: assignedUser.name || null,
          caseId: deleted._id,
          caseName: deleted.unitName,
        });
      }
    }

    res.json({ message: "Case deleted successfully" });
  } catch (err) {
    console.error("Error deleting case:", err);
    res
      .status(500)
      .json({ message: "Failed to delete case", error: err.message });
  }
};

module.exports = { addCase, getCases, getcase, updateCase, deleteCase };

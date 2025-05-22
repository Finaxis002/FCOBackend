const Case = require("../models/Case.js");
const User = require("../models/User.js");
const Notification = require("../models/Notification");
const Admin = require("../models/Admin"); // adjust path if needed

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

const getServiceStatusChanges = (oldServices, newServices) => {
  if (!oldServices || !newServices) return [];

  const changes = [];
  const oldServicesMap = new Map();
  oldServices.forEach((service) => oldServicesMap.set(service.id, service));

  newServices.forEach((newService) => {
    const oldService = oldServicesMap.get(newService.id);
    if (!oldService) {
      // Optional: new service added
      changes.push(
        `Service "${newService.name}" was added with status "${newService.status}".`
      );
    } else if (oldService.status !== newService.status) {
      changes.push(
        `Service "${newService.name}" status changed from "${oldService.status}" to "${newService.status}".`
      );
    }
  });

  return changes;
};

// ✅ PUT - Update case by ID
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
      assignedUsers, // may be undefined or empty if not sent
      reasonForStatus,
      status,
    } = req.body;

    const caseId = req.params.id;
    const existingCase = await Case.findById(caseId);

    if (!existingCase) {
      return res.status(404).json({ message: "Case not found" });
    }

    // Step 1: Track changes except excluded keys
    const excludedKeys = [
      "lastUpdate",
      "updatedAt",
      "assignedUsers",
      "services",
    ];
    const changes = [];

    for (const key in req.body) {
      if (excludedKeys.includes(key)) continue;

      const oldVal = existingCase[key];
      const newVal = req.body[key];

      if (
        oldVal !== newVal &&
        typeof oldVal !== "object" &&
        typeof newVal !== "object"
      ) {
        changes.push(`${key} changed from "${oldVal}" to "${newVal}"`);
      }
    }

    // Compare status separately
    if (status && status !== existingCase.status) {
      changes.push(
        `status changed from "${existingCase.status}" to "${status}"`
      );
    }

    // Detect if any service status changed
    const hasServiceStatusChanged = (oldServices, newServices) => {
      if (!oldServices || !newServices) return false;
      if (oldServices.length !== newServices.length) return true;

      for (let i = 0; i < oldServices.length; i++) {
        if (oldServices[i].id !== newServices[i].id) return true;
        if (oldServices[i].status !== newServices[i].status) return true;
      }
      return false;
    };

    const serviceStatusChanges = getServiceStatusChanges(
      existingCase.services,
      services
    );
    if (serviceStatusChanges.length > 0) {
      changes.push(...serviceStatusChanges);
    }

    // Step 2: Process assignedUsers only if provided; else keep existing
    let formattedAssignedUsers;

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

      // Track assignedUsers changes
      const oldUserIds = (existingCase.assignedUsers || []).map((u) =>
        u._id.toString()
      );
      const addedUserIds = newUserIds.filter((id) => !oldUserIds.includes(id));
      const removedUserIds = oldUserIds.filter(
        (id) => !newUserIds.includes(id)
      );

      if (addedUserIds.length > 0 || removedUserIds.length > 0) {
        changes.push("assigned users were modified");
      }
    } else {
      // assignedUsers not sent, keep existing
      formattedAssignedUsers = existingCase.assignedUsers;
    }

    // Step 3: Calculate overallCompletionPercentage based on services array
    const totalServices = services
      ? services.length
      : existingCase.services.length;
    const completedCount = services
      ? services.filter((s) => s.status === "Completed").length
      : existingCase.services.filter((s) => s.status === "Completed").length;

    const base = 50;
    const remaining = 50;

    const overallCompletionPercentage =
      totalServices === 0
        ? 50
        : Math.min(base + (completedCount * remaining) / totalServices, 100);

    // Step 4: Build update payload with all fields
    const updatePayload = {
      srNo,
      ownerName,
      clientName,
      unitName,
      franchiseAddress,
      promoters,
      authorizedPerson,
      services,
      assignedUsers: formattedAssignedUsers,
      reasonForStatus,
      status: status || existingCase.status,
      overallCompletionPercentage,
      overallStatus: status || existingCase.status,
      lastUpdate: new Date(),
    };

    // Step 5: Update case document in DB
    const updated = await Case.findByIdAndUpdate(caseId, updatePayload, {
      new: true,
      runValidators: true,
    });

    // Step 6: Notify assigned users about the update
    const changeMessage =
      changes.length > 0
        ? `Case "${updated.unitName}" updated:\n${changes.join(";\n")}`
        : `Case "${updated.unitName}" was updated.`;

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

    res.json({ message: "Case updated successfully", case: updated });
  } catch (err) {
    console.error("Error updating case:", err);
    res
      .status(500)
      .json({ message: "Failed to update case", error: err.message });
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

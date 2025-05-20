const Case = require("../models/Case.js");
const User = require("../models/User.js");
const Notification = require("../models/Notification");

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

    // First extract just the IDs if assignedUsers contains objects
    const userIds = Array.isArray(assignedUsers)
      ? assignedUsers.map((u) => (typeof u === "object" ? u._id : u))
      : [];

    // Fetch full user details from DB for assigned users
    const usersFromDb = await User.find({
      _id: { $in: userIds },
    }).select("userId name");

    // Map assignedUsers to include MongoDB _id, userId, and name
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

    const newCase = new Case({
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
      overallStatus: status || "Pending",
      status: status || "Pending",
      lastUpdate: new Date(),
    });

    const savedCase = await newCase.save();
    
    // Notify assigned users - now including names
    for (const assignedUser of formattedAssignedUsers) {
      await Notification.create({
        type: "creation",
        message: `You have been assigned to a new case: "${savedCase.unitName}".`,
        userId: assignedUser._id,
        userName: assignedUser.name, // Add user name
        caseId: savedCase._id,
        caseName: savedCase.unitName, // Add case name
      });
    }
    
    res.status(201).json({ message: "Case created successfully", case: savedCase });
  } catch (error) {
    console.error("Error adding case:", error);
    res.status(500).json({ message: "Failed to create case", error: error.message });
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

    // Convert legacy format if needed
    const formattedCase = {
      ...found._doc,
      assignedUsers: found.assignedUsers.map((u) =>
        typeof u === "string" ? { _id: u, name: u } : u
      ),
    };

    res.json(formattedCase);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ PUT - Update case by ID
const updateCase = async (req, res) => {
  try {
    const { assignedUsers, status, ...otherFields } = req.body;

    // Extract just the IDs if assignedUsers contains objects
    const userIds = Array.isArray(assignedUsers)
      ? assignedUsers.map((u) => (typeof u === "object" ? u._id : u))
      : [];

    // Fetch full user details from DB for assigned users
    const usersFromDb = await User.find({
      _id: { $in: userIds },
    }).select("userId name");

    // Map assignedUsers to include MongoDB _id, userId, and name
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

    // 1. Update the case including assignedUsers and status
    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      {
        ...otherFields,
        assignedUsers: formattedAssignedUsers,
        status: status || "Pending",
        lastUpdate: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Case not found" });
    }

    // 2. Notify assigned users
    if (formattedAssignedUsers.length > 0) {
      for (const assignedUser of formattedAssignedUsers) {
        await Notification.create({
          type: "update", // ensure this matches your enum in Notification schema
          message: `Case has been updated: "${updated.unitName}".`,
          userId: assignedUser._id,
          userName: assignedUser.name,
          caseId: updated._id,
          caseName: updated.unitName,
        });
      }
    }

    res.json({ message: "Case updated successfully", case: updated });
  } catch (err) {
    console.error("Error updating case:", err);
    res.status(500).json({ message: "Failed to update case", error: err.message });
  }
};


const deleteCase = async (req, res) => {
  try {
    const deleted = await Case.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Case not found" });
    }

    // Assuming req.user contains the logged-in user
    const deleterName = req.user?.name || 'Someone';

    if (Array.isArray(deleted.assignedUsers) && deleted.assignedUsers.length > 0) {
      for (const assignedUser of deleted.assignedUsers) {
        await Notification.create({
          type: 'deletion', // confirm enum value matches schema
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
    res.status(500).json({ message: "Failed to delete case", error: err.message });
  }
};



module.exports = { addCase, getCases, getcase, updateCase, deleteCase };

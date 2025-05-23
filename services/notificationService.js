// services/notificationService.js
const Notification = require("../models/Notification");
const Admin = require("../models/Admin");

const notificationService = {
  /**
   * Notify assigned users about case creation
   */
  async notifyCaseCreation(caseData, assignedUsers) {
    const notifications = [];
    
    // Notify assigned users
    for (const user of assignedUsers) {
      notifications.push(
        Notification.create({
          type: "creation",
          message: `You have been assigned to a new case: "${caseData.unitName}".`,
          userId: user._id,
          userName: user.name,
          caseId: caseData._id,
          caseName: caseData.unitName,
        })
      );
    }

    // Notify admins
    const admins = await Admin.find().select("_id name");
    const assignedNames = assignedUsers.map(u => u.name).join(", ");

    for (const admin of admins) {
      notifications.push(
        Notification.create({
          type: "creation",
          message: `A new case "${caseData.unitName}" has been created and assigned to: ${assignedNames}.`,
          userId: admin._id,
          userName: admin.name,
          caseId: caseData._id,
          caseName: caseData.unitName,
        })
      );
    }

    await Promise.all(notifications);
  },

  /**
   * Notify about case updates
   */
  async notifyCaseUpdate(caseData, assignedUsers, changes) {
    if (changes.length === 0) return;

    const changeMessage = `Case "${caseData.unitName}" updated:\n${changes.map(c => c.message).join(";\n")}`;
    const notifications = [];

    for (const user of assignedUsers) {
      notifications.push(
        Notification.create({
          type: "update",
          message: changeMessage,
          userId: user._id,
          userName: user.name,
          caseId: caseData._id,
          caseName: caseData.unitName,
        })
      );
    }

    await Promise.all(notifications);
  },

  /**
   * Notify about case deletion
   */
  async notifyCaseDeletion(caseData, assignedUsers, deleterName) {
    const notifications = [];

    for (const user of assignedUsers) {
      notifications.push(
        Notification.create({
          type: "deletion",
          message: `Case "${caseData.unitName}" has been deleted by ${deleterName}.`,
          userId: user._id,
          userName: user.name || null,
          caseId: caseData._id,
          caseName: caseData.unitName,
        })
      );
    }

    await Promise.all(notifications);
  }
};

module.exports = notificationService;
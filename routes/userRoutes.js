const express = require("express");
const User = require("../models/User.js");
const Admin = require("../models/Admin.js");
const Role = require("../models/Role"); // Import Role model
const bcrypt = require("bcrypt");
const router = express.Router();

// Create User
router.post("/", async (req, res) => {
  try {
    const { userId, name, email, role, password, permissions } = req.body;

    // Validation
    if (!userId || !name || !email || !password) {
      return res
        .status(400)
        .json({ message: "User ID, name, email, and password are required" });
    }
    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(400).json({ message: "User ID already exists" });
    }
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;

    // Create new user (password hashing done in pre-save hook)
    const newUser = new User({
      userId,
      name,
      email,
      role,
      password,
      permissions: permissions || {}, // <-- save permissions here
      avatarUrl,
    });

    await newUser.save();

    // Don't return password in response
    const { password: _, ...safeUser } = newUser.toObject();

    res.status(201).json(safeUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Get All Users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find user first
    let user = await User.findById(id).select("-password");
    if (user) {
      return res.json(user);
    }

    // If not found in User, try Admin collection (exclude password or sensitive fields accordingly)
    const admin = await Admin.findById(id).select("-password");
    if (admin) {
      return res.json(admin);
    }

    // If not found anywhere
    return res.status(404).json({ message: "User not found" });
  } catch (error) {
    console.error("Fetch user error:", error);
    return res.status(500).json({ message: "Server error fetching user" });
  }
});

// Update User


router.put("/:id", async (req, res) => {
  try {
    const { userId, name, email, role } = req.body;

    // Find the role document by role name
    const roleDoc = await Role.findOne({ name: role });
    if (!roleDoc) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Prepare update data including permissions from roleDoc
    const updateData = {
      userId,
      name,
      email,
      role,
      permissions: roleDoc.permissions, // Set permissions from role
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Delete User
router.delete("/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET: User Permissions
router.get("/:id/permissions", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name email role permissions"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// PUT: Update User Permissions
router.put("/:id/permissions", async (req, res) => {
  try {
    const { permissions } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { permissions },
      { new: true }
    ).select("name email role permissions");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Permissions updated", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// ✅ Reset Password by User ID
router.put("/:id/reset-password", async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Just set the password - let Mongoose pre-save hook handle the hashing
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

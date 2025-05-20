const Admin = require('../models/Admin');

const authenticateAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error during admin authentication' });
  }
};

module.exports = authenticateAdmin;
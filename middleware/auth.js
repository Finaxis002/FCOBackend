const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin'); // Make sure this exists

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const userRole = decoded.role;

    let user = await User.findById(userId);

    // 🔁 If not found in users, try admins
    if (!user) {
      user = await Admin.findById(userId);
      if (!user) {
        return res.status(401).json({ message: 'Invalid token: user not found' });
      }
      req.isAdmin = true; // Optional flag for backend logic
    }

    // Attach normalized user and role
    req.user = user;
    req.userRole = userRole ? userRole.toLowerCase() : null;

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { authMiddleware };

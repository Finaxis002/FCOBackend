const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Authorization token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id; // Use decoded.id if your token payload has "id"
    const userRole = decoded.role;

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: 'Invalid token: user not found' });

    // Attach user and role normalized
    req.user = user;
    req.userRole = userRole ? userRole.toLowerCase() : null;

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { authMiddleware };

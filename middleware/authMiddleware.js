const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
  const token = req.cookies.qg_token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

const verifySuperAdmin = (req, res, next) => {
  if (req.admin && req.admin.role === 'Admin') {
    next();
  } else {
    return res.status(403).json({ message: "Forbidden: Only Admin role can perform this action" });
  }
};

const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
      }

      // Admin role always has full access (bypass checks)
      if (req.admin.role === 'Admin') {
        return next();
      }

      // Load the latest permissions from the database
      const Admin = require('../models/Admin');
      const user = await Admin.findById(req.admin.id);

      if (!user) {
        return res.status(404).json({ message: "Account not found" });
      }

      // If user is Sub-Admin (or other role), check if permission is granted ('yes')
      if (user.permissions && user.permissions[permissionKey] === 'yes') {
        return next();
      }

      return res.status(403).json({
        message: `Forbidden: You do not have permission for this action (${permissionKey})`
      });
    } catch (error) {
      return res.status(500).json({
        message: "Internal server error during permission check"
      });
    }
  };
};

module.exports = { verifyAdmin, verifySuperAdmin, checkPermission };


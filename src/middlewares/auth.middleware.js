const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

exports.authenticate = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 'Not authorized, no token provided', 401);
    }

    const decoded = verifyAccessToken(token);
    
    const user = await User.findById(decoded.id).populate('adminRole');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    if (user.isSuspended) {
      return errorResponse(res, 'Account suspended', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Not authorized, token failed or expired', 401);
  }
};

exports.requirePermission = (permission) => {
  return (req, res, next) => {
    // Only admins have permissions
    if (req.user.role !== 'admin') {
      return errorResponse(res, 'Forbidden: Admin access only', 403);
    }
    // If no specific role is assigned, they might be Super Admin or legacy admin. 
    // We can assume legacy admins have full access, or deny by default. Let's deny if no role, unless we explicitly set a superadmin flag.
    // For simplicity, if they have an adminRole, check it.
    if (req.user.adminRole && req.user.adminRole.permissions && req.user.adminRole.permissions.includes(permission)) {
      return next();
    }
    // Superadmin bypass (if we want to allow the root admin)
    if (req.user.email === 'admin@rideal.com' || req.user.email === 'superadmin@rideal.com') {
      return next();
    }

    return errorResponse(res, 'Forbidden: You do not have the required permission', 403);
  };
};

const { errorResponse } = require('../utils/apiResponse');

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }
    
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, `Role ${req.user.role} is not authorized to access this route`, 403);
    }
    
    next();
  };
};

exports.requireApproval = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'User not authenticated', 401);
  }
  
  if (!req.user.isApproved) {
    return errorResponse(res, 'Account pending approval', 403);
  }
  
  next();
};

exports.requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return errorResponse(res, 'User is not an admin', 403);
    }
    
    // Super admins might not need permissions checked, or maybe they do.
    // If adminRole is not populated or doesn't have permissions, deny.
    if (!req.user.adminRole || !req.user.adminRole.permissions) {
      // If we want a hardcoded superadmin fallback, we can add it here.
      return errorResponse(res, 'No role assigned or permissions found', 403);
    }

    if (!req.user.adminRole.permissions.includes(requiredPermission)) {
      return errorResponse(res, `Missing required permission: ${requiredPermission}`, 403);
    }

    next();
  };
};

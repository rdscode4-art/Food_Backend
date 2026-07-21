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

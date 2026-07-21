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
    
    const user = await User.findById(decoded.id);
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

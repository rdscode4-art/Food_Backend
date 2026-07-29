const jwt = require('jsonwebtoken');
const Consumer = require('../models/Consumer');
const Vendor = require('../models/Vendor');
const DeliveryPartner = require('../models/DeliveryPartner');
const Admin = require('../models/Admin');
const { errorResponse } = require('../utils/apiResponse');

const getModelByRole = (role) => {
  if (role === 'customer') return Consumer;
  if (role === 'restaurant_owner') return Vendor;
  if (role === 'delivery_partner') return DeliveryPartner;
  if (role === 'admin') return Admin;
  return Consumer;
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const Model = getModelByRole(decoded.role);
    const user = await Model.findById(decoded.id);

    if (!user) {
      return errorResponse(res, 'User no longer exists', 401);
    }
    if (user.isSuspended) {
      return errorResponse(res, 'Account suspended', 403);
    }

    req.user = user;
    req.user.role = decoded.role; // ensure role is on req.user
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired', 401);
    }
    return errorResponse(res, 'Invalid token', 401);
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, 'Access denied', 403);
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles,
};

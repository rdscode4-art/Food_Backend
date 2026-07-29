const Zone = require('../models/Zone');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getAllZones = async (req, res) => {
  try {
    const zones = await Zone.find({ isActive: true });
    return successResponse(res, 'Zones fetched successfully', zones);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

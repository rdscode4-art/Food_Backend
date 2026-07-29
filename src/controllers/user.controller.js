const Consumer = require('../models/Consumer');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getProfile = async (req, res) => {
  try {
    const user = await Consumer.findById(req.user._id).select('-password');
    if (!user) return errorResponse(res, 'User not found', 404);
    
    return successResponse(res, 'Profile fetched', user);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // Only allow updating safe fields
    const { name, phone } = req.body;
    
    const user = await Consumer.findByIdAndUpdate(
      req.user._id,
      { $set: { name, phone } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return errorResponse(res, 'User not found', 404);

    return successResponse(res, 'Profile updated', user);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

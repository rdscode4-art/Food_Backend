const MenuItem = require('../models/MenuItem');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getMenuItemDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findOne({
      _id: id,
      isAvailable: true,
    }).populate({
      path: 'restaurant',
      match: { isApproved: true, isActive: true },
      select: 'name isApproved isActive deliveryTime rating deliveryFee',
    });

    // If item not found or its restaurant is not active/approved
    if (!menuItem || !menuItem.restaurant) {
      return errorResponse(res, 'Menu item not found or unavailable', 404);
    }

    return successResponse(res, 'Menu item details fetched successfully', menuItem);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getMenuByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const menuItems = await MenuItem.find({
      restaurant: restaurantId,
      isAvailable: true
    }).populate('category', 'name');
    
    return successResponse(res, 'Menu fetched successfully', menuItems);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

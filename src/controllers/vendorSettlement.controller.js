const VendorSettlement = require('../models/VendorSettlement');
const Restaurant = require('../models/Restaurant');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const verifyOwnerRestaurant = async (ownerId, restaurantId) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, owner: ownerId });
  return restaurant ? restaurant._id : null;
};

exports.getSettlements = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const settlements = await VendorSettlement.find({ restaurant: validRestaurantId }).sort({ createdAt: -1 });
    return successResponse(res, 'Settlements fetched', settlements);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

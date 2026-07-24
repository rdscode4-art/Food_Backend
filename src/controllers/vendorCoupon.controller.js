const VendorCoupon = require('../models/VendorCoupon');
const Restaurant = require('../models/Restaurant');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const verifyOwnerRestaurant = async (ownerId, restaurantId) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, owner: ownerId });
  return restaurant ? restaurant._id : null;
};

exports.createCoupon = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const coupon = await VendorCoupon.create({ ...req.body, restaurant: validRestaurantId });
    return successResponse(res, 'Vendor coupon created', coupon, 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Coupon code already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const coupons = await VendorCoupon.find({ restaurant: validRestaurantId });
    return successResponse(res, 'Vendor coupons fetched', coupons);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const { restaurantId, couponId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const { restaurant, ...updateData } = req.body;
    const coupon = await VendorCoupon.findOneAndUpdate(
      { _id: couponId, restaurant: validRestaurantId },
      updateData,
      { returnDocument: 'after' }
    );
    if (!coupon) return errorResponse(res, 'Coupon not found', 404);

    return successResponse(res, 'Coupon updated', coupon);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const { restaurantId, couponId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found', 404);

    await VendorCoupon.deleteOne({ _id: couponId, restaurant: validRestaurantId });
    return successResponse(res, 'Coupon deleted');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

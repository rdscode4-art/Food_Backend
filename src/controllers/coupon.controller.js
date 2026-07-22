const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.createCoupon = async (req, res) => {
  try {
    // Only admin should be able to create platform-wide coupons
    const coupon = await Coupon.create(req.body);
    return successResponse(res, 'Coupon created successfully', coupon, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getAvailableCoupons = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    let filter = { isActive: true, expiryDate: { $gt: new Date() } };
    
    if (restaurantId) {
      filter.$or = [
        { applicableRestaurants: { $size: 0 } },
        { applicableRestaurants: restaurantId }
      ];
    }
    
    const coupons = await Coupon.find(filter);
    return successResponse(res, 'Coupons fetched', coupons);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return errorResponse(res, 'Coupon code is required', 400);

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) return errorResponse(res, 'Cart is empty', 400);

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiryDate: { $gt: new Date() }
    });

    if (!coupon) return errorResponse(res, 'Invalid or expired coupon', 404);

    if (coupon.applicableRestaurants && coupon.applicableRestaurants.length > 0) {
      if (!coupon.applicableRestaurants.includes(cart.restaurant)) {
        return errorResponse(res, 'Coupon is not applicable for this restaurant', 400);
      }
    }

    // Re-calculate cart total first without coupon
    let total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (total < coupon.minOrderValue) {
      return errorResponse(res, `Minimum order value of ${coupon.minOrderValue} required`, 400);
    }

    let discount = 0;
    if (coupon.discountType === 'flat') {
      discount = coupon.discountValue;
    } else if (coupon.discountType === 'percentage') {
      discount = (total * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    }

    // Assign discount
    cart.discountAmount = discount;
    cart.totalAmount = Math.max(0, total - discount);
    await cart.save();

    return successResponse(res, 'Coupon applied successfully', {
      totalBeforeDiscount: total,
      discountAmount: discount,
      finalTotal: cart.totalAmount
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

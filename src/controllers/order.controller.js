const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const { getIO } = require('../utils/socket');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.checkout = async (req, res) => {
  try {
    const { addressId, paymentMethod } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return errorResponse(res, 'Cart is empty', 400);
    }

    const address = await Address.findOne({ _id: addressId, user: req.user._id });
    if (!address) return errorResponse(res, 'Invalid delivery address', 404);

    if (!['card', 'upi', 'cod'].includes(paymentMethod)) {
      return errorResponse(res, 'Invalid payment method', 400);
    }

    const order = await Order.create({
      user: req.user._id,
      restaurant: cart.restaurant,
      items: cart.items,
      deliveryAddress: {
        label: address.label,
        street: address.street,
        city: address.city,
        zip: address.zip,
        location: address.location,
      },
      paymentMethod: paymentMethod,
      totalAmount: cart.totalAmount,
      status: 'placed',
      placedAt: new Date(),
    });

    // Clear cart
    await Cart.deleteOne({ _id: cart._id });

    // Notify restaurant owner (We would need to emit to the owner's room, but since we don't have owner's userId right here,
    // we can broadcast to a restaurant-specific room, e.g., `restaurant_${cart.restaurant}`)
    const io = getIO();
    io.to(`restaurant_${cart.restaurant}`).emit('new_order', {
      orderId: order._id,
      message: 'New order received!',
    });

    // We can also create a notification in DB for the owner, but finding the owner needs a DB query on Restaurant.
    // We'll skip DB notification for owner for now to keep checkout fast, or do it asynchronously.

    return successResponse(res, 'Order placed successfully', order, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('restaurant', 'name image')
      .sort({ createdAt: -1 });
    return successResponse(res, 'Orders fetched', orders);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('restaurant', 'name image')
      .populate('items.menuItem', 'name image');

    if (!order) return errorResponse(res, 'Order not found', 404);

    return successResponse(res, 'Order details fetched', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return errorResponse(res, 'Order not found', 404);

    if (order.status !== 'placed') {
      return errorResponse(res, 'Cannot cancel order at this stage', 400);
    }

    order.status = 'cancelled';
    await order.save();

    const io = getIO();
    io.to(`restaurant_${order.restaurant}`).emit('order_cancelled', {
      orderId: order._id,
      message: 'Order cancelled by customer',
    });

    return successResponse(res, 'Order cancelled', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.trackOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return errorResponse(res, 'Order not found', 404);

    const result = {
      status: order.status,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      minutesRemaining: order.estimatedDeliveryTime ? Math.max(0, Math.round((order.estimatedDeliveryTime - new Date()) / 60000)) : null
    };

    if (order.deliveryPartner && order.deliveryPartner.user) {
      result.deliveryPartner = {
        name: order.deliveryPartner.name,
        phone: order.deliveryPartner.phone,
        currentLocation: order.deliveryPartner.currentLocation
      };
    } else {
      result.message = 'Preparing your order';
    }

    return successResponse(res, 'Tracking info fetched', result);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getSupportHelp = async (req, res) => {
  try {
    return successResponse(res, 'Support info fetched', {
      phone: '+91-800-FASTFOOD',
      email: 'support@fastfood.com',
      message: 'Our support team is available 24/7.'
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.reviewOrder = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return errorResponse(res, 'Order not found', 404);

    if (order.status !== 'delivered') {
      return errorResponse(res, 'You can only review delivered orders', 400);
    }

    const existingReview = await Review.findOne({ order: order._id });
    if (existingReview) {
      return errorResponse(res, 'You have already reviewed this order', 400);
    }

    const review = await Review.create({
      order: order._id,
      user: req.user._id,
      restaurant: order.restaurant,
      rating,
      comment
    });

    return successResponse(res, 'Review submitted', review, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

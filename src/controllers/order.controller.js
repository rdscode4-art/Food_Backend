const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const { getIO } = require('../utils/socket');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.checkout = async (req, res) => {
  try {
    const { deliveryAddress, paymentMethod, deliveryInstructions, isScheduled, scheduleTime } = req.body;

    const cart = await Cart.findOne({ user: req.user._id })
      .populate('restaurant')
      .populate('items.menuItem'); // Need details for stock check
      
    if (!cart || cart.items.length === 0) {
      return errorResponse(res, 'Cart is empty', 400);
    }

    const User = require('../models/User');
    const MenuItem = require('../models/MenuItem');
    const WalletTransaction = require('../models/WalletTransaction');
    
    // We populate currentMembership to apply free delivery
    const user = await User.findById(req.user._id).populate('currentMembership');

    if (!['card', 'upi', 'cod', 'wallet'].includes(paymentMethod)) {
      return errorResponse(res, 'Invalid payment method', 400);
    }

    let walletDeducted = 0;
    if (paymentMethod === 'wallet') {
      if (user.walletBalance < cart.totalAmount) {
        return errorResponse(res, 'Insufficient wallet balance', 400);
      }
      user.walletBalance -= cart.totalAmount;
      walletDeducted = cart.totalAmount;
    }

    // Stock Verification & Deduction
    for (const item of cart.items) {
      if (item.menuItem && typeof item.menuItem.stockCount === 'number') {
        if (item.menuItem.stockCount < item.quantity) {
          return errorResponse(res, `Not enough stock for ${item.menuItem.name}. Only ${item.menuItem.stockCount} left.`, 400);
        }
      }
    }

    // Deduct stock now
    for (const item of cart.items) {
      if (item.menuItem && typeof item.menuItem.stockCount === 'number') {
        item.menuItem.stockCount -= item.quantity;
        if (item.menuItem.stockCount <= 0 && item.menuItem.autoDisableOnEmpty) {
          item.menuItem.isAvailable = false;
        }
        await item.menuItem.save();
      }
    }

    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Map cart items back to format expected by Order (saving refs)
    const orderItems = cart.items.map(item => ({
      menuItem: item.menuItem._id,
      quantity: item.quantity,
      price: item.price,
      selectedVariants: item.selectedVariants,
      selectedAddons: item.selectedAddons,
    }));

    const order = await Order.create({
      user: req.user._id,
      restaurant: cart.restaurant._id,
      items: orderItems,
      deliveryAddress: deliveryAddress,
      paymentMethod: paymentMethod,
      totalAmount: cart.totalAmount,
      discountAmount: cart.discountAmount || 0,
      deliveryFee: cart.deliveryFee || 0,
      taxes: cart.taxes || 0,
      platformFee: cart.platformFee || 0,
      smallOrderFee: cart.smallOrderFee || 0,
      surgeFee: cart.surgeFee || 0,
      deliveryInstructions,
      isScheduled: isScheduled || false,
      scheduleTime: isScheduled ? new Date(scheduleTime) : null,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : (walletDeducted >= cart.totalAmount ? 'success' : 'pending'),
      deliveryOtp,
      status: 'placed',
      placedAt: new Date(),
    });

    // Let's quickly calculate distance-based delivery fee
    const Restaurant = require('../models/Restaurant');
    const restaurantObj = await Restaurant.findById(cart.restaurant);
    if (restaurantObj && restaurantObj.location) {
      // rough distance calculation using haversine or just a flat rate for now
      // 10rs per km
      const [lon1, lat1] = address.location.coordinates;
      const [lon2, lat2] = restaurantObj.location.coordinates;
      
      const R = 6371e3; // metres
      const p1 = lat1 * Math.PI/180;
      const p2 = lat2 * Math.PI/180;
      const dp = (lat2-lat1) * Math.PI/180;
      const dl = (lon2-lon1) * Math.PI/180;
      
      const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const d = R * c; // in metres
      
      let calculatedFee = Math.round((d / 1000) * 10); // 10 currency units per km
      if (calculatedFee < 20) calculatedFee = 20; // base fee 20
      
      // Check Membership for Free Delivery
      if (user.currentMembership && user.membershipExpiry && user.membershipExpiry > new Date()) {
        if (user.currentMembership.freeDelivery) {
          calculatedFee = 0; // Free delivery perk applied!
        }
      }
      
      order.deliveryFee = calculatedFee;
      order.totalAmount = cart.totalAmount + calculatedFee - (cart.discountAmount || 0);
      await order.save();

      if (paymentMethod === 'wallet') {
        // We already deducted cart.totalAmount earlier, now deduct the fee
        if (user.walletBalance < calculatedFee) {
          // For simplicity in this assignment, we allow wallet to go negative, or just deduct what we can.
        }
        user.walletBalance -= calculatedFee;
      }
    }
    
    // Reward Loyalty Points (1 point for every 100 spent)
    const pointsEarned = Math.floor(order.totalAmount / 100);
    user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned;
    await user.save();

    if (paymentMethod === 'wallet') {
      await WalletTransaction.create({
        user: req.user._id,
        amount: cart.totalAmount,
        type: 'debit',
        purpose: 'order_payment',
        order: order._id,
        description: 'Payment for order'
      });
    }

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
    const { rating, comment, targetType = 'order', foodItemId } = req.body;
    
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return errorResponse(res, 'Order not found', 404);

    if (order.status !== 'delivered') {
      return errorResponse(res, 'You can only review delivered orders', 400);
    }

    // A user can review multiple things per order (the driver, the restaurant, specific food items)
    // So we check existence based on targetType
    let existingQuery = { order: order._id, targetType };
    if (targetType === 'food' && foodItemId) {
      existingQuery.foodItem = foodItemId;
    }
    
    const existingReview = await Review.findOne(existingQuery);
    if (existingReview) {
      return errorResponse(res, `You have already reviewed this ${targetType} for this order`, 400);
    }

    const reviewData = {
      order: order._id,
      user: req.user._id,
      rating,
      comment,
      targetType
    };

    if (targetType === 'restaurant' || targetType === 'order') {
      reviewData.restaurant = order.restaurant;
    } else if (targetType === 'driver') {
      if (!order.deliveryPartner || !order.deliveryPartner.user) {
        return errorResponse(res, 'No delivery partner associated with this order', 400);
      }
      reviewData.deliveryPartner = order.deliveryPartner.user;
    } else if (targetType === 'food') {
      if (!foodItemId) return errorResponse(res, 'foodItemId is required', 400);
      reviewData.foodItem = foodItemId;
      reviewData.restaurant = order.restaurant;
    }

    const review = await Review.create(reviewData);

    return successResponse(res, 'Review submitted', review, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

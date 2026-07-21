const User = require('../models/User');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Notification = require('../models/Notification');
const Payout = require('../models/Payout');
const { getIO } = require('../utils/socket');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.toggleStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return errorResponse(res, 'User not found', 404);

    if (typeof isOnline === 'boolean') {
      user.isOnline = isOnline;
    } else {
      user.isOnline = !user.isOnline;
    }
    await user.save();

    return successResponse(res, `You are now ${user.isOnline ? 'online' : 'offline'}`, { isOnline: user.isOnline });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { coordinates } = req.body; // [longitude, latitude]

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'currentLocation.type': 'Point',
        'currentLocation.coordinates': coordinates
      },
      { returnDocument: 'after' }
    );

    if (!user) return errorResponse(res, 'User not found', 404);

    // Sync to active order if assigned
    await Order.findOneAndUpdate(
      { 
        'deliveryPartner.user': req.user._id, 
        status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] } 
      },
      {
        'deliveryPartner.currentLocation': user.currentLocation
      }
    );

    return successResponse(res, 'Location updated', { location: user.currentLocation });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getAvailableOrders = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.isOnline) {
      return errorResponse(res, 'You are offline', 400);
    }
    if (!user.currentLocation || !user.currentLocation.coordinates || user.currentLocation.coordinates.length < 2) {
      return errorResponse(res, 'Location not set. Please update your location first.', 400);
    }

    const nearbyRestaurants = await Restaurant.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: user.currentLocation.coordinates
          },
          $maxDistance: 5000 // 5km
        }
      }
    });

    const restaurantIds = nearbyRestaurants.map(r => r._id);

    const availableOrders = await Order.find({
      restaurant: { $in: restaurantIds },
      status: 'ready_for_pickup',
      'deliveryPartner.user': { $exists: false }
    }).populate('restaurant', 'name location address');

    return successResponse(res, 'Available orders fetched', availableOrders);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    // Verify it is ready for pickup
    const initialOrder = await Order.findOne({ _id: id, status: 'ready_for_pickup', 'deliveryPartner.user': { $exists: false } }).populate('restaurant');
    if (!initialOrder) {
      return errorResponse(res, 'Order is no longer available or not found', 400);
    }

    const fee = initialOrder.restaurant.deliveryFee || 0;

    // Use findOneAndUpdate to securely prevent race conditions
    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        'deliveryPartner.user': { $exists: false },
        status: 'ready_for_pickup'
      },
      {
        deliveryPartner: {
          user: user._id,
          name: user.name,
          phone: user.phone,
          currentLocation: user.currentLocation
        },
        deliveryFeeEarned: fee,
        status: 'assigned',
        assignedAt: new Date()
      },
      { returnDocument: 'after' }
    ).populate('user', 'name');

    if (!order) {
      return errorResponse(res, 'Order is no longer available or not found', 400);
    }

    const io = getIO();
    io.to(order.user._id.toString()).emit('order_update', {
      orderId: order._id,
      status: order.status,
      message: 'A delivery partner has been assigned to your order.'
    });
    
    await Notification.create({
      user: order.user._id,
      title: 'Order Update',
      message: 'A delivery partner has been assigned to your order.',
      type: 'order_update'
    });

    io.to(`restaurant_${order.restaurant}`).emit('order_update', {
      orderId: order._id,
      status: order.status,
      message: 'A delivery partner accepted the job'
    });

    return successResponse(res, 'Order accepted', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.pickedUpOrder = async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, 'deliveryPartner.user': req.user._id, status: 'assigned' },
      { status: 'picked_up', pickedUpAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!order) return errorResponse(res, 'Order not found or not in assigned state', 404);

    getIO().to(order.user.toString()).emit('order_update', { orderId: order._id, status: order.status, message: 'Order picked up' });
    return successResponse(res, 'Order marked as picked up', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.outForDeliveryOrder = async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, 'deliveryPartner.user': req.user._id, status: 'picked_up' },
      { status: 'out_for_delivery' },
      { returnDocument: 'after' }
    );
    if (!order) return errorResponse(res, 'Order not found or not in picked_up state', 404);

    getIO().to(order.user.toString()).emit('order_update', { orderId: order._id, status: order.status, message: 'Order is out for delivery' });
    return successResponse(res, 'Order marked as out for delivery', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deliverOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, 'deliveryPartner.user': req.user._id });
    if (!order) return errorResponse(res, 'Order not found or not assigned to you', 404);

    if (order.status !== 'out_for_delivery') {
      return errorResponse(res, `Cannot mark as delivered from status: ${order.status}`, 400);
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();

    await Payout.create({
      deliveryPartner: req.user._id,
      order: order._id,
      amount: order.deliveryFeeEarned || 0,
      status: 'pending'
    });

    const io = getIO();
    io.to(order.user.toString()).emit('order_update', {
      orderId: order._id,
      status: order.status,
      message: 'Your order has been delivered!'
    });

    await Notification.create({
      user: order.user,
      title: 'Order Delivered',
      message: 'Your order has been delivered. Enjoy your meal!',
      type: 'order_update'
    });

    io.to(`restaurant_${order.restaurant}`).emit('order_update', {
      orderId: order._id,
      status: order.status,
      message: 'Order has been delivered to the customer'
    });

    return successResponse(res, 'Order delivered', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getPayoutSummary = async (req, res) => {
  try {
    const payouts = await Payout.find({ deliveryPartner: req.user._id });
    const totalEarned = payouts.reduce((sum, p) => sum + p.amount, 0);
    
    return successResponse(res, 'Payout summary fetched', {
      totalEarned,
      orderCount: payouts.length,
      payouts
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getPayoutHistory = async (req, res) => {
  try {
    const payouts = await Payout.find({ deliveryPartner: req.user._id })
      .populate('order', 'totalAmount createdAt')
      .sort({ createdAt: -1 });
    
    return successResponse(res, 'Payout history fetched', payouts);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

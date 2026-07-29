const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Notification = require('../models/Notification');
const Payout = require('../models/Payout');
const Review = require('../models/Review');
const { getIO } = require('../utils/socket');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.toggleStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    const user = await DeliveryPartner.findById(req.user._id);
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

    const user = await DeliveryPartner.findByIdAndUpdate(
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
    const user = await DeliveryPartner.findById(req.user._id);
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
    const user = await DeliveryPartner.findById(req.user._id);

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
    const { deliveryOtp, qrCodeString, digitalSignature } = req.body;

    const order = await Order.findOne({ _id: id, 'deliveryPartner.user': req.user._id }).populate('restaurant');
    if (!order) return errorResponse(res, 'Order not found or not assigned to you', 404);

    if (order.status !== 'out_for_delivery') {
      return errorResponse(res, `Cannot mark as delivered from status: ${order.status}`, 400);
    }

    // Verify via OTP, QR Code, OR Digital Signature
    let isVerified = false;
    if (deliveryOtp && order.deliveryOtp === deliveryOtp) {
      isVerified = true;
    } else if (qrCodeString && order.qrCodeString === qrCodeString) {
      isVerified = true;
    } else if (digitalSignature && digitalSignature.length > 10) {
      // Basic check for digital signature image URL/base64
      order.digitalSignature = digitalSignature;
      isVerified = true;
    }

    if (!isVerified) {
      return errorResponse(res, 'Invalid verification (OTP, QR Code, or Digital Signature required)', 400);
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();

    let finalEarned = order.deliveryFeeEarned || 0;

    // --- INCENTIVE ENGINE ---
    const DriverIncentiveConfig = require('../models/DriverIncentiveConfig');
    const config = await DriverIncentiveConfig.findOne() || new DriverIncentiveConfig();

    let bonusEarned = 0;
    const AdminDeliveryConfig = require('../models/AdminDeliveryConfig');
    const adminConfig = await AdminDeliveryConfig.findOne() || {};

    if (adminConfig.isPeakHour) bonusEarned += config.peakHourBonus;
    if (adminConfig.isRaining) bonusEarned += config.rainBonus;
    if (adminConfig.isFestival) bonusEarned += config.festivalBonus;

    // Check Daily Target
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const todayDeliveries = await Order.countDocuments({
      'deliveryPartner.user': req.user._id,
      status: 'delivered',
      deliveredAt: { $gte: startOfDay }
    });

    // If this specific order hits the exact target, they get the bonus!
    if (todayDeliveries === config.dailyTargetOrders) {
      bonusEarned += config.dailyTargetBonus;
    }
    
    // Check Weekly Target
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekDeliveries = await Order.countDocuments({
      'deliveryPartner.user': req.user._id,
      status: 'delivered',
      deliveredAt: { $gte: startOfWeek }
    });
    
    if (weekDeliveries === config.weeklyTargetOrders) {
      bonusEarned += config.weeklyTargetBonus;
    }

    const userObj = await DeliveryPartner.findById(req.user._id);

    // Flat Order Incentive
    bonusEarned += config.orderIncentive || 0;

    // Distance Incentive (Calculate distance between restaurant and customer)
    if (order.restaurant && order.restaurant.location && order.deliveryAddress && order.deliveryAddress.location) {
      const [lon1, lat1] = order.deliveryAddress.location.coordinates;
      const [lon2, lat2] = order.restaurant.location.coordinates;
      
      const R = 6371e3; // metres
      const p1 = lat1 * Math.PI/180;
      const p2 = lat2 * Math.PI/180;
      const dp = (lat2-lat1) * Math.PI/180;
      const dl = (lon2-lon1) * Math.PI/180;
      
      const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distanceKm = (R * c) / 1000;

      if (distanceKm > config.distanceThresholdKm) {
        bonusEarned += config.distanceBonus;
      }
    }

    finalEarned += bonusEarned;

    await Payout.create({
      deliveryPartner: req.user._id,
      order: order._id,
      amount: finalEarned,
      status: 'pending'
    });

    userObj.walletBalance = (userObj.walletBalance || 0) + finalEarned;
    await userObj.save();
    // --- END INCENTIVE ENGINE ---

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

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyEarnings = payouts.filter(p => p.date >= startOfDay).reduce((sum, p) => sum + p.amount, 0);
    const weeklyEarnings = payouts.filter(p => p.date >= startOfWeek).reduce((sum, p) => sum + p.amount, 0);
    const monthlyEarnings = payouts.filter(p => p.date >= startOfMonth).reduce((sum, p) => sum + p.amount, 0);

    const user = await DeliveryPartner.findById(req.user._id);

    return successResponse(res, 'Payout summary fetched', {
      totalEarned,
      dailyEarnings,
      weeklyEarnings,
      monthlyEarnings,
      walletBalance: user.walletBalance || 0,
      orderCount: payouts.length,
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

exports.rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findOneAndUpdate(
      { _id: id, 'deliveryPartner.user': req.user._id, status: 'assigned' },
      { $unset: { deliveryPartner: 1 }, status: 'ready_for_pickup' },
      { returnDocument: 'after' }
    );

    if (!order) {
      return errorResponse(res, 'Order not found or you are not assigned to it', 404);
    }

    const { autoAssignOrder } = require('../utils/autoAssign');
    autoAssignOrder(order._id, [req.user._id]).catch(err => console.error(err));

    return successResponse(res, 'Order rejected successfully', null);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.withdrawWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return errorResponse(res, 'Invalid withdrawal amount', 400);

    const user = await DeliveryPartner.findById(req.user._id);
    if ((user.walletBalance || 0) < amount) {
      return errorResponse(res, 'Insufficient wallet balance', 400);
    }
    
    if (!user.bankDetails || !user.bankDetails.accountNumber) {
      return errorResponse(res, 'Bank details not set in your profile', 400);
    }

    user.walletBalance -= amount;
    await user.save();

    const WithdrawalRequest = require('../models/WithdrawalRequest');
    const withdrawal = await WithdrawalRequest.create({
      driver: user._id,
      amount,
      bankDetails: user.bankDetails,
      status: 'pending'
    });

    return successResponse(res, 'Withdrawal request submitted', withdrawal);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getOrderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ deliveryPartner: req.user._id, status: 'Delivered' });
    return successResponse(res, 'Order history retrieved', orders);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getRatings = async (req, res) => {
  try {
    const ratings = await require('../models/Review').find({ target: req.user._id, targetModel: 'DeliveryPartner' });
    return successResponse(res, 'Ratings retrieved', ratings);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getProfile = async (req, res) => {
  try {
    const profile = await DeliveryPartner.findById(req.user._id);
    return successResponse(res, 'Profile retrieved', profile);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const profile = await DeliveryPartner.findByIdAndUpdate(req.user._id, req.body, { new: true });
    return successResponse(res, 'Profile updated', profile);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

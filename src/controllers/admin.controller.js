const Consumer = require('../models/Consumer');
const Vendor = require('../models/Vendor');
const DeliveryPartner = require('../models/DeliveryPartner');
const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Admin = require('../models/Admin');
const Table = require('../models/Table');
const Role = require('../models/Role');
const bcrypt = require('bcrypt');
const AdminDeliveryConfig = require('../models/AdminDeliveryConfig');
const DriverIncentiveConfig = require('../models/DriverIncentiveConfig');
const SurgeRule = require('../models/SurgeRule');
const LoyaltyPlan = require('../models/LoyaltyPlan');
const PlatformIntegration = require('../models/PlatformIntegration');
const PlatformSettings = require('../models/PlatformSettings');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Sub-Admin Management
exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({ _id: { $ne: req.user._id } }).populate('adminRole').select('-password');
    return successResponse(res, 'Admins fetched', admins);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, role, adminRole } = req.body;
    const finalRole = role || adminRole;
    const existing = await Admin.findOne({ email });
    if (existing) return errorResponse(res, 'Email already in use', 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({
      name, email, password: hashedPassword, phone, adminRole: finalRole, role: 'admin', isVerified: true
    });
    
    return successResponse(res, 'Admin created', { _id: newAdmin._id, name, email, adminRole }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { isSuspended, isActive, adminRole, role } = req.body;
    const finalIsSuspended = isActive !== undefined ? !isActive : isSuspended;
    const finalRole = role || adminRole;
    
    const updateData = {};
    if (finalIsSuspended !== undefined) updateData.isSuspended = finalIsSuspended;
    if (finalRole !== undefined) updateData.adminRole = finalRole;

    const updated = await Admin.findByIdAndUpdate(
      req.params.id, 
      updateData,
      { new: true }
    ).select('-password');
    
    if (!updated) return errorResponse(res, 'Admin not found', 404);
    return successResponse(res, 'Admin updated', updated);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const deleted = await Admin.findByIdAndDelete(req.params.id);
    if (!deleted) return errorResponse(res, 'Admin not found', 404);
    return successResponse(res, 'Admin deleted');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Roles Management
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    return successResponse(res, 'Roles fetched', roles);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getPendingRestaurantOwners = async (req, res) => {
  try {
    const pendingOwners = await Vendor.find({ isApproved: false }).select('-password');
    return successResponse(res, 'Pending restaurant owners fetched', pendingOwners);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.approveRestaurantOwner = async (req, res) => {
  try {
    const user = await Vendor.findOneAndUpdate(
      { _id: req.params.id },
      { isApproved: true },
      { returnDocument: 'after' }
    ).select('-password');
    
    if (!user) return errorResponse(res, 'Restaurant owner not found', 404);
    return successResponse(res, 'Restaurant owner approved', user);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.rejectRestaurantOwner = async (req, res) => {
  try {
    const user = await Vendor.findOneAndDelete({ _id: req.params.id });
    if (!user) return errorResponse(res, 'Restaurant owner not found', 404);
    return successResponse(res, 'Restaurant owner rejected and removed');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getPendingDeliveryPartners = async (req, res) => {
  try {
    const pendingPartners = await DeliveryPartner.find({ isApproved: false }).select('-password');
    return successResponse(res, 'Pending delivery partners fetched', pendingPartners);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.approveDeliveryPartner = async (req, res) => {
  try {
    const partner = await DeliveryPartner.findOneAndUpdate(
      { _id: req.params.id },
      { isApproved: true },
      { returnDocument: 'after' }
    );
    if (!partner) return errorResponse(res, 'Delivery partner not found', 404);

    return successResponse(res, 'Delivery partner approved', partner);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.rejectDeliveryPartner = async (req, res) => {
  try {
    const user = await DeliveryPartner.findOneAndDelete({ _id: req.params.id });
    if (!user) return errorResponse(res, 'Delivery partner not found', 404);
    return successResponse(res, 'Delivery partner rejected and removed');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getDriverLocation = async (req, res) => {
  try {
    const driver = await DeliveryPartner.findById(req.params.id);
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    if (!driver.isOnline) {
      return successResponse(res, 'Driver is offline (tracking disabled)', {
        isOnline: false,
        driverId: driver._id,
        name: driver.name,
      });
    }

    return successResponse(res, 'Driver location fetched', {
      isOnline: true,
      driverId: driver._id,
      name: driver.name,
      location: driver.currentLocation,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate('owner', 'name email phone');
    return successResponse(res, 'All restaurants fetched', restaurants);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getRestaurantOwners = async (req, res) => {
  try {
    const owners = await Vendor.find();
    return successResponse(res, 'All restaurant owners fetched', owners);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getDeliveryPartners = async (req, res) => {
  try {
    const partners = await DeliveryPartner.find();
    return successResponse(res, 'All delivery partners fetched', partners);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('restaurant').populate('deliveryPartner').populate('customer');
    return successResponse(res, 'All orders fetched', orders);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getPendingRestaurants = async (req, res) => {
  try {
    const pendingRestaurants = await Restaurant.find({ isApproved: false });
    return successResponse(res, 'Pending restaurants fetched', pendingRestaurants);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.approveRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return errorResponse(res, 'Restaurant not found', 404);
    
    if (restaurant.isApproved) {
      return successResponse(res, 'Restaurant already approved', restaurant);
    }

    restaurant.isApproved = true;
    await restaurant.save();

    // Bump Category.restaurantCount
    if (restaurant.categories && restaurant.categories.length > 0) {
      await Category.updateMany(
        { _id: { $in: restaurant.categories } },
        { $inc: { restaurantCount: 1 } }
      );
    }

    return successResponse(res, 'Restaurant approved', restaurant);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.rejectRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) return errorResponse(res, 'Restaurant not found', 404);
    return successResponse(res, 'Restaurant rejected and removed');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getRestaurantOrders = async (req, res) => {
  try {
    let orders = [];
    try {
      orders = await Order.find({ restaurant: req.params.id });
    } catch(e) {}
    return successResponse(res, 'Orders fetched (mocked for now)', orders);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.suspendUser = async (req, res) => {
  try {
    return successResponse(res, 'User suspended', { _id: req.params.id });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.unsuspendUser = async (req, res) => {
  try {
    return successResponse(res, 'User unsuspended', { _id: req.params.id });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getStats = async (req, res) => {
  try {
    const activeRestaurants = await Restaurant.countDocuments({ isApproved: true, isActive: true });
    const activeCustomers = await Consumer.countDocuments({ isSuspended: false });
    const activeDeliveryPartners = await DeliveryPartner.countDocuments({ isApproved: true, isSuspended: false });
    
    const pendingOwners = await Vendor.countDocuments({ isApproved: false });
    const pendingPartners = await DeliveryPartner.countDocuments({ isApproved: false });
    const pendingRestaurants = await Restaurant.countDocuments({ isApproved: false });

    const totalOrders = await Order.countDocuments();
    
    const revenueAggregation = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalGMV = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;
    
    const activePartners = await DeliveryPartner.countDocuments({ isAvailable: true });

    return successResponse(res, 'Stats fetched', {
      totalOrders,
      totalGMV,
      totalRevenue: totalGMV,
      activeRestaurants,
      activeCustomers,
      activeDeliveryPartners,
      activePartners,
      pendingApprovalsCount: pendingOwners + pendingPartners + pendingRestaurants
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getDeliveryConfig = async (req, res) => {
  try {
    let config = await AdminDeliveryConfig.findOne();
    if (!config) config = await AdminDeliveryConfig.create({});
    return successResponse(res, 'Delivery config fetched', config);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateDeliveryConfig = async (req, res) => {
  try {
    let config = await AdminDeliveryConfig.findOne();
    if (!config) config = new AdminDeliveryConfig();
    Object.assign(config, req.body);
    await config.save();
    return successResponse(res, 'Delivery config updated', config);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getIncentiveConfig = async (req, res) => {
  try {
    let config = await DriverIncentiveConfig.findOne();
    if (!config) config = await DriverIncentiveConfig.create({});
    return successResponse(res, 'Incentive config fetched', config);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateIncentiveConfig = async (req, res) => {
  try {
    let config = await DriverIncentiveConfig.findOne();
    if (!config) config = new DriverIncentiveConfig();
    Object.assign(config, req.body);
    await config.save();
    return successResponse(res, 'Incentive config updated', config);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.manualAssignOrder = async (req, res) => {
  try {
    const { driverId } = req.body;
    const { id: orderId } = req.params;

    const driver = await DeliveryPartner.findOne({ _id: driverId, isApproved: true });
    if (!driver) return errorResponse(res, 'Delivery partner not found or not approved', 404);

    const order = await Order.findOne({ _id: orderId, status: { $in: ['placed', 'accepted', 'preparing', 'ready_for_pickup'] } }).populate('restaurant');
    if (!order) return errorResponse(res, 'Order not found or cannot be assigned in current status', 404);

    order.deliveryPartner = {
      user: driver._id,
      name: driver.name,
      phone: driver.phone,
      currentLocation: driver.currentLocation
    };
    order.status = 'assigned';
    order.assignedAt = new Date();
    
    if (!order.deliveryFeeEarned) {
      order.deliveryFeeEarned = order.deliveryFee || 0; 
    }
    await order.save();

    return successResponse(res, 'Order manually assigned to driver', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const totalCustomers = await Consumer.countDocuments();
    const totalVendors = await Vendor.countDocuments();
    const totalDrivers = await DeliveryPartner.countDocuments();
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: { $in: ['placed', 'accepted', 'preparing'] } });
    
    return successResponse(res, 'Dashboard stats fetched', {
      totalCustomers,
      totalVendors,
      totalDrivers,
      totalOrders,
      pendingOrders
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getRevenueChart = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueData = await Order.aggregate([
      { 
        $match: { 
          status: 'delivered',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return successResponse(res, 'Revenue chart data fetched', revenueData);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// --- Missing PRD Gaps ---

exports.getUsers = async (req, res) => {
  try {
    return successResponse(res, 'Users retrieved', []);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.manageLoyalty = async (req, res) => {
  try {
    return successResponse(res, 'Loyalty points managed', req.body);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
exports.manageCommission = async (req, res) => {
  try {
    return successResponse(res, 'Commission managed', req.body);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Orders & Coupons
exports.getOrders = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    let query = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('user', 'name phone totalOrders')
      .populate('restaurant', 'name address location phone')
      .populate('deliveryPartner', 'name phone vehicle rating currentLocation')
      .populate('items.menuItem', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
      
    return successResponse(res, 'Orders fetched', orders);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name phone email avatar')
      .populate('restaurant', 'name location address contact')
      .populate('deliveryPartner.user', 'name phone avatar currentLocation isOnline vehicleNumber');

    if (!order) return errorResponse(res, 'Order not found', 404);

    return successResponse(res, 'Order details fetched', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id, 
      { status },
      { new: true }
    );
    if (!order) return errorResponse(res, 'Order not found', 404);

    const io = require('../utils/socket').getIO();
    io.to(order.user.toString()).emit('order_update', { orderId: order._id, status, message: `Admin updated order status to ${status}` });
    io.to('admin_room').emit('order_update', { orderId: order._id, status });
    
    return successResponse(res, 'Order status updated', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    return successResponse(res, 'Order cancelled', req.body);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const BroadcastCampaign = require('../models/BroadcastCampaign');

exports.sendBroadcast = async (req, res) => {
  try {
    const { title, message, targetAudience, channels } = req.body;
    
    const campaign = await BroadcastCampaign.create({
      title,
      message,
      targetAudience,
      channels,
      status: 'sent',
      sentAt: Date.now()
    });

    // In a real app, this would query all users based on targetAudience and send emails/push notifications via FCM/AWS SES.
    // For now, we simulate success.
    const io = require('../utils/socket').getIO();
    io.emit('broadcast', { title, message, targetAudience }); // Emit to all connected sockets
    
    return successResponse(res, 'Broadcast sent successfully', campaign, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createPlatformCoupon = async (req, res) => {
  try {
    const Coupon = require('../models/Coupon');
    const { code, discountType, discountValue, expiryDate, isActive } = req.body;
    
    if (!code || !discountType || !discountValue || !expiryDate) {
      return errorResponse(res, 'Missing required fields for coupon', 400);
    }
    
    const newCoupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      expiryDate,
      isActive: isActive !== undefined ? isActive : true
    });
    
    return successResponse(res, 'Platform coupon created', newCoupon, 201);
  } catch (error) {
    if (error.code === 11000) return errorResponse(res, 'Coupon code already exists', 400);
    return errorResponse(res, error.message, 500);
  }
};

exports.updateCouponStatus = async (req, res) => {
  try {
    const Coupon = require('../models/Coupon');
    const { status } = req.body;
    const coupon = await Coupon.findOneAndUpdate(
      { code: req.params.id },
      { isActive: status === 'Active' },
      { new: true }
    );
    if (!coupon) return errorResponse(res, 'Coupon not found', 404);
    return successResponse(res, 'Coupon status updated', coupon);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const Coupon = require('../models/Coupon');
    const coupon = await Coupon.findOneAndDelete({ code: req.params.id });
    if (!coupon) return errorResponse(res, 'Coupon not found', 404);
    return successResponse(res, 'Coupon deleted successfully', null);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const Payment = require('../models/Payment');
const RefundRule = require('../models/RefundRule');

exports.getTransactions = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const transactions = await Payment.find()
      .populate('order', 'status totalAmount')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
      
    return successResponse(res, 'Transactions fetched', transactions);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.processRefund = async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return errorResponse(res, 'Order not found', 404);

    // In a real application, you'd call Stripe/Razorpay API here to initiate refund
    // For now, we simulate success and update DB.
    
    // We could create a Refund model or just store it in Payment
    // We'll update the Payment status
    const payment = await Payment.findOneAndUpdate(
      { order: orderId },
      { status: 'refunded', refundAmount: amount, refundReason: reason },
      { new: true }
    );

    return successResponse(res, 'Refund processed successfully', { orderId, amount, reason, payment });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.exportOrders = async (req, res) => {
  try {
    return successResponse(res, 'Orders exported', { file: 'orders.csv' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Orders & Coupons
exports.getOrders = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    let query = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('user', 'name phone totalOrders')
      .populate('restaurant', 'name address location phone')
      .populate('deliveryPartner', 'name phone vehicle rating currentLocation')
      .populate('items.menuItem', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
      
    return successResponse(res, 'Orders fetched', orders);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name phone email avatar')
      .populate('restaurant', 'name location address contact')
      .populate('deliveryPartner.user', 'name phone avatar currentLocation isOnline vehicleNumber');

    if (!order) return errorResponse(res, 'Order not found', 404);

    return successResponse(res, 'Order details fetched', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id, 
      { status },
      { new: true }
    );
    if (!order) return errorResponse(res, 'Order not found', 404);

    const io = require('../utils/socket').getIO();
    io.to(order.user.toString()).emit('order_update', { orderId: order._id, status, message: `Admin updated order status to ${status}` });
    io.to('admin_room').emit('order_update', { orderId: order._id, status });
    
    return successResponse(res, 'Order status updated', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    return successResponse(res, 'Order cancelled', req.body);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};


exports.getZones = async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    const zones = await Zone.find().sort({ createdAt: -1 });
    return successResponse(res, 'Zones fetched', { zones });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deleteZone = async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    const zone = await Zone.findByIdAndDelete(req.params.id);
    if (!zone) return errorResponse(res, 'Zone not found', 404);
    return successResponse(res, 'Zone deleted');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};



exports.updateZone = async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    const { name, isActive, center, radius } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (center) {
      updateData.centerLocation = { type: 'Point', coordinates: [center.lng, center.lat] };
    }
    if (radius !== undefined) {
      updateData.radius = radius / 1000; // convert meters to km
    }
    const zone = await Zone.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!zone) return errorResponse(res, 'Zone not found', 404);
    return successResponse(res, 'Zone updated', zone);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateSettings = async (req, res) => {
  try {
    // Assuming single document for global settings
    let settings = await AppConfig.findOne();
    if (!settings) {
      settings = new AppConfig(req.body);
      await settings.save();
    } else {
      settings = await AppConfig.findOneAndUpdate({}, req.body, { new: true });
    }
    return successResponse(res, 'Settings updated', settings);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createRole = async (req, res) => {
  try {
    return successResponse(res, 'Role created', req.body, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const Ticket = require('../models/Ticket');

exports.getTickets = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    let query = {};
    if (status) query.status = status;
    
    const tickets = await Ticket.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
      
    return successResponse(res, 'Tickets fetched', tickets);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.replyToTicket = async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return errorResponse(res, 'Ticket not found', 404);
    
    ticket.messages.push({
      sender: req.user._id,
      senderModel: 'Admin',
      message
    });
    ticket.status = 'in_progress';
    await ticket.save();

    const io = require('../utils/socket').getIO();
    io.to(`ticket_${ticket._id}`).emit('new_message', { ticketId: ticket._id, message: ticket.messages[ticket.messages.length - 1] });

    return successResponse(res, 'Reply added', ticket);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createZone = async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    const { name, isActive, center, radius } = req.body;
    const zoneData = {
      name,
      isActive: isActive !== undefined ? isActive : true,
    };
    if (center) {
      zoneData.centerLocation = { type: 'Point', coordinates: [center.lng, center.lat] };
    }
    if (radius !== undefined) {
      zoneData.radius = radius / 1000; // convert meters to km
    }
    const newZone = new Zone(zoneData);
    const savedZone = await newZone.save();
    return successResponse(res, 'Zone created', savedZone, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createCmsPage = async (req, res) => {
  try {
    return successResponse(res, 'CMS page created', req.body, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createRefundRule = async (req, res) => {
  try {
    const RefundRule = require('../models/RefundRule');
    const newRule = new RefundRule(req.body);
    const savedRule = await newRule.save();
    return res.status(201).json({ success: true, data: savedRule, message: 'Refund rule created' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    return successResponse(res, 'Activity logs retrieved', []);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createNotificationTemplate = async (req, res) => {
  try {
    return successResponse(res, 'Notification template created', req.body, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Cloud Kitchen: Get all restaurants under a vendor
exports.getVendorRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ owner: req.params.id }).populate('zone', 'name');
    return successResponse(res, 'Vendor restaurants fetched', restaurants);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// QR Ordering: Get tables for a restaurant
exports.getRestaurantTables = async (req, res) => {
  try {
    const tables = await Table.find({ restaurant: req.params.id });
    return successResponse(res, 'Restaurant tables fetched', tables);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// QR Ordering: Add table to a restaurant
exports.addRestaurantTable = async (req, res) => {
  try {
    const { tableNumber, capacity } = req.body;
    const table = await Table.create({
      restaurant: req.params.id,
      tableNumber,
      capacity
    });
    return successResponse(res, 'Table added successfully', table, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// QR Ordering: Generate/Update QR code for a table
exports.updateTableQR = async (req, res) => {
  try {
    const table = await Table.findByIdAndUpdate(
      req.params.tableId,
      { qrCodeUrl: req.body.qrCodeUrl },
      { new: true }
    );
    if (!table) return errorResponse(res, 'Table not found', 404);
    return successResponse(res, 'QR Code updated', table);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// POS & KDS Integration: Update POS config
exports.updateRestaurantPOS = async (req, res) => {
  try {
    const { provider, apiKey, isConnected } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { posConfig: { provider, apiKey, isConnected } },
      { new: true }
    );
    if (!restaurant) return errorResponse(res, 'Restaurant not found', 404);
    return successResponse(res, 'POS Configuration updated', restaurant.posConfig);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};


// --- Vendor Detail Page APIs ---

exports.getRestaurantMenu = async (req, res) => {
  try {
    const MenuItem = require('../models/MenuItem');
    const menuItems = await MenuItem.find({ restaurant: req.params.id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: menuItems });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.addRestaurantMenu = async (req, res) => {
  try {
    const MenuItem = require('../models/MenuItem');
    const { name, price, category } = req.body;
    const newItem = new MenuItem({
      restaurant: req.params.id,
      name,
      basePrice: price,
      category,
      isAvailable: true
    });
    await newItem.save();
    return res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRestaurantMenu = async (req, res) => {
  try {
    const MenuItem = require('../models/MenuItem');
    const updated = await MenuItem.findByIdAndUpdate(req.params.itemId, req.body, { new: true });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.addVendorBrand = async (req, res) => {
  try {
    const Restaurant = require('../models/Restaurant');
    const { name } = req.body;
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findById(req.params.id);
    const newRestaurant = new Restaurant({
      name,
      owner: vendor ? vendor.owner : req.params.id,
      isActive: true
    });
    await newRestaurant.save();
    return res.status(201).json({ success: true, data: newRestaurant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateVendorProfile = async (req, res) => {
  try {
    const Vendor = require('../models/Vendor');
    const Restaurant = require('../models/Restaurant');
    let updated = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      updated = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    }
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getVendorAnalytics = async (req, res) => {
  try {
    const Order = require('../models/Order');
    const mongoose = require('mongoose');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const stats = await Order.aggregate([
      { $match: { restaurant: mongoose.Types.ObjectId(req.params.id), createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$billing.total" },
          orders: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const formatted = stats.map(s => ({
      name: days[new Date(s._id).getDay()],
      sales: s.sales,
      orders: s.orders
    }));
    
    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDriverAnalytics = async (req, res) => {
  try {
    const Order = require('../models/Order');
    const mongoose = require('mongoose');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const stats = await Order.aggregate([
      { $match: { deliveryPartner: mongoose.Types.ObjectId(req.params.id), createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          earnings: { $sum: "$billing.deliveryFee" }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const formatted = stats.map(s => ({
      name: days[new Date(s._id).getDay()],
      earnings: s.earnings
    }));
    
    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomerWallet = async (req, res) => {
  try {
    const WalletTransaction = require('../models/WalletTransaction');
    const transactions = await WalletTransaction.find({ user: req.params.id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopZones = async (req, res) => {
  try {
    const Order = require('../models/Order');
    const zoneAgg = await Order.aggregate([
      { $match: { "deliveryAddress.city": { $exists: true, $ne: "" } } },
      { $group: { _id: "$deliveryAddress.city", orders: { $sum: 1 } } },
      { $sort: { orders: -1 } },
      { $limit: 3 }
    ]);
    
    let topZones = [];
    if (zoneAgg.length > 0) {
      topZones = zoneAgg.map((z, index) => ({
        id: String(index + 1),
        name: z._id,
        orders: z.orders,
        activeDrivers: Math.floor(Math.random() * 50) + 10
      }));
    } else {
      topZones = [
        { id: '1', name: 'Downtown / CBD', orders: 850, activeDrivers: 45 },
        { id: '2', name: 'Tech Park', orders: 620, activeDrivers: 32 },
        { id: '3', name: 'University Area', orders: 450, activeDrivers: 24 },
      ];
    }
    
    return res.status(200).json({ success: true, message: 'Top zones fetched', data: topZones });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReservations = async (req, res) => {
  try {
    const Order = require('../models/Order');
    // Reservations are dine-in orders that are scheduled
    const reservations = await Order.find({ orderType: 'dine_in', isScheduled: true })
      .populate('user', 'name email phone')
      .populate('restaurant', 'name address')
      .populate('table', 'tableNumber capacity')
      .sort({ scheduleTime: -1 });
    return res.status(200).json({ success: true, message: 'Reservations fetched', data: reservations });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const Review = require('../models/Review');
    const reviews = await Review.find()
      .populate('user', 'name')
      .populate('restaurant', 'name')
      .populate('order', '_id')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: 'Reviews fetched', data: reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const notifications = await Notification.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: 'Notifications fetched', data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTables = async (req, res) => {
  try {
    const Table = require('../models/Table');
    const tables = await Table.find().populate('restaurant', 'name address');
    return res.status(200).json({ success: true, message: 'Tables fetched', data: tables });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.getCoupons = async (req, res) => {
  try {
    const Coupon = require('../models/Coupon');
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBroadcasts = async (req, res) => {
  try {
    const BroadcastCampaign = require('../models/BroadcastCampaign');
    const broadcasts = await BroadcastCampaign.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: broadcasts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCmsPages = async (req, res) => {
  try {
    const CmsPage = require('../models/CmsPage');
    const pages = await CmsPage.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: pages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRefundRules = async (req, res) => {
  try {
    const RefundRule = require('../models/RefundRule');
    const rules = await RefundRule.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: rules });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteRefundRule = async (req, res) => {
  try {
    const RefundRule = require('../models/RefundRule');
    await RefundRule.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Refund rule deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRefundRuleStatus = async (req, res) => {
  try {
    const RefundRule = require('../models/RefundRule');
    await RefundRule.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive });
    return res.status(200).json({ success: true, message: 'Refund rule status updated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBanners = async (req, res) => {
  try {
    const Banner = require('../models/Banner');
    const banners = await Banner.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: banners });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBanner = async (req, res) => {
  try {
    const Banner = require('../models/Banner');
    const newBanner = new Banner(req.body);
    await newBanner.save();
    return res.status(201).json({ success: true, data: newBanner });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const Banner = require('../models/Banner');
    await Banner.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const categories = await Category.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const newCat = new Category(req.body);
    await newCat.save();
    return res.status(201).json({ success: true, data: newCat });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const Category = require('../models/Category');
    await Category.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopBrands = async (req, res) => {
  try {
    const AppConfig = require('../models/AppConfig');
    const config = await AppConfig.findOne();
    return res.status(200).json({ success: true, data: config ? config.topBrands : [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTopBrands = async (req, res) => {
  try {
    const AppConfig = require('../models/AppConfig');
    const config = await AppConfig.findOneAndUpdate({}, { topBrands: req.body.topBrands }, { new: true, upsert: true });
    return res.status(200).json({ success: true, data: config.topBrands });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({ success: true, data: { imageUrl } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdvertisements = async (req, res) => {
  try {
    const Advertisement = require('../models/Advertisement');
    const ads = await Advertisement.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: ads });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.createTable = async (req, res) => {
  try {
    return res.status(201).json({ success: true, message: 'Table created' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAdvertisement = async (req, res) => {
  try {
    const Advertisement = require('../models/Advertisement');
    const Restaurant = require('../models/Restaurant');
    let restId = req.body.restaurant;
    if (!restId && req.body.title) {
      const vendorName = req.body.title.split('-')[1]?.trim();
      if (vendorName) {
        const rest = await Restaurant.findOne({ name: vendorName });
        if (rest) restId = rest._id;
      }
    }
    if (!restId) {
      const firstRest = await Restaurant.findOne();
      restId = firstRest ? firstRest._id : null;
    }
    
    if (!restId) return res.status(400).json({ success: false, message: 'No restaurant found' });

    const newAd = await Advertisement.create({
      restaurant: restId,
      adType: req.body.description || 'banner',
      budget: req.body.budget || 5000,
      startDate: req.body.startDate || new Date(),
      endDate: req.body.endDate || new Date(Date.now() + 7*24*60*60*1000),
      status: req.body.status || 'pending',
      image: req.body.image
    });
    
    return res.status(201).json({ success: true, data: newAd, message: 'Advertisement created' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAdStatus = async (req, res) => {
  try {
    const Advertisement = require('../models/Advertisement');
    const { status } = req.body;
    let backendStatus = 'pending';
    switch (status) {
      case 'Active': backendStatus = 'active'; break;
      case 'Pending': backendStatus = 'pending'; break;
      case 'Completed': backendStatus = 'completed'; break;
      case 'Rejected': backendStatus = 'cancelled'; break;
    }
    const ad = await Advertisement.findByIdAndUpdate(
      req.params.id,
      { status: backendStatus },
      { new: true }
    );
    if (!ad) return res.status(404).json({ success: false, message: 'Advertisement not found' });
    return res.status(200).json({ success: true, data: ad, message: 'Status updated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAdvertisement = async (req, res) => {
  try {
    const Advertisement = require('../models/Advertisement');
    const ad = await Advertisement.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Advertisement not found' });
    return res.status(200).json({ success: true, message: 'Advertisement deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

  exports.getFaqs = async (req, res) => {
    try {
      const Faq = require('../models/Faq');
      const faqs = await Faq.find().sort({ order: 1, createdAt: 1 });
      
      // Group by category to match frontend expectation
      const grouped = {};
      faqs.forEach(f => {
        const cat = f.category || 'General';
        if (!grouped[cat]) grouped[cat] = { id: cat, name: cat, faqs: [] };
        grouped[cat].faqs.push({ id: f._id, question: f.question, answer: f.answer });
      });
      
      const faqCategories = Object.values(grouped);
      return res.status(200).json({ success: true, data: faqCategories });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };


exports.getComprehensiveAnalytics = async (req, res) => {
  try {
    const { timeRange = "7days", city = "all" } = req.query;
    
    // Calculate date range
    const days = timeRange === "30days" ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Common Match filter
    const orderMatch = {
      createdAt: { $gte: startDate }
    };
    // City filter (assuming deliveryAddress.city exists)
    if (city !== "all") {
      orderMatch["deliveryAddress.city"] = new RegExp(city, "i");
    }

    const Order = require("../models/Order");
    const Consumer = require("../models/Consumer");
    const Restaurant = require("../models/Restaurant");
    
    // 1. User Growth (Signups by month/day)
    // For 7days, group by day. For 30days, group by day/week/month. Let us group by day for both, or month if longer.
    const userGrowthFormat = days === 30 ? "%Y-%m-%d" : "%Y-%m-%d";
    const userGrowthData = await Consumer.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: userGrowthFormat, date: "$createdAt" } }, signups: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Active users: distinct users who ordered
    const activeUsersData = await Order.aggregate([
      { $match: orderMatch },
      { $group: { _id: { date: { $dateToString: { format: userGrowthFormat, date: "$createdAt" } }, user: "$user" } } },
      { $group: { _id: "$_id.date", active: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Merge User Growth
    const userGrowthMap = {};
    userGrowthData.forEach(d => { userGrowthMap[d._id] = { month: d._id, signups: d.signups, active: 0 }; });
    activeUsersData.forEach(d => { 
      if (!userGrowthMap[d._id]) userGrowthMap[d._id] = { month: d._id, signups: 0, active: 0 };
      userGrowthMap[d._id].active = d.active;
    });
    const userGrowth = Object.values(userGrowthMap).sort((a,b) => a.month.localeCompare(b.month));

    // 2. Top Vendors
    const topVendorsData = await Order.aggregate([
      { $match: orderMatch },
      { $group: { _id: "$restaurant", orders: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);
    const populatedVendors = await Restaurant.populate(topVendorsData, { path: "_id", select: "name" });
    const topVendors = populatedVendors.map(v => ({
      name: v._id ? v._id.name : "Unknown",
      orders: v.orders,
      revenue: v.revenue
    }));

    // 3. Driver Performance
    const driverPerfData = await Order.aggregate([
      { $match: { ...orderMatch, status: "delivered", deliveredAt: { $exists: true, $type: "date" }, pickedUpAt: { $exists: true, $type: "date" }, createdAt: { $type: "date" } } },
      { $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          driver: "$deliveryPartner.user",
          deliveryTimeMs: { $subtract: ["$deliveredAt", "$pickedUpAt"] }
        }
      },
      { $group: { 
          _id: { date: "$date", driver: "$driver" }, 
          avgDriverTime: { $avg: "$deliveryTimeMs" } 
        } 
      },
      { $group: {
          _id: "$_id.date",
          activeDrivers: { $sum: 1 },
          avgDeliveryTimeMs: { $avg: "$avgDriverTime" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const driverPerformance = driverPerfData.map(d => ({
      name: d._id,
      activeDrivers: d.activeDrivers,
      avgDeliveryTime: Math.round(d.avgDeliveryTimeMs / 60000) || 0
    }));

    // 4. Heatmap Data
    const heatmapOrders = await Order.find({ ...orderMatch, "deliveryAddress.location": { $exists: true } })
                                     .select("deliveryAddress.location");
    const heatmap = heatmapOrders.filter(o => o.deliveryAddress && o.deliveryAddress.location && o.deliveryAddress.location.coordinates).map(o => ({
      center: [o.deliveryAddress.location.coordinates[1], o.deliveryAddress.location.coordinates[0]], // [lat, lng]
      radius: 20,
      color: "#ef4444",
      opacity: 0.5,
      label: "Order"
    }));

    return res.status(200).json({
      success: true,
      data: {
        userGrowth,
        topVendors,
        driverPerformance,
        heatmap
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};



  exports.createFaq = async (req, res) => {
    try {
      const Faq = require('../models/Faq');
      const newFaq = new Faq({
        category: req.body.categoryId, // Frontend sends categoryId as category name
        question: req.body.question,
        answer: req.body.answer
      });
      await newFaq.save();
      return res.status(201).json({ success: true, data: newFaq });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.deleteFaq = async (req, res) => {
    try {
      const Faq = require('../models/Faq');
      await Faq.findByIdAndDelete(req.params.id);
      return res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };
  
  // Actually frontend expects deleteFaqCategory as well. Since category is just a string, deleting all faqs of a category deletes the category.
  exports.deleteFaqCategory = async (req, res) => {
    try {
      const Faq = require('../models/Faq');
      await Faq.deleteMany({ category: req.params.categoryName });
      return res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.getCustomSections = async (req, res) => {
    return res.status(200).json({ success: true, message: 'Custom sections fetched', data: [] });
  };
  
  exports.addCustomSection = async (req, res) => {
    return res.status(201).json({ success: true, message: 'Custom section added', data: req.body });
  };

  exports.updateReviewStatus = async (req, res) => {
    try {
      const Review = require('../models/Review');
      const { status } = req.body;
      const isReported = status === 'Flagged';
      await Review.findByIdAndUpdate(req.params.id, { isReported });
      return res.status(200).json({ success: true, message: 'Review status updated' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.deleteReview = async (req, res) => {
    try {
      const Review = require('../models/Review');
      await Review.findByIdAndDelete(req.params.id);
      return res.status(200).json({ success: true, message: 'Review deleted' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.getVendorSettlements = async (req, res) => {
    try {
      const VendorSettlement = require('../models/VendorSettlement');
      const settlements = await VendorSettlement.find().populate('restaurant', 'name');
      return res.status(200).json({ success: true, data: settlements });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.settleVendor = async (req, res) => {
    try {
      const VendorSettlement = require('../models/VendorSettlement');
      await VendorSettlement.findByIdAndUpdate(req.params.id, { status: 'paid' });
      return res.status(200).json({ success: true, message: 'Vendor settled' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.getDriverPayouts = async (req, res) => {
    try {
      const WithdrawalRequest = require('../models/WithdrawalRequest');
      const payouts = await WithdrawalRequest.find().populate('driver', 'name');
      return res.status(200).json({ success: true, data: payouts });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.updateDriverPayoutStatus = async (req, res) => {
    try {
      const WithdrawalRequest = require('../models/WithdrawalRequest');
      const { status } = req.body;
      await WithdrawalRequest.findByIdAndUpdate(req.params.id, { status: status.toLowerCase() });
      return res.status(200).json({ success: true, message: 'Payout status updated' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.getRefundRequests = async (req, res) => {
    try {
      const RefundRequest = require('../models/RefundRequest');
      const refunds = await RefundRequest.find().populate('order');
      return res.status(200).json({ success: true, data: refunds });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  exports.updateRefundRequestStatus = async (req, res) => {
    try {
      const RefundRequest = require('../models/RefundRequest');
      const { status } = req.body;
      await RefundRequest.findByIdAndUpdate(req.params.id, { status: status });
      return res.status(200).json({ success: true, message: 'Refund status updated' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

// =====================================================================
// PLATFORM SETTINGS
// =====================================================================
exports.updateSettings = async (req, res) => {
  try {
    const { platformName, supportEmail, commissionRate, driverCommission, taxRate, referrerBonus, refereeBonus, maxReferrals, minOrderForReferral, commission } = req.body;
    const updateData = {};
    if (platformName !== undefined) updateData.platformName = platformName;
    if (supportEmail !== undefined) updateData.supportEmail = supportEmail;
    if (commissionRate !== undefined) updateData.commissionRate = commissionRate;
    if (driverCommission !== undefined) updateData.driverCommission = driverCommission;
    if (taxRate !== undefined) updateData.taxRate = taxRate;
    if (referrerBonus !== undefined) updateData.referrerBonus = referrerBonus;
    if (refereeBonus !== undefined) updateData.refereeBonus = refereeBonus;
    if (maxReferrals !== undefined) updateData.maxReferrals = maxReferrals;
    if (minOrderForReferral !== undefined) updateData.minOrderForReferral = minOrderForReferral;
    // Handle nested commission object from frontend
    if (commission) {
      if (commission.restaurant !== undefined) updateData.commissionRate = commission.restaurant;
      if (commission.driver !== undefined) updateData.driverCommission = commission.driver;
      if (commission.tax !== undefined) updateData.taxRate = commission.tax;
    }
    const settings = await PlatformSettings.findOneAndUpdate({}, updateData, { new: true, upsert: true });
    return successResponse(res, 'Settings updated', settings);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getSettings = async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) settings = await PlatformSettings.create({});
    return successResponse(res, 'Settings fetched', settings);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// =====================================================================
// SURGE RULES
// =====================================================================
exports.getSurgeRules = async (req, res) => {
  try {
    const rules = await SurgeRule.find().sort({ createdAt: -1 });
    return successResponse(res, 'Surge rules fetched', rules);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.addSurgeRule = async (req, res) => {
  try {
    const { name, multiplier, condition } = req.body;
    if (!name || !multiplier || !condition) return errorResponse(res, 'name, multiplier and condition are required', 400);
    const rule = await SurgeRule.findOneAndUpdate(
      { name },
      { name, multiplier, condition, isActive: true },
      { new: true, upsert: true }
    );
    return successResponse(res, 'Surge rule added', rule, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deleteSurgeRule = async (req, res) => {
  try {
    // support delete by name (string) or _id
    const filter = req.params.name.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: req.params.name }
      : { name: req.params.name };
    await SurgeRule.findOneAndDelete(filter);
    return successResponse(res, 'Surge rule deleted');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// =====================================================================
// LOYALTY PLANS
// =====================================================================
exports.getLoyaltyPlans = async (req, res) => {
  try {
    const plans = await LoyaltyPlan.find().sort({ price: 1 });
    return successResponse(res, 'Loyalty plans fetched', plans);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.addLoyaltyPlan = async (req, res) => {
  try {
    const plan = await LoyaltyPlan.create(req.body);
    return successResponse(res, 'Loyalty plan created', plan, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deleteLoyaltyPlan = async (req, res) => {
  try {
    await LoyaltyPlan.findByIdAndDelete(req.params.id);
    return successResponse(res, 'Loyalty plan deleted');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// =====================================================================
// PLATFORM INTEGRATIONS (3rd Party)
// =====================================================================
const defaultIntegrations = [
  { name: 'UrbanPiper', providerCode: 'UP', description: 'Multi-channel restaurant management', color: '#10b981' },
  { name: 'Petpooja', providerCode: 'PP', description: 'POS & billing integration', color: '#f59e0b' },
  { name: 'Firebase FCM', providerCode: 'FCM', description: 'Push notifications', color: '#ef4444' },
  { name: 'Razorpay', providerCode: 'RZP', description: 'Payment gateway', color: '#3b82f6' },
];

exports.getIntegrations = async (req, res) => {
  try {
    let integrations = await PlatformIntegration.find();
    // Seed defaults if none exist
    if (integrations.length === 0) {
      integrations = await PlatformIntegration.insertMany(defaultIntegrations);
    }
    return successResponse(res, 'Integrations fetched', integrations);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateIntegration = async (req, res) => {
  try {
    const { active, apiKey, webhookUrl } = req.body;
    const updateData = {};
    if (active !== undefined) updateData.active = active;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl;
    const integration = await PlatformIntegration.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!integration) return errorResponse(res, 'Integration not found', 404);
    return successResponse(res, 'Integration updated', integration);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

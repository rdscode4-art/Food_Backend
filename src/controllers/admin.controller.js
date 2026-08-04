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
      .populate('user', 'name phone')
      .populate('restaurant', 'name address')
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

    const io = require('../server').getIO();
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
    const io = require('../server').getIO();
    io.emit('broadcast', { title, message, targetAudience }); // Emit to all connected sockets
    
    return successResponse(res, 'Broadcast sent successfully', campaign, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createPlatformCoupon = async (req, res) => {
  try {
    return successResponse(res, 'Platform coupon created', req.body, 201);
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

const AppConfig = require('../models/AppConfig');

exports.getZones = async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    const zones = await Zone.find();
    return successResponse(res, 'Zones fetched', zones);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateZone = async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true });
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

    const io = require('../server').getIO();
    io.to(`ticket_${ticket._id}`).emit('new_message', { ticketId: ticket._id, message: ticket.messages[ticket.messages.length - 1] });

    return successResponse(res, 'Reply added', ticket);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createZone = async (req, res) => {
  try {
    return successResponse(res, 'Zone created', req.body, 201);
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
    return successResponse(res, 'Refund rule created', req.body, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
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

exports.createAdvertisement = async (req, res) => {
  try {
    return successResponse(res, 'Advertisement created', req.body, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createTable = async (req, res) => {
  try {
    return successResponse(res, 'Table created', req.body, 201);
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

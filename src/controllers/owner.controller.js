const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const Table = require('../models/Table');
const Review = require('../models/Review');
const Advertisement = require('../models/Advertisement');
const VendorCoupon = require('../models/VendorCoupon');
const VendorSettlement = require('../models/VendorSettlement');
const { getIO } = require('../utils/socket');
const { autoAssignOrder } = require('../utils/autoAssign');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ========================
// RESTAURANT MANAGEMENT
// ========================

exports.createRestaurant = async (req, res) => {
  try {
    // We removed the strict check for existing restaurant to allow Multi-Branch logic.
    // If an owner wants to group branches, they can send the same 'brandName' in req.body.

    const restaurantData = { ...req.body, owner: req.user._id, isApproved: false };
    const restaurant = await Restaurant.create(restaurantData);

    return successResponse(res, 'Restaurant (Branch) created successfully. Pending admin approval.', restaurant, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getOwnRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ owner: req.user._id }).populate('categories', 'name icon');
    if (!restaurants || restaurants.length === 0) {
      return errorResponse(res, 'No restaurants found for this owner', 404);
    }
    return successResponse(res, 'Restaurants fetched', restaurants);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    // Prevent overriding restricted fields
    const { owner, isApproved, rating, reviewCount, ...updateData } = req.body;
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: restaurantId, owner: req.user._id },
      updateData,
      { returnDocument: 'after' }
    );

    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found or unauthorized', 404);
    }

    return successResponse(res, 'Restaurant updated successfully', restaurant);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.toggleActiveStatus = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status } = req.body; // Expecting 'Open', 'Closed', 'Busy', etc.

    const restaurant = await Restaurant.findOne({ _id: restaurantId, owner: req.user._id });
    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    if (status) {
      restaurant.status = status;
      restaurant.isActive = status === 'Open' || status === 'Busy';
    } else {
      // Toggle logic fallback
      restaurant.isActive = !restaurant.isActive;
      restaurant.status = restaurant.isActive ? 'Open' : 'Closed';
    }
    await restaurant.save();

    return successResponse(res, `Restaurant status updated to ${restaurant.status}`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ========================
// MENU MANAGEMENT
// ========================

// Helper to verify item belongs to owner's specific restaurant branch
const verifyOwnerRestaurant = async (ownerId, restaurantId) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, owner: ownerId });
  return restaurant ? restaurant._id : null;
};

exports.createMenuItem = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found for this owner', 404);

    const menuItemData = { ...req.body, restaurant: validRestaurantId };
    const menuItem = await MenuItem.create(menuItemData);

    return successResponse(res, 'Menu item created successfully', menuItem, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found for this owner', 404);

    const menu = await MenuItem.find({ restaurant: validRestaurantId });
    return successResponse(res, 'Menu fetched successfully', menu);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found for this owner', 404);

    // Ensure they only update their own item
    const { restaurant, ...updateData } = req.body; // prevent re-assigning restaurant
    const menuItem = await MenuItem.findOneAndUpdate(
      { _id: itemId, restaurant: validRestaurantId },
      updateData,
      { returnDocument: 'after' }
    );

    if (!menuItem) return errorResponse(res, 'Menu item not found in your restaurant', 404);

    return successResponse(res, 'Menu item updated successfully', menuItem);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found for this owner', 404);

    const menuItem = await MenuItem.findOne({ _id: itemId, restaurant: validRestaurantId });
    if (!menuItem) return errorResponse(res, 'Menu item not found in your restaurant', 404);

    // Soft delete vs Hard delete logic based on past orders
    let isInPastOrder = false;
    try {
      if (Order && Order.exists) {
        const orderExists = await Order.exists({ 'items.menuItem': itemId });
        isInPastOrder = !!orderExists;
      }
    } catch(e) {}

    if (isInPastOrder) {
      // Soft delete
      menuItem.isAvailable = false;
      await menuItem.save();
      return successResponse(res, 'Menu item soft-deleted (marked unavailable) because it appears in past orders');
    } else {
      // Hard delete
      await MenuItem.deleteOne({ _id: itemId });
      return successResponse(res, 'Menu item hard-deleted successfully');
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.toggleMenuItemAvailability = async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found for this owner', 404);

    const menuItem = await MenuItem.findOne({ _id: itemId, restaurant: validRestaurantId });
    if (!menuItem) return errorResponse(res, 'Menu item not found in your restaurant', 404);

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();

    return successResponse(res, `Menu item is now ${menuItem.isAvailable ? 'available' : 'unavailable'}`, menuItem);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ========================
// ORDER MANAGEMENT
// ========================

exports.getOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const orders = await Order.find({ restaurant: validRestaurantId })
      .populate('user', 'name phone')
      .populate('items.menuItem', 'name')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Orders fetched successfully', orders);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const { restaurantId, id } = req.params;
    const { preparationTime } = req.body;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const order = await Order.findOne({ _id: id, restaurant: validRestaurantId });
    if (!order) return errorResponse(res, 'Order not found', 404);

    if (order.status !== 'placed') {
      return errorResponse(res, `Cannot accept order from status ${order.status}`, 400);
    }
    if (order.paymentStatus === 'failed') {
      return errorResponse(res, 'Cannot accept order with failed payment', 400);
    }

    order.status = 'accepted';
    order.acceptedAt = new Date();
    if (preparationTime) {
      order.preparationTime = preparationTime;
    }
    await order.save();

    const io = getIO();
    io.to(order.user.toString()).emit('order_update', { orderId: order._id, status: order.status, message: 'Your order was accepted by the restaurant' });
    await Notification.create({ user: order.user, title: 'Order Accepted', message: 'Your order was accepted by the restaurant', type: 'order_update' });

    return successResponse(res, 'Order accepted', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.rejectOrder = async (req, res) => {
  try {
    const { restaurantId, id } = req.params;
    const { reason } = req.body;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const order = await Order.findOne({ _id: id, restaurant: validRestaurantId });
    if (!order) return errorResponse(res, 'Order not found', 404);

    if (order.status !== 'placed') {
      return errorResponse(res, `Cannot reject order from status ${order.status}`, 400);
    }

    order.status = 'rejected';
    order.rejectedReason = reason || 'No reason provided';
    
    // Mock refund
    if (order.paymentStatus === 'success') {
      await Payment.findOneAndUpdate({ order: order._id }, { status: 'failed' });
      order.paymentStatus = 'failed';
    }
    
    await order.save();

    const io = getIO();
    io.to(order.user.toString()).emit('order_update', { orderId: order._id, status: order.status, message: `Your order was rejected: ${order.rejectedReason}` });
    await Notification.create({ user: order.user, title: 'Order Rejected', message: `Your order was rejected: ${order.rejectedReason}`, type: 'order_update' });

    return successResponse(res, 'Order rejected', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.prepareOrder = async (req, res) => {
  try {
    const { restaurantId, id } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    const order = await Order.findOne({ _id: id, restaurant: validRestaurantId });
    if (!order || order.status !== 'accepted') return errorResponse(res, 'Order not in accepted state', 400);

    order.status = 'preparing';
    await order.save();
    getIO().to(order.user.toString()).emit('order_update', { orderId: order._id, status: order.status, message: 'Your order is being prepared' });

    return successResponse(res, 'Order marked as preparing', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.readyOrder = async (req, res) => {
  try {
    const { restaurantId, id } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    const order = await Order.findOne({ _id: id, restaurant: validRestaurantId });
    if (!order || order.status !== 'preparing') return errorResponse(res, 'Order not in preparing state', 400);

    order.status = 'ready_for_pickup';
    order.readyAt = new Date();
    await order.save();
    
    getIO().to(order.user.toString()).emit('order_update', { orderId: order._id, status: order.status, message: 'Your order is ready for pickup' });

    // Trigger auto-assignment asynchronously
    autoAssignOrder(order._id).catch(err => console.error('[AutoAssign Error]', err));

    return successResponse(res, 'Order marked as ready for pickup. Auto-assigning nearest driver...', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};


// ========================
// DASHBOARD
// ========================

exports.getDashboardStats = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const restaurant = await Restaurant.findById(validRestaurantId);
    const customerRating = restaurant ? restaurant.rating : 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaysOrders = await Order.countDocuments({
      restaurant: validRestaurantId,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: 'cancelled' }
    });

    const totalOrders = await Order.countDocuments({ restaurant: validRestaurantId, status: { $ne: 'cancelled' } });
    const cancelledOrders = await Order.countDocuments({ restaurant: validRestaurantId, status: 'cancelled' });
    const activeOrders = await Order.countDocuments({
      restaurant: validRestaurantId,
      status: { $in: ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery'] }
    });

    const revenueAggregation = await Order.aggregate([
      { $match: { restaurant: validRestaurantId, status: 'delivered' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalCommissionDeducted: { $sum: '$vendorCommission' } } }
    ]);
    const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;
    const totalCommissionDeducted = revenueAggregation.length > 0 ? revenueAggregation[0].totalCommissionDeducted : 0;

    const VendorSettlement = require('../models/VendorSettlement');
    const pendingSettlements = await VendorSettlement.aggregate([
      { $match: { restaurant: validRestaurantId, status: 'pending' } },
      { $group: { _id: null, pendingAmount: { $sum: '$netPayable' } } }
    ]);
    const pendingSettlementAmount = pendingSettlements.length > 0 ? pendingSettlements[0].pendingAmount : 0;

    const topItemsAggregation = await Order.aggregate([
      { $match: { restaurant: validRestaurantId, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.menuItem', totalQuantity: { $sum: '$items.quantity' } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItemDetails'
        }
      },
      { $unwind: '$menuItemDetails' },
      {
        $project: {
          _id: 1,
          totalQuantity: 1,
          name: '$menuItemDetails.name',
          image: '$menuItemDetails.image',
          price: '$menuItemDetails.price'
        }
      }
    ]);

    return successResponse(res, 'Dashboard stats fetched', {
      todaysOrders,
      totalOrders,
      totalRevenue,
      totalCommissionDeducted,
      pendingSettlementAmount,
      customerRating,
      activeOrders,
      cancelledOrders,
      topItems: topItemsAggregation
    });

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ========================
// PHASE 3 FEATURES
// ========================

exports.getTables = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const tables = await Table.find({ restaurant: restaurantId });
    return successResponse(res, 'Tables retrieved', tables);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createTable = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { tableNumber, capacity } = req.body;
    const table = new Table({
      restaurant: restaurantId,
      tableNumber,
      capacity,
    });
    await table.save();
    return successResponse(res, 'Table created', table, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getTableQr = async (req, res) => {
  try {
    const { tableId } = req.params;
    // Mock QR return
    return successResponse(res, 'QR Code Generated', { qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=table_${tableId}` });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getReviews = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const reviews = await Review.find({ restaurant: restaurantId });
    return successResponse(res, 'Reviews retrieved', reviews);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getAdvertisements = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const ads = await Advertisement.find({ restaurant: restaurantId });
    return successResponse(res, 'Advertisements retrieved', ads);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const coupons = await VendorCoupon.find({ restaurant: restaurantId });
    return successResponse(res, 'Coupons retrieved', coupons);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const data = { ...req.body, restaurant: restaurantId };
    const coupon = new VendorCoupon(data);
    await coupon.save();
    return successResponse(res, 'Coupon created', coupon, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const coupon = await VendorCoupon.findByIdAndUpdate(couponId, req.body, { new: true });
    return successResponse(res, 'Coupon updated', coupon);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    await VendorCoupon.findByIdAndDelete(couponId);
    return successResponse(res, 'Coupon deleted');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getSettlements = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const settlements = await VendorSettlement.find({ restaurant: restaurantId });
    return successResponse(res, 'Settlements retrieved', settlements);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.generateSettlement = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    // mock generate
    const settlement = new VendorSettlement({
      restaurant: restaurantId,
      amount: 1500,
      netPayable: 1400,
      status: 'pending',
      periodStart: new Date(),
      periodEnd: new Date()
    });
    await settlement.save();
    return successResponse(res, 'Settlement generated', settlement, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const { getIO } = require('../utils/socket');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ========================
// RESTAURANT MANAGEMENT
// ========================

exports.createRestaurant = async (req, res) => {
  try {
    const existingRestaurant = await Restaurant.findOne({ owner: req.user._id });
    if (existingRestaurant) {
      return errorResponse(res, 'You already have a restaurant registered', 409);
    }

    // Overwrite the owner just in case
    const restaurantData = { ...req.body, owner: req.user._id, isApproved: false };
    const restaurant = await Restaurant.create(restaurantData);

    return successResponse(res, 'Restaurant created successfully. Pending admin approval.', restaurant, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getOwnRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id }).populate('categories', 'name icon');
    if (!restaurant) {
      return errorResponse(res, 'No restaurant found for this owner', 404);
    }
    return successResponse(res, 'Restaurant details fetched', restaurant);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateRestaurant = async (req, res) => {
  try {
    // Prevent overriding restricted fields
    const { owner, isApproved, isActive, rating, reviewCount, ...updateData } = req.body;
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { owner: req.user._id },
      updateData,
      { returnDocument: 'after' }
    );

    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    return successResponse(res, 'Restaurant updated successfully', restaurant);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.toggleActiveStatus = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();

    return successResponse(res, `Restaurant is now ${restaurant.isActive ? 'active' : 'paused'}`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ========================
// MENU MANAGEMENT
// ========================

// Helper to verify item belongs to owner's restaurant
const getOwnerRestaurantId = async (ownerId) => {
  const restaurant = await Restaurant.findOne({ owner: ownerId });
  return restaurant ? restaurant._id : null;
};

exports.createMenuItem = async (req, res) => {
  try {
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return errorResponse(res, 'Restaurant not found for this owner', 404);

    const menuItemData = { ...req.body, restaurant: restaurantId };
    const menuItem = await MenuItem.create(menuItemData);

    return successResponse(res, 'Menu item created successfully', menuItem, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getMenu = async (req, res) => {
  try {
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return errorResponse(res, 'Restaurant not found for this owner', 404);

    const menu = await MenuItem.find({ restaurant: restaurantId });
    return successResponse(res, 'Menu fetched successfully', menu);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return errorResponse(res, 'Restaurant not found for this owner', 404);

    // Ensure they only update their own item
    const { restaurant, ...updateData } = req.body; // prevent re-assigning restaurant
    const menuItem = await MenuItem.findOneAndUpdate(
      { _id: itemId, restaurant: restaurantId },
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
    const { itemId } = req.params;
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return errorResponse(res, 'Restaurant not found for this owner', 404);

    const menuItem = await MenuItem.findOne({ _id: itemId, restaurant: restaurantId });
    if (!menuItem) return errorResponse(res, 'Menu item not found in your restaurant', 404);

    // Soft delete vs Hard delete logic based on past orders
    // Since Order model isn't fully integrated yet, we will wrap in try/catch or just mock
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
    const { itemId } = req.params;
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return errorResponse(res, 'Restaurant not found for this owner', 404);

    const menuItem = await MenuItem.findOne({ _id: itemId, restaurant: restaurantId });
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
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const orders = await Order.find({ restaurant: restaurantId })
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
    const { id } = req.params;
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const order = await Order.findOne({ _id: id, restaurant: restaurantId });
    if (!order) return errorResponse(res, 'Order not found', 404);

    if (order.status !== 'placed') {
      return errorResponse(res, `Cannot accept order from status ${order.status}`, 400);
    }
    if (order.paymentStatus === 'failed') {
      return errorResponse(res, 'Cannot accept order with failed payment', 400);
    }

    order.status = 'accepted';
    order.acceptedAt = new Date();
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
    const { id } = req.params;
    const { reason } = req.body;
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const order = await Order.findOne({ _id: id, restaurant: restaurantId });
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
    const { id } = req.params;
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    const order = await Order.findOne({ _id: id, restaurant: restaurantId });
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
    const { id } = req.params;
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    const order = await Order.findOne({ _id: id, restaurant: restaurantId });
    if (!order || order.status !== 'preparing') return errorResponse(res, 'Order not in preparing state', 400);

    order.status = 'ready_for_pickup';
    order.readyAt = new Date();
    await order.save();
    
    getIO().to(order.user.toString()).emit('order_update', { orderId: order._id, status: order.status, message: 'Your order is ready for pickup' });

    return successResponse(res, 'Order marked as ready for pickup', order);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};


// ========================
// DASHBOARD
// ========================

exports.getDashboardStats = async (req, res) => {
  try {
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const totalOrders = await Order.countDocuments({ restaurant: restaurantId, status: { $ne: 'cancelled' } });
    const cancelledOrders = await Order.countDocuments({ restaurant: restaurantId, status: 'cancelled' });
    const activeOrders = await Order.countDocuments({
      restaurant: restaurantId,
      status: { $in: ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery'] }
    });

    const revenueAggregation = await Order.aggregate([
      { $match: { restaurant: restaurantId, status: 'delivered' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

    const topItemsAggregation = await Order.aggregate([
      { $match: { restaurant: restaurantId, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.menuItem', totalQuantity: { $sum: '$items.quantity' } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'menuitems', // exact collection name might vary depending on mongoose (usually lowercased + s)
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
      totalOrders,
      totalRevenue,
      activeOrders,
      cancelledOrders,
      topItems: topItemsAggregation
    });

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

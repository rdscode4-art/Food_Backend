const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const Order = require('../models/Order'); // Will be added in Step 8, but we can import/mock
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getPendingRestaurantOwners = async (req, res) => {
  try {
    const pendingOwners = await User.find({ role: 'restaurant_owner', isApproved: false }).select('-password');
    return successResponse(res, 'Pending restaurant owners fetched', pendingOwners);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.approveRestaurantOwner = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'restaurant_owner' },
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
    // Optionally we can delete or just leave them unapproved/suspended
    const user = await User.findOneAndDelete({ _id: req.params.id, role: 'restaurant_owner' });
    if (!user) return errorResponse(res, 'Restaurant owner not found', 404);
    return successResponse(res, 'Restaurant owner rejected and removed');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getPendingDeliveryPartners = async (req, res) => {
  try {
    const pendingPartners = await User.find({ role: 'delivery_partner', isApproved: false }).select('-password');
    return successResponse(res, 'Pending delivery partners fetched', pendingPartners);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.approveDeliveryPartner = async (req, res) => {
  try {
    const partner = await User.findOne({ _id: req.params.id, role: 'delivery_partner' });
    if (!partner) return errorResponse(res, 'Delivery partner not found', 404);

    if (!partner.partnerDocuments || partner.partnerDocuments.length === 0) {
      return errorResponse(res, 'Cannot approve delivery partner without partner documents', 400);
    }

    partner.isApproved = true;
    await partner.save();
    
    return successResponse(res, 'Delivery partner approved', partner);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.rejectDeliveryPartner = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, role: 'delivery_partner' });
    if (!user) return errorResponse(res, 'Delivery partner not found', 404);
    return successResponse(res, 'Delivery partner rejected and removed');
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
    // We will query the Order model later when it is built
    let orders = [];
    try {
      // Mocking for now, or use real Order if model exists
      // const Order = require('../models/Order');
      // orders = await Order.find({ restaurant: req.params.id });
    } catch(e) {
      // Ignore if Order isn't defined yet
    }
    return successResponse(res, 'Orders fetched (mocked for now)', orders);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: true }, { returnDocument: 'after' }).select('-password');
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, 'User suspended', user);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.unsuspendUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: false }, { returnDocument: 'after' }).select('-password');
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, 'User unsuspended', user);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getStats = async (req, res) => {
  try {
    const activeRestaurants = await Restaurant.countDocuments({ isApproved: true, isActive: true });
    const activeCustomers = await User.countDocuments({ role: 'customer', isSuspended: false });
    const activeDeliveryPartners = await User.countDocuments({ role: 'delivery_partner', isApproved: true, isSuspended: false });
    
    const pendingOwners = await User.countDocuments({ role: 'restaurant_owner', isApproved: false });
    const pendingPartners = await User.countDocuments({ role: 'delivery_partner', isApproved: false });
    const pendingRestaurants = await Restaurant.countDocuments({ isApproved: false });

    const totalOrders = await Order.countDocuments();
    
    const revenueAggregation = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalGMV = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;
    
    const activePartners = await User.countDocuments({ role: 'delivery_partner', isAvailable: true });

    return successResponse(res, 'Stats fetched', {
      totalOrders,
      totalGMV,
      totalRevenue: totalGMV, // added for compatibility
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

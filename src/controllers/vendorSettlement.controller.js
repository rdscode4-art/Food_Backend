const VendorSettlement = require('../models/VendorSettlement');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const verifyOwnerRestaurant = async (ownerId, restaurantId) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, owner: ownerId });
  return restaurant ? restaurant._id : null;
};

exports.getSettlements = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const validRestaurantId = await verifyOwnerRestaurant(req.user._id, restaurantId);
    if (!validRestaurantId) return errorResponse(res, 'Restaurant not found', 404);

    const settlements = await VendorSettlement.find({ restaurant: validRestaurantId }).sort({ createdAt: -1 });
    return successResponse(res, 'Settlements fetched', settlements);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.generateSettlement = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    // Find unsettled delivered orders for this restaurant
    const unsettledOrders = await Order.find({
      restaurant: restaurantId,
      status: 'delivered',
      settlementId: null
    }).sort({ deliveredAt: 1 });

    if (unsettledOrders.length === 0) {
      return errorResponse(res, 'No unsettled delivered orders found for this restaurant', 400);
    }

    let totalSales = 0;
    let platformCommission = 0;

    for (const order of unsettledOrders) {
      totalSales += order.totalAmount;
      platformCommission += order.vendorCommission || 0;
    }

    const netPayable = totalSales - platformCommission;

    const newSettlement = await VendorSettlement.create({
      restaurant: restaurantId,
      periodStart: unsettledOrders[0].deliveredAt || unsettledOrders[0].createdAt,
      periodEnd: unsettledOrders[unsettledOrders.length - 1].deliveredAt || unsettledOrders[unsettledOrders.length - 1].createdAt,
      totalSales,
      platformCommission,
      netPayable,
      status: 'pending'
    });

    // Update all these orders with the new settlementId
    const orderIds = unsettledOrders.map(o => o._id);
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { settlementId: newSettlement._id } }
    );

    return successResponse(res, 'Settlement generated successfully', newSettlement, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

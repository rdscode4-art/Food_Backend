const User = require('../models/User');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const { getIO } = require('./socket');

const MAX_RADIUS_METERS = 5000; // Search within 5km

const autoAssignOrder = async (orderId, excludeDriverIds = []) => {
  try {
    const order = await Order.findById(orderId).populate('restaurant');
    if (!order) return false;

    // Only auto-assign if order is ready for pickup and not already assigned
    if (order.status !== 'ready_for_pickup' || (order.deliveryPartner && order.deliveryPartner.user)) {
      return false;
    }

    const restaurantCoords = order.restaurant.location.coordinates;

    // Build vehicle type match logic
    // If order needs a car, only assign car/van. If bike, any is fine.
    let vehicleMatch = {};
    if (order.requiredVehicleType === 'car') {
      vehicleMatch = { vehicleType: { $in: ['car', 'van'] } };
    }

    // Find nearest online delivery partners
    const nearbyDrivers = await User.find({
      role: 'delivery_partner',
      isOnline: true,
      ...vehicleMatch,
      _id: { $nin: excludeDriverIds }, // Exclude drivers who rejected this order
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: restaurantCoords,
          },
          $maxDistance: MAX_RADIUS_METERS,
        },
      },
    });

    if (!nearbyDrivers || nearbyDrivers.length === 0) {
      console.log(`[AutoAssign] No nearby available drivers found for Order ${orderId}`);
      return false;
    }

    // Sort drivers by rating descending (highest rating first)
    nearbyDrivers.sort((a, b) => {
      const ratingA = a.driverRating || 0;
      const ratingB = b.driverRating || 0;
      return ratingB - ratingA;
    });

    // Filter out drivers who already have an active order
    let assignedDriver = null;
    for (const driver of nearbyDrivers) {
      const hasActiveOrder = await Order.exists({
        'deliveryPartner.user': driver._id,
        status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] },
      });

      if (!hasActiveOrder) {
        assignedDriver = driver;
        break; // Take the first (closest) available driver
      }
    }

    if (!assignedDriver) {
      console.log(`[AutoAssign] Nearby drivers found but all are busy for Order ${orderId}`);
      return false;
    }

    // Assign order to this driver
    const fee = order.restaurant.deliveryFee || 0; // Or whatever is calculated in checkout
    
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: 'ready_for_pickup' }, // concurrency check
      {
        deliveryPartner: {
          user: assignedDriver._id,
          name: assignedDriver.name,
          phone: assignedDriver.phone,
          currentLocation: assignedDriver.currentLocation,
        },
        deliveryFeeEarned: order.deliveryFee, // Use calculated delivery fee instead of restaurant default
        status: 'assigned',
        assignedAt: new Date(),
      },
      { returnDocument: 'after' }
    ).populate('user', 'name');

    if (!updatedOrder) return false; // Was picked up manually or changed state

    console.log(`[AutoAssign] Order ${orderId} automatically assigned to Driver ${assignedDriver.name}`);

    // Notify Driver
    const io = getIO();
    io.to(assignedDriver._id.toString()).emit('order_update', {
      orderId: updatedOrder._id,
      status: updatedOrder.status,
      message: 'New Delivery Assigned!',
    });

    // Notify Customer
    io.to(updatedOrder.user._id.toString()).emit('order_update', {
      orderId: updatedOrder._id,
      status: updatedOrder.status,
      message: 'A delivery partner has been assigned to your order.',
    });

    await Notification.create({
      user: updatedOrder.user._id,
      title: 'Order Update',
      message: 'A delivery partner has been assigned to your order.',
      type: 'order_update',
    });

    // Notify Restaurant
    io.to(`restaurant_${updatedOrder.restaurant._id}`).emit('order_update', {
      orderId: updatedOrder._id,
      status: updatedOrder.status,
      message: 'A delivery partner has been auto-assigned.',
    });

    return true;
  } catch (error) {
    console.error(`[AutoAssign] Error assigning order ${orderId}:`, error);
    return false;
  }
};

module.exports = { autoAssignOrder };

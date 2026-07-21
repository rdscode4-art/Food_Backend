const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.mockCharge = async (req, res) => {
  try {
    const { orderId, method, forceStatus } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return errorResponse(res, 'Order not found', 404);

    if (order.status !== 'placed') {
      return errorResponse(res, 'Payment can only be processed when order is placed', 400);
    }

    let finalStatus = 'pending';
    if (method === 'cod') {
      finalStatus = 'pending';
    } else {
      if (forceStatus && ['success', 'failed'].includes(forceStatus)) {
        finalStatus = forceStatus;
      } else {
        // 90% success rate
        finalStatus = Math.random() < 0.9 ? 'success' : 'failed';
      }
    }

    const mockTransactionId = `MOCKTXN_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const payment = await Payment.create({
      order: order._id,
      user: req.user._id,
      amount: order.totalAmount,
      method,
      status: finalStatus,
      mockTransactionId
    });

    order.paymentStatus = finalStatus;
    // Note: If failed, status remains 'placed' but restaurants will ignore it because paymentStatus != 'success' (except cod)
    await order.save();

    return successResponse(res, `Payment processed: ${finalStatus}`, payment);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

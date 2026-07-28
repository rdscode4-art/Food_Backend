const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      enum: ['card', 'upi', 'cod'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    transactionId: {
      type: String,
      description: 'Official transaction ID from the gateway',
    },
    gateway: {
      type: String,
      enum: ['razorpay', 'stripe', 'cashfree', 'wallet', 'cod'],
      required: true,
      default: 'cod',
    },
    refundStatus: {
      type: String,
      enum: ['none', 'partial', 'full', 'failed'],
      default: 'none',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);

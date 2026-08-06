const mongoose = require('mongoose');

const refundRequestSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    initiator: {
      type: String,
      enum: ['Customer', 'Vendor', 'Driver', 'Admin'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RefundRequest', refundRequestSchema);

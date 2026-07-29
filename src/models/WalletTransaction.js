const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    userModel: { type: String, required: true, enum: ['Consumer', 'Vendor', 'DeliveryPartner', 'Admin'] },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      // e.g. 'add_money', 'order_payment', 'refund', 'cashback', 'referral'
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'success',
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);

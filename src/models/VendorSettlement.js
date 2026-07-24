const mongoose = require('mongoose');

const vendorSettlementSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    totalSales: {
      type: Number,
      required: true,
      default: 0,
    },
    platformCommission: {
      type: Number,
      required: true,
      default: 0,
    },
    taxDeduction: {
      type: Number,
      default: 0,
    },
    netPayable: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    payoutDate: {
      type: Date,
    },
    transactionReference: {
      type: String, // e.g., bank transaction ID once paid
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VendorSettlement', vendorSettlementSchema);

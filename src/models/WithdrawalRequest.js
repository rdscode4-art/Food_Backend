const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    bankDetails: {
      accountNumber: String,
      ifsc: String,
      bankName: String,
    },
    processedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

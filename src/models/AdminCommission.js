const mongoose = require('mongoose');

const adminCommissionSchema = new mongoose.Schema(
  {
    commissionType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    commissionValue: {
      type: Number,
      required: true,
      default: 10, // e.g. 10% or ₹10
    },
    // Optional extensions for future
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminCommission', adminCommissionSchema);

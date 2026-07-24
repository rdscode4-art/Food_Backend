const mongoose = require('mongoose');

const vendorCouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat', 'free_delivery', 'bogo'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true, // percentage (e.g., 20) or flat amount (e.g., 100)
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number, // Applicable if discountType is 'percentage'
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number, // Max times this coupon can be used across all users
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VendorCoupon', vendorCouponSchema);

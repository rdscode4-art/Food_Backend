const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['flat', 'percentage'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number, // Applicable only if discountType is 'percentage'
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicableRestaurants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
      },
    ], // if empty, applies to all restaurants
    isFirstOrderOnly: {
      type: Boolean,
      default: false,
    },
    isFreeDelivery: {
      type: Boolean,
      default: false,
    },
    applicableZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);

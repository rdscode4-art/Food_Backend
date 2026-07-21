const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ['customer', 'restaurant_owner', 'delivery_partner', 'admin'],
      default: 'customer',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: true, // customer defaults true; others default false in controller
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    // restaurant_owner-only
    businessName: {
      type: String,
    },
    businessDocuments: {
      type: [String],
    },
    // delivery_partner-only
    vehicleType: {
      type: String,
      enum: ['bike', 'scooter', 'bicycle', 'car'],
    },
    vehicleNumber: {
      type: String,
    },
    licenseNumber: {
      type: String,
    },
    partnerDocuments: {
      type: [String],
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    rating: {
      type: Number,
      default: 5,
    },
  },
  { timestamps: true }
);

// 2dsphere index for location queries
userSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('User', userSchema);

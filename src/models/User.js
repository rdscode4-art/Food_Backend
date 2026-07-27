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
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
    },
    adminRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
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
    walletBalance: {
      type: Number,
      default: 0,
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    currentMembership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
    },
    membershipExpiry: {
      type: Date,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true, // sparse because some users might not have it initially
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    dob: {
      type: Date,
    },
    recentSearches: {
      type: [String],
      default: [],
    },
    activeSessions: {
      type: [String], // Array of refresh tokens or device IDs to track logins
      default: [],
    },
    // Shared business/KYC fields
    panNumber: {
      type: String,
    },
    bankDetails: {
      accountNumber: String,
      ifsc: String,
      bankName: String,
    },
    // restaurant_owner-only
    businessName: {
      type: String,
    },
    businessDocuments: {
      type: [String],
    },
    fssai: {
      type: String,
    },
    gst: {
      type: String,
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
    aadhaarNumber: {
      type: String,
    },
    driverRating: {
      type: Number,
      default: 5.0,
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

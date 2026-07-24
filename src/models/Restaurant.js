const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brandName: {
      type: String, // For multi-branch grouping
      trim: true,
    },
    coverImage: {
      type: String,
    },
    gallery: {
      type: [String],
      default: [],
    },
    logo: {
      type: String,
    },
    cuisine: {
      type: [String],
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    rating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    deliveryTime: {
      type: Number, // in minutes (e.g., 30)
      default: 30,
    },
    deliveryFee: {
      type: Number, // in ₹
      default: 0,
    },
    minOrder: {
      type: Number, // in ₹
      default: 0,
    },
    address: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    phone: {
      type: String,
    },
    aboutUs: {
      type: String,
    },
    fssaiNumber: {
      type: String,
    },
    openingTime: {
      type: String, // e.g., '09:00'
    },
    closingTime: {
      type: String, // e.g., '22:00'
    },
    isSponsored: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Open', 'Closed', 'Busy', 'Temporarily Closed', 'Vacation Mode'],
      default: 'Closed',
    },
    // KYC & Documents
    gstNumber: {
      type: String,
    },
    panNumber: {
      type: String,
    },
    aadhaarNumber: {
      type: String,
    },
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      accountHolderName: String,
    },
    cancelledChequeImage: {
      type: String,
    },
    licenseImage: {
      type: String,
    },
  },
  { timestamps: true }
);

// 2dsphere index for location-based queries
restaurantSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Restaurant', restaurantSchema);

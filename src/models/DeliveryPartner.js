const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    avatar: { type: String },
    role: { type: String, default: 'delivery_partner' },
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    activeSessions: { type: [String], default: [] },
    
    // Partner specific
    isApproved: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0 },
    panNumber: { type: String },
    bankDetails: {
      accountNumber: String,
      ifsc: String,
      bankName: String,
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'scooter', 'bicycle', 'car'],
    },
    vehicleNumber: { type: String },
    licenseNumber: { type: String },
    partnerDocuments: { type: [String] },
    aadhaarNumber: { type: String },
    driverRating: { type: Number, default: 5.0 },
    isOnline: { type: Boolean, default: false },
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
  },
  { timestamps: true }
);

deliveryPartnerSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    avatar: { type: String },
    role: { type: String, default: 'restaurant_owner' },
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    activeSessions: { type: [String], default: [] },
    
    // Vendor specific
    isApproved: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0 },
    panNumber: { type: String },
    bankDetails: {
      accountNumber: String,
      ifsc: String,
      bankName: String,
    },
    businessName: { type: String },
    businessDocuments: { type: [String] },
    fssai: { type: String },
    gst: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vendor', vendorSchema);

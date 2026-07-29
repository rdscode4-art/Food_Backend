const mongoose = require('mongoose');

const consumerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    avatar: { type: String },
    role: { type: String, default: 'customer' }, // hardcoded role
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    activeSessions: { type: [String], default: [] },
    
    // Consumer specific
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    walletBalance: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    currentMembership: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan' },
    membershipExpiry: { type: Date },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumer' }, // note: now refs Consumer
    dob: { type: Date },
    recentSearches: { type: [String], default: [] },
    rating: { type: Number, default: 5 }, // average rating from restaurants/drivers
  },
  { timestamps: true }
);

module.exports = mongoose.model('Consumer', consumerSchema);

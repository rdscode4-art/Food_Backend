const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['signup', 'reset_password'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // OTP expires after 10 minutes (600 seconds)
  },
});

// Compound index to help with rate limiting and verifying
otpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model('Otp', otpSchema);

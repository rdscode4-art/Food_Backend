const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    avatar: { type: String },
    role: { type: String, default: 'admin' },
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    activeSessions: { type: [String], default: [] },
    
    // Admin specific
    adminRole: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);

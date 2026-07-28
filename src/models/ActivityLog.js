const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      description: 'The admin user who performed the action',
    },
    action: {
      type: String,
      required: true,
      description: 'e.g., APPROVED_VENDOR, SUSPENDED_DRIVER, UPDATED_DELIVERY_CONFIG',
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      description: 'ID of the affected entity (e.g., User ID, Order ID)',
    },
    targetModel: {
      type: String,
      description: 'Model of the affected entity (e.g., User, Order, Restaurant)',
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    deviceMetadata: {
      type: Map,
      of: String,
      description: 'Platform, OS, browser info for Device Management',
    },
    details: {
      type: String,
      description: 'Any additional JSON details or human-readable explanation',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);

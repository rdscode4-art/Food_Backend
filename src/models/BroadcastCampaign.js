const mongoose = require('mongoose');

const broadcastCampaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetAudience: { 
      type: String, 
      enum: ['all', 'customers', 'vendors', 'drivers', 'specific_users'], 
      required: true 
    },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    channels: {
      type: [String],
      enum: ['push', 'sms', 'email', 'in_app'],
      default: ['in_app']
    },
    sentAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BroadcastCampaign', broadcastCampaignSchema);

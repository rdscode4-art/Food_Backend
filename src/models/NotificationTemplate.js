const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      description: 'e.g., ORDER_ACCEPTED, DRIVER_ASSIGNED',
    },
    channel: {
      type: String,
      enum: ['push', 'sms', 'email', 'whatsapp'],
      required: true,
    },
    titleTemplate: {
      type: String,
      description: 'Title for Push/Email, e.g., "Order {{orderId}} Accepted!"',
    },
    bodyTemplate: {
      type: String,
      required: true,
      description: 'Body with variables like {{userName}}, {{restaurantName}}',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);

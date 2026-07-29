const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userModel: { type: String, required: true, enum: ['Consumer', 'Vendor', 'DeliveryPartner', 'Admin'] },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['order_update', 'promo', 'general'],
      default: 'general',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);

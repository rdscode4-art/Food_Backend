const mongoose = require('mongoose');

const refundRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      description: 'e.g., Cancelled before acceptance, Cancelled by driver',
    },
    triggerStatus: {
      type: String,
      enum: ['placed', 'accepted', 'preparing', 'ready', 'picked_up'],
      required: true,
      description: 'The order status at which this rule applies upon cancellation',
    },
    initiatorRole: {
      type: String,
      enum: ['customer', 'restaurant_owner', 'delivery_partner', 'admin'],
      required: true,
      description: 'Who initiated the cancellation',
    },
    refundPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      description: 'Percentage of the totalAmount to be refunded (0 to 100)',
    },
    refundDestination: {
      type: String,
      enum: ['original_payment_method', 'wallet', 'none'],
      default: 'original_payment_method',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RefundRule', refundRuleSchema);

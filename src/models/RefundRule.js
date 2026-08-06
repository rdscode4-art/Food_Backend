const mongoose = require('mongoose');

const refundRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      description: 'e.g., Cancelled before acceptance, Cancelled by driver',
    },
    condition: {
      type: String,
      required: true,
      description: 'e.g. Order cancelled by driver after pickup',
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

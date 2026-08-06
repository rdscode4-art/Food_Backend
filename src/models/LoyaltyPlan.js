const mongoose = require('mongoose');
const loyaltyPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  duration: { type: String },
  price: { type: Number, default: 0 },
  benefits: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('LoyaltyPlan', loyaltyPlanSchema);

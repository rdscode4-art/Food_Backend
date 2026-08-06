const mongoose = require('mongoose');
const surgeRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  multiplier: { type: Number, required: true, default: 1.5 },
  condition: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('SurgeRule', surgeRuleSchema);

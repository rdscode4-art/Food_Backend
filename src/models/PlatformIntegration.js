const mongoose = require('mongoose');
const platformIntegrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  providerCode: { type: String, required: true, unique: true },
  description: { type: String },
  active: { type: Boolean, default: false },
  apiKey: { type: String, default: '' },
  webhookUrl: { type: String, default: '' },
  color: { type: String, default: '#6366f1' },
}, { timestamps: true });
module.exports = mongoose.model('PlatformIntegration', platformIntegrationSchema);

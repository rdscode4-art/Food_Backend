const mongoose = require('mongoose');
const platformSettingsSchema = new mongoose.Schema({
  platformName: { type: String, default: 'Rideal Food' },
  supportEmail: { type: String, default: 'support@rideal.com' },
  commissionRate: { type: Number, default: 15 },
  driverCommission: { type: String, default: '5%' },
  taxRate: { type: Number, default: 18 },
  referrerBonus: { type: Number, default: 50 },
  refereeBonus: { type: Number, default: 100 },
  maxReferrals: { type: Number, default: 10 },
  minOrderForReferral: { type: Number, default: 200 },
}, { timestamps: true });
module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);

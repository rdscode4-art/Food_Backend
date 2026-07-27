const mongoose = require('mongoose');

const driverIncentiveConfigSchema = new mongoose.Schema(
  {
    dailyTargetOrders: { type: Number, default: 10 },
    dailyTargetBonus: { type: Number, default: 100 }, // Amount to give when target reached
    weeklyTargetOrders: { type: Number, default: 50 },
    weeklyTargetBonus: { type: Number, default: 500 },
    festivalBonus: { type: Number, default: 50 }, // Extra amount per order during festivals
    peakHourBonus: { type: Number, default: 20 }, // Extra amount per order during peak hours
    rainBonus: { type: Number, default: 15 }, // Extra amount per order during rain
    distanceThresholdKm: { type: Number, default: 5 }, // Orders longer than this get bonus
    distanceBonus: { type: Number, default: 10 }, // Extra amount for long distance orders
    orderIncentive: { type: Number, default: 0 }, // Flat bonus per order
  },
  { timestamps: true }
);

module.exports = mongoose.model('DriverIncentiveConfig', driverIncentiveConfigSchema);

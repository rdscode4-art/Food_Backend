const mongoose = require('mongoose');

const adminDeliveryConfigSchema = new mongoose.Schema(
  {
    baseFee: { type: Number, default: 20 },
    perKmCharge: { type: Number, default: 5 },
    minDeliveryFee: { type: Number, default: 30 },
    freeDeliveryThreshold: { type: Number, default: 500 },
    peakHourFee: { type: Number, default: 20 },
    rainFee: { type: Number, default: 15 },
    nightFee: { type: Number, default: 25 },
    surgeMultiplier: { type: Number, default: 1.0 },
    smallOrderThreshold: { type: Number, default: 150 },
    smallOrderFee: { type: Number, default: 10 },
    longDistanceThreshold: { type: Number, default: 10 }, // in km
    longDistanceFee: { type: Number, default: 20 },
    driverCommissionRate: { type: Number, default: 0 }, // % admin takes from driver delivery fee
    // A flag to quickly enable/disable peak/rain globally
    isPeakHour: { type: Boolean, default: false },
    isRaining: { type: Boolean, default: false },
    isNightTime: { type: Boolean, default: false },
    isFestival: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminDeliveryConfig', adminDeliveryConfigSchema);

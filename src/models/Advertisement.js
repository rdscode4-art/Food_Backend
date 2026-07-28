const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    adType: {
      type: String,
      enum: ['banner', 'featured', 'search', 'category', 'homepage'],
      required: true,
    },
    budget: {
      type: Number,
      required: true,
      description: 'Total budget allocated for this campaign',
    },
    amountSpent: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'paused', 'completed', 'cancelled'],
      default: 'pending',
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      description: 'Geofence the advertisement to a specific city/zone',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Advertisement', advertisementSchema);

const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true, // e.g., 'Delhi NCR'
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Center point and radius (in km) for simple boundary definition
    centerLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    radius: {
      type: Number, // in kilometers
      default: 10,
    },
    baseDeliveryFee: {
      type: Number,
      default: 30, // Default base fee for this zone
    }
  },
  { timestamps: true }
);

// Index for geospatial queries if needed
zoneSchema.index({ centerLocation: '2dsphere' });

module.exports = mongoose.model('Zone', zoneSchema);

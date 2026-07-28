const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    tableNumber: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      default: 2,
    },
    qrCodeUrl: {
      type: String,
      description: 'URL to the generated QR code for ordering from this table',
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'maintenance'],
      default: 'available',
    },
    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      description: 'Active order tied to this table if occupied',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Table', tableSchema);

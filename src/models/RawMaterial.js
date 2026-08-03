const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true }, // e.g., 'kg', 'liters', 'pieces'
    stockCount: { type: Number, required: true, default: 0 },
    reorderLevel: { type: Number, required: true, default: 10 },
    supplier: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);

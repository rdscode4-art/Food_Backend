const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true, // e.g., 'Finance Manager', 'Operations Manager'
    },
    permissions: {
      type: [String],
      default: [], // e.g., ['view_orders', 'manage_refunds', 'manage_users']
    },
    description: {
      type: String,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);

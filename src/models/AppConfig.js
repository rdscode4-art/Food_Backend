const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true, // e.g., 'THEME_SETTINGS', 'HOME_LAYOUT'
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppConfig', appConfigSchema);

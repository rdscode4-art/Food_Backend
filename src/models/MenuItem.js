const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
    },
    image: {
      type: String,
    },
    category: {
      type: String, // String for within-restaurant menu category
      required: true,
    },
    addons: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);

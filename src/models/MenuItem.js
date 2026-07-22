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
    foodImages: {
      type: [String],
      default: [],
    },
    category: {
      type: String, // String for within-restaurant menu category
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    isSpicy: {
      type: Boolean,
      default: false,
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },
    variants: [
      {
        name: String, // e.g., 'Small', 'Medium', 'Large'
        price: Number,
      }
    ],
    addons: [
      {
        name: String, // e.g., 'Extra Cheese'
        price: Number,
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);

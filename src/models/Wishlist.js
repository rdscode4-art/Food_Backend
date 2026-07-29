const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consumer',
      required: true,
      unique: true, // One wishlist per user
    },
    items: [
      {
        itemType: {
          type: String,
          enum: ['Restaurant', 'MenuItem'],
          required: true,
        },
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: 'items.itemType',
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wishlist', wishlistSchema);

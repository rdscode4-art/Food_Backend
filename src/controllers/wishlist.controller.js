const Wishlist = require('../models/Wishlist');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
      path: 'items.itemId',
      select: 'name price image coverImage rating',
    });

    if (!wishlist) {
      return successResponse(res, 'Wishlist fetched successfully', { items: [] });
    }

    // RefPath might populate from either Restaurant or MenuItem, it's best if we just return it
    // In a production app, we might map or filter out null items if they were deleted
    const activeItems = wishlist.items.filter(i => i.itemId != null);

    return successResponse(res, 'Wishlist fetched successfully', { items: activeItems });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.toggleWishlist = async (req, res) => {
  try {
    const { itemType, itemId } = req.body; // itemType: 'Restaurant' or 'MenuItem', itemId: string
    
    // The refPath needs to match the model name exactly for Mongoose population. 
    // Mongoose expects 'Restaurant' or 'MenuItem', but our enum is 'restaurant', 'menuItem'.
    // Mongoose population might be case sensitive depending on the model name.
    // Assuming model names are 'Restaurant' and 'MenuItem':
    const formattedItemType = itemType === 'restaurant' ? 'Restaurant' : 'MenuItem';

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user._id, items: [] });
    }

    const existingItemIndex = wishlist.items.findIndex(
      (item) => item.itemId.toString() === itemId && item.itemType === formattedItemType
    );

    if (existingItemIndex > -1) {
      // Remove it
      wishlist.items.splice(existingItemIndex, 1);
      await wishlist.save();
      return successResponse(res, 'Item removed from wishlist');
    } else {
      // Add it
      wishlist.items.push({ itemType: formattedItemType, itemId });
      await wishlist.save();
      return successResponse(res, 'Item added to wishlist');
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

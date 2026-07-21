const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Helper to calculate cart total
const calculateTotal = (items) => {
  return items.reduce((acc, item) => acc + item.totalItemPrice, 0);
};

exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.menuItem', 'name price image isAvailable');
    if (!cart) {
      return successResponse(res, 'Cart is empty', { items: [], totalAmount: 0 });
    }
    return successResponse(res, 'Cart fetched successfully', cart);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { menuItemId, quantity = 1, selectedAddons = [] } = req.body;

    const menuItem = await MenuItem.findById(menuItemId).populate('restaurant');
    if (!menuItem || !menuItem.isAvailable) {
      return errorResponse(res, 'Menu item not found or unavailable', 404);
    }
    
    if (!menuItem.restaurant.isApproved || !menuItem.restaurant.isActive) {
      return errorResponse(res, 'Restaurant is currently not active', 400);
    }

    const itemPrice = menuItem.discountPrice || menuItem.price;
    const addonsPrice = selectedAddons.reduce((acc, addon) => acc + addon.price, 0);
    const totalItemPrice = (itemPrice + addonsPrice) * quantity;

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      // Create new cart
      cart = new Cart({
        user: req.user._id,
        restaurant: menuItem.restaurant._id,
        items: [{ menuItem: menuItemId, quantity, selectedAddons, totalItemPrice }],
        totalAmount: totalItemPrice,
      });
      await cart.save();
      return successResponse(res, 'Item added to cart', cart, 201);
    }

    // Cart exists, check restaurant consistency
    if (cart.restaurant.toString() !== menuItem.restaurant._id.toString()) {
      return errorResponse(res, 'Cart contains items from another restaurant. Please clear your cart first.', 409);
    }

    // Check if item already in cart (ignoring addon differences for simplicity, or we could group them)
    // Here we'll just check by menuItemId. If they pick different addons, we could treat it as a separate item, 
    // but typically it's simpler to just match menuItemId and update quantity if we don't care about addons matching exactly.
    // Let's implement exact match (menuItem + addons) or just treat different addons as separate entries.
    // We will treat it as a new entry if addons differ, or just stringify addons to check.
    const addonsString = JSON.stringify(selectedAddons);
    const existingItemIndex = cart.items.findIndex(
      (item) => item.menuItem.toString() === menuItemId && JSON.stringify(item.selectedAddons) === addonsString
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].totalItemPrice += totalItemPrice;
    } else {
      cart.items.push({ menuItem: menuItemId, quantity, selectedAddons, totalItemPrice });
    }

    cart.totalAmount = calculateTotal(cart.items);
    await cart.save();

    return successResponse(res, 'Item added to cart', cart);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateQuantity = async (req, res) => {
  try {
    const { itemId } = req.params; // this is the _id of the item in the cart array
    const { quantity } = req.body;

    if (quantity < 1) {
      return errorResponse(res, 'Quantity must be at least 1', 400);
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return errorResponse(res, 'Cart not found', 404);

    const itemIndex = cart.items.findIndex((item) => item._id.toString() === itemId);
    if (itemIndex === -1) return errorResponse(res, 'Item not found in cart', 404);

    // Recalculate price for this item
    // Since we only store totalItemPrice, we can find the unit price:
    const unitPrice = cart.items[itemIndex].totalItemPrice / cart.items[itemIndex].quantity;
    
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].totalItemPrice = unitPrice * quantity;

    cart.totalAmount = calculateTotal(cart.items);
    await cart.save();

    return successResponse(res, 'Cart updated', cart);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.removeItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return errorResponse(res, 'Cart not found', 404);

    const itemIndex = cart.items.findIndex((item) => item._id.toString() === itemId);
    if (itemIndex === -1) return errorResponse(res, 'Item not found in cart', 404);

    cart.items.splice(itemIndex, 1);

    if (cart.items.length === 0) {
      // Delete cart if empty
      await Cart.deleteOne({ _id: cart._id });
      return successResponse(res, 'Cart is empty and deleted', { items: [], totalAmount: 0 });
    }

    cart.totalAmount = calculateTotal(cart.items);
    await cart.save();

    return successResponse(res, 'Item removed from cart', cart);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.clearCart = async (req, res) => {
  try {
    await Cart.deleteOne({ user: req.user._id });
    return successResponse(res, 'Cart cleared', { items: [], totalAmount: 0 });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const calculateTotal = (items) => {
  return items.reduce((acc, item) => acc + item.totalItemPrice, 0);
};

const applyFees = (cart) => {
  const itemTotal = calculateTotal(cart.items);
  
  cart.taxes = parseFloat((itemTotal * 0.05).toFixed(2)); // 5% GST
  cart.platformFee = 5; // Flat Rs 5
  cart.smallOrderFee = itemTotal < 150 ? 20 : 0; // Rs 20 if under 150
  
  // Example surge condition (randomly applied for demo or based on time/demand)
  const isSurge = Math.random() > 0.8; 
  cart.surgeFee = isSurge ? 15 : 0;

  // Assume delivery fee comes from restaurant or is calculated separately, 
  // but for now let's set a base delivery fee if not present
  const baseDeliveryFee = cart.deliveryFee || 30;

  cart.totalAmount = itemTotal + cart.taxes + cart.platformFee + cart.smallOrderFee + cart.surgeFee + baseDeliveryFee - (cart.discountAmount || 0);
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
    const { menuItemId, quantity = 1, selectedAddons = [], selectedVariant = null } = req.body;

    const menuItem = await MenuItem.findById(menuItemId).populate('restaurant');
    if (!menuItem || !menuItem.isAvailable) {
      return errorResponse(res, 'Menu item not found or unavailable', 404);
    }
    
    if (!menuItem.restaurant.isApproved || !menuItem.restaurant.isActive) {
      return errorResponse(res, 'Restaurant is currently not active', 400);
    }

    // Use variant price if provided, otherwise base price
    let itemPrice = menuItem.discountPrice || menuItem.price;
    if (selectedVariant && selectedVariant.name) {
      // Find variant in menu item to get actual price
      const variant = menuItem.variants.find(v => v.name === selectedVariant.name);
      if (variant) {
        itemPrice = variant.price;
        // Optionally apply general discount percentage if needed, but let's stick to variant price
        selectedVariant.price = variant.price; 
      }
    }

    const addonsPrice = selectedAddons.reduce((acc, addon) => acc + addon.price, 0);
    const totalItemPrice = (itemPrice + addonsPrice) * quantity;

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      // Create new cart
      cart = new Cart({
        user: req.user._id,
        restaurant: menuItem.restaurant._id,
        items: [{ menuItem: menuItemId, quantity, selectedAddons, selectedVariant, totalItemPrice }],
        deliveryFee: menuItem.restaurant.deliveryFee || 30, // Get delivery fee from restaurant
      });
      applyFees(cart);
      await cart.save();
      return successResponse(res, 'Item added to cart', cart, 201);
    }

    // Cart exists, check restaurant consistency
    if (cart.restaurant.toString() !== menuItem.restaurant._id.toString()) {
      return errorResponse(res, 'Cart contains items from another restaurant. Please clear your cart first.', 409);
    }

    const addonsString = JSON.stringify(selectedAddons);
    const variantString = JSON.stringify(selectedVariant);
    
    const existingItemIndex = cart.items.findIndex(
      (item) => item.menuItem.toString() === menuItemId && 
                JSON.stringify(item.selectedAddons) === addonsString &&
                JSON.stringify(item.selectedVariant) === variantString
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].totalItemPrice += totalItemPrice;
    } else {
      cart.items.push({ menuItem: menuItemId, quantity, selectedAddons, selectedVariant, totalItemPrice });
    }

    applyFees(cart);
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

    applyFees(cart);
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

    applyFees(cart);
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

const express = require('express');
const { check } = require('express-validator');
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(authenticate, authorize('customer'));

router.get('/', cartController.getCart);

router.post(
  '/',
  [
    check('menuItemId', 'Menu item ID is required').notEmpty(),
    check('quantity', 'Quantity must be numeric and at least 1').optional().isInt({ min: 1 }),
  ],
  validate,
  cartController.addToCart
);

router.put(
  '/:itemId',
  [
    check('quantity', 'Quantity must be numeric and at least 1').isInt({ min: 1 }),
  ],
  validate,
  cartController.updateQuantity
);

router.delete('/:itemId', cartController.removeItem);

router.delete('/', cartController.clearCart);

module.exports = router;

const express = require('express');
const { check } = require('express-validator');
const ownerController = require('../controllers/owner.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize, requireApproval } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

// Apply auth and owner role check
router.use(authenticate, authorize('restaurant_owner'));

// Create restaurant (does not require approval)
router.post(
  '/restaurant',
  [
    check('name', 'Restaurant name is required').notEmpty(),
    check('address', 'Address is required').notEmpty(),
    check('location.coordinates', 'Coordinates are required').isArray({ min: 2, max: 2 }),
  ],
  validate,
  ownerController.createRestaurant
);

// Get own restaurant (does not require approval to view pending status)
router.get('/restaurant', ownerController.getOwnRestaurant);

// All subsequent routes require the restaurant owner to be approved by admin
router.use(requireApproval);

// Restaurant management
router.put('/restaurant', ownerController.updateRestaurant);
router.put('/restaurant/toggle-active', ownerController.toggleActiveStatus);

// Menu management
router.post(
  '/restaurant/menu',
  [
    check('name', 'Name is required').notEmpty(),
    check('price', 'Price is required').isNumeric(),
    check('category', 'Category is required').notEmpty(),
  ],
  validate,
  ownerController.createMenuItem
);
router.get('/restaurant/menu', ownerController.getMenu);
router.put('/restaurant/menu/:itemId', ownerController.updateMenuItem);
router.delete('/restaurant/menu/:itemId', ownerController.deleteMenuItem);
router.put('/restaurant/menu/:itemId/toggle-availability', ownerController.toggleMenuItemAvailability);

// Order management
router.get('/orders', ownerController.getOrders);
router.put('/orders/:id/accept', ownerController.acceptOrder);
router.put('/orders/:id/reject', ownerController.rejectOrder);
router.put('/orders/:id/preparing', ownerController.prepareOrder);
router.put('/orders/:id/ready', ownerController.readyOrder);

// Dashboard
router.get('/dashboard', ownerController.getDashboardStats);

module.exports = router;

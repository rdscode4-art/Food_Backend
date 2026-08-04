const express = require('express');
const { check } = require('express-validator');
const ownerController = require('../controllers/owner.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize, requireApproval } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { upload } = require('../middlewares/upload.middleware');

const router = express.Router();

// Apply auth and owner role check
router.use(authenticate, authorize('restaurant_owner'));

// Get Owner Profile
router.get('/profile', ownerController.getProfile);

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

// Get all own restaurants (branches)
router.get('/restaurants', ownerController.getOwnRestaurants);

// All subsequent routes require the restaurant owner to be approved by admin
router.use(requireApproval);

// Restaurant management
router.put('/restaurant/:restaurantId', ownerController.updateRestaurant);
router.put('/restaurant/:restaurantId/toggle-active', ownerController.toggleActiveStatus);

// Menu management
router.post(
  '/restaurant/:restaurantId/menu',
  [
    check('name', 'Name is required').notEmpty(),
    check('price', 'Price is required').isNumeric(),
    check('category', 'Category is required').notEmpty(),
  ],
  validate,
  ownerController.createMenuItem
);
router.get('/restaurant/:restaurantId/menu', ownerController.getMenu);
router.put('/restaurant/:restaurantId/menu/:itemId', ownerController.updateMenuItem);
router.delete('/restaurant/:restaurantId/menu/:itemId', ownerController.deleteMenuItem);
router.put('/restaurant/:restaurantId/menu/:itemId/toggle-availability', ownerController.toggleMenuItemAvailability);

// Order management
router.get('/restaurant/:restaurantId/orders', ownerController.getOrders);
router.put('/restaurant/:restaurantId/orders/:id/accept', ownerController.acceptOrder);
router.put('/restaurant/:restaurantId/orders/:id/reject', ownerController.rejectOrder);
router.put('/restaurant/:restaurantId/orders/:id/preparing', ownerController.prepareOrder);
router.put('/restaurant/:restaurantId/orders/:id/ready', ownerController.readyOrder);
router.put('/restaurant/:restaurantId/orders/:id/cancel', ownerController.cancelOrder);

// Dashboard
router.get('/restaurant/:restaurantId/dashboard', ownerController.getDashboardStats);

// Phase 3 Features
router.get('/restaurant/:restaurantId/tables', ownerController.getTables);
router.post('/restaurant/:restaurantId/tables', ownerController.createTable);
router.get('/restaurant/:restaurantId/tables/:tableId/qr', ownerController.getTableQr);
router.get('/restaurant/:restaurantId/reviews', ownerController.getReviews);
router.get('/restaurant/:restaurantId/advertisements', ownerController.getAdvertisements);

// Vendor Coupons
router.get('/restaurant/:restaurantId/coupons', ownerController.getCoupons);
router.post('/restaurant/:restaurantId/coupons', ownerController.createCoupon);
router.put('/restaurant/:restaurantId/coupons/:couponId', ownerController.updateCoupon);
router.delete('/restaurant/:restaurantId/coupons/:couponId', ownerController.deleteCoupon);

// Vendor Settlements
router.get('/restaurant/:restaurantId/settlements', ownerController.getSettlements);
router.post('/restaurant/:restaurantId/settlements/generate', ownerController.generateSettlement);

// Inventory / Raw Materials
router.get('/restaurant/:restaurantId/inventory', ownerController.getInventory);
router.post('/restaurant/:restaurantId/inventory', ownerController.addInventoryItem);
router.put('/restaurant/:restaurantId/inventory/:itemId', ownerController.updateInventoryItem);

// Image Upload
router.post('/upload-image', upload.single('file'), ownerController.uploadImage);

module.exports = router;

const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

// Apply auth and admin role check to all routes in this file
router.use(authenticate, authorize('admin'));

// Restaurant Owners
router.get('/restaurant-owners/pending', adminController.getPendingRestaurantOwners);
router.put('/restaurant-owners/:id/approve', adminController.approveRestaurantOwner);
router.put('/restaurant-owners/:id/reject', adminController.rejectRestaurantOwner);

// Delivery Partners
router.get('/delivery-partners/pending', adminController.getPendingDeliveryPartners);
router.put('/delivery-partners/:id/approve', adminController.approveDeliveryPartner);
router.put('/delivery-partners/:id/reject', adminController.rejectDeliveryPartner);

// Restaurants
router.get('/restaurants/pending', adminController.getPendingRestaurants);
router.put('/restaurants/:id/approve', adminController.approveRestaurant);
router.put('/restaurants/:id/reject', adminController.rejectRestaurant);
router.get('/restaurants/:id/orders', adminController.getRestaurantOrders);

// Users
router.put('/users/:id/suspend', adminController.suspendUser);
router.put('/users/:id/unsuspend', adminController.unsuspendUser);

// Stats
router.get('/stats', adminController.getStats);

module.exports = router;

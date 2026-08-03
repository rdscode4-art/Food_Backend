const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

// Apply auth and admin role check to all routes in this file
router.use(authenticate, authorize('admin'));

// Sub-Admin Management
router.get('/admins', adminController.getAdmins);
router.post('/admins', adminController.createAdmin);
router.put('/admins/:id', adminController.updateAdmin);
router.delete('/admins/:id', adminController.deleteAdmin);

// Roles Management
router.get('/roles', adminController.getRoles);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);
router.get('/dashboard/revenue-chart', adminController.getRevenueChart);

// Restaurant Owners
router.get('/restaurant-owners', adminController.getRestaurantOwners);
router.get('/restaurant-owners/pending', adminController.getPendingRestaurantOwners);
router.put('/restaurant-owners/:id/approve', adminController.approveRestaurantOwner);
router.put('/restaurant-owners/:id/reject', adminController.rejectRestaurantOwner);

// Delivery Partners
router.get('/delivery-partners', adminController.getDeliveryPartners);
router.get('/delivery-partners/pending', adminController.getPendingDeliveryPartners);
router.put('/delivery-partners/:id/approve', adminController.approveDeliveryPartner);
router.put('/delivery-partners/:id/reject', adminController.rejectDeliveryPartner);
router.get('/delivery-partners/:id/location', adminController.getDriverLocation);

// Restaurants
router.get('/restaurants', adminController.getRestaurants);
router.get('/restaurants/pending', adminController.getPendingRestaurants);
router.put('/restaurants/:id/approve', adminController.approveRestaurant);
router.put('/restaurants/:id/reject', adminController.rejectRestaurant);
router.get('/restaurants/:id/orders', adminController.getRestaurantOrders);

// Orders
router.get('/orders', adminController.getOrders);
router.put('/orders/:id/assign', adminController.manualAssignOrder);

// Users
router.put('/users/:id/suspend', adminController.suspendUser);
router.put('/users/:id/unsuspend', adminController.unsuspendUser);

// Stats
router.get('/stats', adminController.getStats);

// Configs
router.get('/config/delivery', adminController.getDeliveryConfig);
router.put('/config/delivery', adminController.updateDeliveryConfig);

router.get('/config/incentive', adminController.getIncentiveConfig);
router.put('/config/incentive', adminController.updateIncentiveConfig);

// Users
router.get('/users', adminController.getUsers);
router.put('/users/:id/loyalty', adminController.manageLoyalty);
router.put('/restaurants/:id/commission', adminController.manageCommission);

// Orders & Coupons
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderDetails);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.put('/orders/:id/cancel', adminController.cancelOrder);
router.post('/coupons', adminController.createPlatformCoupon);
router.get('/orders/export', adminController.exportOrders);

// Marketing
router.post('/broadcasts/send', adminController.sendBroadcast);

// Financials
router.get('/transactions', adminController.getTransactions);
router.post('/refunds/process', adminController.processRefund);

// Roles & Zones
router.post('/roles', adminController.createRole);
router.get('/zones', adminController.getZones);
router.post('/zones', adminController.createZone);
router.put('/zones/:id', adminController.updateZone);

// Settings
router.put('/settings', adminController.updateSettings);

// Communications (Tickets)
router.get('/tickets', adminController.getTickets);
router.post('/tickets/:id/reply', adminController.replyToTicket);

// CMS & Rules
router.post('/cms', adminController.createCmsPage);
router.post('/refund-rules', adminController.createRefundRule);
router.get('/activity-logs', adminController.getActivityLogs);

// Notifications & Ads
router.post('/notifications/templates', adminController.createNotificationTemplate);
router.post('/advertisements', adminController.createAdvertisement);
router.post('/tables', adminController.createTable);

module.exports = router;

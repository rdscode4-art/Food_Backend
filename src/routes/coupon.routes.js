const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(authenticate);

router.get('/', couponController.getAvailableCoupons);
router.post('/apply', couponController.applyCoupon);

// Admin only route for creating coupons
router.post('/create', authorize('admin'), couponController.createCoupon);

module.exports = router;

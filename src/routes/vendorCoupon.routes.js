const express = require('express');
const { check } = require('express-validator');
const vendorCouponController = require('../controllers/vendorCoupon.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize, requireApproval } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(authenticate, authorize('restaurant_owner'), requireApproval);

router.post(
  '/:restaurantId/coupons',
  [
    check('code', 'Coupon code is required').notEmpty(),
    check('discountType', 'Discount type must be percentage, flat, free_delivery, or bogo').isIn(['percentage', 'flat', 'free_delivery', 'bogo']),
    check('discountValue', 'Discount value is required').isNumeric(),
    check('startDate', 'Start date is required').isISO8601(),
    check('expiryDate', 'Expiry date is required').isISO8601(),
  ],
  validate,
  vendorCouponController.createCoupon
);

router.get('/:restaurantId/coupons', vendorCouponController.getCoupons);
router.put('/:restaurantId/coupons/:couponId', vendorCouponController.updateCoupon);
router.delete('/:restaurantId/coupons/:couponId', vendorCouponController.deleteCoupon);

module.exports = router;

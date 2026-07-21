const express = require('express');
const { check } = require('express-validator');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(authenticate, authorize('customer'));

router.post(
  '/checkout',
  [
    check('addressId', 'Address ID is required').notEmpty(),
    check('paymentMethod', 'Payment Method is required (card, upi, cod)').isIn(['card', 'upi', 'cod']),
  ],
  validate,
  orderController.checkout
);

router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderDetails);
router.put('/:id/cancel', orderController.cancelOrder);
router.get('/:id/track', orderController.trackOrder);
router.get('/:id/help', orderController.getSupportHelp);
router.post(
  '/:id/review',
  [
    check('rating', 'Rating is required and must be between 1 and 5').isInt({ min: 1, max: 5 })
  ],
  validate,
  orderController.reviewOrder
);

module.exports = router;

const express = require('express');
const { check } = require('express-validator');
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(authenticate, authorize('customer'));

router.post(
  '/mock-charge',
  [
    check('orderId', 'Order ID is required').notEmpty(),
    check('method', 'Payment method is required').isIn(['card', 'upi', 'cod']),
  ],
  validate,
  paymentController.mockCharge
);

module.exports = router;

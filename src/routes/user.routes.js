const express = require('express');
const { check } = require('express-validator');
const userController = require('../controllers/user.controller');
const addressController = require('../controllers/address.controller');
const paymentMethodController = require('../controllers/paymentMethod.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(authenticate, authorize('customer'));

// Profile
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// --- Addresses ---
router.get('/addresses', addressController.getAddresses);

router.post(
  '/addresses',
  [
    check('street', 'Street is required').notEmpty(),
    check('city', 'City is required').notEmpty(),
    check('zip', 'ZIP code is required').notEmpty(),
    check('location.coordinates', 'Coordinates are required').isArray({ min: 2, max: 2 }),
  ],
  validate,
  addressController.addAddress
);

router.put('/addresses/:id', addressController.updateAddress);
router.delete('/addresses/:id', addressController.deleteAddress);

// --- Payment Methods ---
router.get('/payment-methods', paymentMethodController.getPaymentMethods);

router.post(
  '/payment-methods',
  [
    check('type', 'Payment type must be card, upi, or wallet').isIn(['card', 'upi', 'wallet']),
    check('details', 'Details are required').notEmpty(),
  ],
  validate,
  paymentMethodController.addPaymentMethod
);

router.delete('/payment-methods/:id', paymentMethodController.deletePaymentMethod);

module.exports = router;

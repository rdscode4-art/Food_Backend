const express = require('express');
const { check } = require('express-validator');
const partnerController = require('../controllers/partner.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize, requireApproval } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(authenticate, authorize('delivery_partner'), requireApproval);

router.put('/online-status', partnerController.toggleStatus);

router.put(
  '/location',
  [
    check('coordinates', 'Coordinates must be an array of exactly 2 numbers [lng, lat]').isArray({ min: 2, max: 2 })
  ],
  validate,
  partnerController.updateLocation
);

router.get('/orders/available', partnerController.getAvailableOrders);
router.put('/orders/:id/accept', partnerController.acceptOrder);
router.put('/orders/:id/picked-up', partnerController.pickedUpOrder);
router.put('/orders/:id/out-for-delivery', partnerController.outForDeliveryOrder);
router.put('/orders/:id/deliver', partnerController.deliverOrder);

// Payouts
router.get('/payouts/summary', partnerController.getPayoutSummary);
router.get('/payouts/history', partnerController.getPayoutHistory);

module.exports = router;

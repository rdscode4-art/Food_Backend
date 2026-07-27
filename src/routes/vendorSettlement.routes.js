const express = require('express');
const vendorSettlementController = require('../controllers/vendorSettlement.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize, requireApproval } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authenticate, requireApproval); // requireApproval just checks if they are approved (applies to owners, admin is always approved if logic permits, or we just allow both)

// Custom authorize for this router to allow both owner and admin
router.use(authorize('restaurant_owner', 'admin'));

router.get('/:restaurantId/settlements', vendorSettlementController.getSettlements);
router.post('/:restaurantId/settlements/generate', vendorSettlementController.generateSettlement);

module.exports = router;

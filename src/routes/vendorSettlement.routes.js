const express = require('express');
const vendorSettlementController = require('../controllers/vendorSettlement.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize, requireApproval } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authenticate, authorize('restaurant_owner'), requireApproval);

router.get('/:restaurantId/settlements', vendorSettlementController.getSettlements);

module.exports = router;

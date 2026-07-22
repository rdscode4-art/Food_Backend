const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membership.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.get('/', membershipController.getPlans);

router.use(authenticate);

router.post('/subscribe', membershipController.subscribeToPlan);

// Admin routes
router.post('/admin/create', authorize('admin'), membershipController.createPlan);

module.exports = router;

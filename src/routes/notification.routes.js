const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.put('/read-all', notificationController.markAllAsRead); // Must be before /:id/read
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;

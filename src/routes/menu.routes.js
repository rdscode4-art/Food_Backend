const express = require('express');
const menuController = require('../controllers/menu.controller');

const router = express.Router();

// Public routes
router.get('/:id', menuController.getMenuItemDetail);

module.exports = router;

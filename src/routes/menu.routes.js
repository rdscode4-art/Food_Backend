const express = require('express');
const menuController = require('../controllers/menu.controller');

const router = express.Router();

// Public routes
router.get('/:restaurantId', menuController.getMenuByRestaurant);
router.get('/item/:id', menuController.getMenuItemDetail);

module.exports = router;

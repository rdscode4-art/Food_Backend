const express = require('express');
const restaurantController = require('../controllers/restaurant.controller');

const router = express.Router();

// Public routes for Consumer App discovery
router.get('/', restaurantController.getRestaurants);
router.get('/categories', restaurantController.getCategories);
router.get('/featured', restaurantController.getFeaturedRestaurants);
router.get('/fastest', restaurantController.getFastestRestaurants);
router.get('/popular', restaurantController.getPopularRestaurants);
router.get('/search', restaurantController.search);
router.get('/:id', restaurantController.getRestaurantDetail);

module.exports = router;

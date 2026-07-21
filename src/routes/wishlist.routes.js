const express = require('express');
const { check } = require('express-validator');
const wishlistController = require('../controllers/wishlist.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', wishlistController.getWishlist);

router.post(
  '/toggle',
  [
    check('itemType', 'itemType is required and must be restaurant or menuItem').isIn(['restaurant', 'menuItem']),
    check('itemId', 'itemId is required').notEmpty(),
  ],
  validate,
  wishlistController.toggleWishlist
);

module.exports = router;

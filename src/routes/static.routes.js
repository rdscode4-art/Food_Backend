const express = require('express');
const staticController = require('../controllers/static.controller');

const router = express.Router();

router.get('/about', staticController.getAbout);
router.get('/faq', staticController.getFaq);
router.get('/terms', staticController.getTerms);

module.exports = router;

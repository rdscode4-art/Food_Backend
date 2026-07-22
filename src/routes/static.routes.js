const express = require('express');
const staticController = require('../controllers/static.controller');

const router = express.Router();

router.get('/about', staticController.getAbout);
router.get('/faq', staticController.getFaq);
router.get('/terms', staticController.getTerms);
router.get('/banners', staticController.getBanners);
router.get('/app-config', staticController.getAppConfig);

module.exports = router;

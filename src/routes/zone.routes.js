const express = require('express');
const zoneController = require('../controllers/zone.controller');

const router = express.Router();

router.get('/', zoneController.getAllZones);

module.exports = router;

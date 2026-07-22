const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', walletController.getWalletBalance);
router.get('/transactions', walletController.getWalletTransactions);
router.post('/add', walletController.addMoney);

module.exports = router;

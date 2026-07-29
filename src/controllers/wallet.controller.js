const WalletTransaction = require('../models/WalletTransaction');
const Consumer = require('../models/Consumer');
const Vendor = require('../models/Vendor');
const DeliveryPartner = require('../models/DeliveryPartner');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getWalletBalance = async (req, res) => {
  try {
    if (!req.user) return errorResponse(res, 'User not found', 404);

    return successResponse(res, 'Wallet balance fetched', { balance: req.user.walletBalance });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getWalletTransactions = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ user: req.user._id }).sort({ createdAt: -1 });
    return successResponse(res, 'Transactions fetched', transactions);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.addMoney = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return errorResponse(res, 'Invalid amount', 400);

    // In a real scenario, this would be preceded by a payment gateway integration
    // For now, we simulate successful payment gateway processing

    const userModelMap = { 'customer': 'Consumer', 'restaurant_owner': 'Vendor', 'delivery_partner': 'DeliveryPartner' };
    
    const transaction = await WalletTransaction.create({
      user: req.user._id,
      userModel: userModelMap[req.user.role],
      amount,
      type: 'credit',
      purpose: 'add_money',
      status: 'success',
      reference: 'gateway_tx_' + Date.now()
    });

    const user = await req.user.constructor.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: amount } },
      { returnDocument: 'after' }
    );

    return successResponse(res, 'Money added successfully', {
      transaction,
      newBalance: user.walletBalance
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

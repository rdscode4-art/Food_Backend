const WalletTransaction = require('../models/WalletTransaction');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance');
    if (!user) return errorResponse(res, 'User not found', 404);

    return successResponse(res, 'Wallet balance fetched', { balance: user.walletBalance });
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

    const transaction = await WalletTransaction.create({
      user: req.user._id,
      amount,
      type: 'credit',
      purpose: 'add_money',
      status: 'success',
      description: 'Added money to wallet via payment gateway'
    });

    const user = await User.findByIdAndUpdate(
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

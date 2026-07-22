const MembershipPlan = require('../models/MembershipPlan');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.createPlan = async (req, res) => {
  try {
    const plan = await MembershipPlan.create(req.body);
    return successResponse(res, 'Membership plan created', plan, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getPlans = async (req, res) => {
  try {
    const plans = await MembershipPlan.find({ isActive: true });
    return successResponse(res, 'Membership plans fetched', plans);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.subscribeToPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    
    const plan = await MembershipPlan.findById(planId);
    if (!plan || !plan.isActive) return errorResponse(res, 'Invalid or inactive plan', 404);

    const user = await User.findById(req.user._id);

    // Check if user has enough wallet balance
    if (user.walletBalance < plan.price) {
      return errorResponse(res, 'Insufficient wallet balance to subscribe to this plan', 400);
    }

    // Deduct price from wallet
    user.walletBalance -= plan.price;

    // Set membership
    user.currentMembership = plan._id;
    
    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + plan.durationMonths);
    user.membershipExpiry = expiryDate;

    await user.save();

    // Log transaction
    await WalletTransaction.create({
      user: user._id,
      amount: plan.price,
      type: 'debit',
      purpose: 'membership_subscription',
      description: `Subscribed to ${plan.name} membership`
    });

    return successResponse(res, `Successfully subscribed to ${plan.name}`, {
      membershipExpiry: user.membershipExpiry,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

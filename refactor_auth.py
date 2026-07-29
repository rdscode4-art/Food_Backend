import os

auth_controller_path = r"d:\Rideal\Delivery\src\controllers\auth.controller.js"
auth_middleware_path = r"d:\Rideal\Delivery\src\middlewares\auth.middleware.js"

# We will completely overwrite auth.controller.js and auth.middleware.js 
# because the monolithic `User` logic is heavily intertwined.

auth_controller_code = """const Consumer = require('../models/Consumer');
const Vendor = require('../models/Vendor');
const DeliveryPartner = require('../models/DeliveryPartner');
const Admin = require('../models/Admin');
const Otp = require('../models/Otp');
const bcrypt = require('bcrypt');
const { generateOtp } = require('../utils/generateOtp');
const { sendOtpEmail } = require('../utils/sendEmail');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const getModelByRole = (role) => {
  if (role === 'customer') return Consumer;
  if (role === 'restaurant_owner') return Vendor;
  if (role === 'delivery_partner') return DeliveryPartner;
  if (role === 'admin') return Admin;
  return Consumer;
};

// Helper to find a user across all collections by email
const findUserByEmail = async (email) => {
  let user = await Consumer.findOne({ email });
  if (user) return { user, model: Consumer, role: 'customer' };
  
  user = await Vendor.findOne({ email });
  if (user) return { user, model: Vendor, role: 'restaurant_owner' };
  
  user = await DeliveryPartner.findOne({ email });
  if (user) return { user, model: DeliveryPartner, role: 'delivery_partner' };
  
  user = await Admin.findOne({ email });
  if (user) return { user, model: Admin, role: 'admin' };
  
  return null;
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const registerUser = async (req, res, role, extraFields = {}) => {
  try {
    const { name, email, password, phone, referredByCode, ...rest } = req.body;
    const Model = getModelByRole(role);

    let referredById = null;
    if (referredByCode && role === 'customer') {
      const referrer = await Consumer.findOne({ referralCode: referredByCode });
      if (referrer) {
        referredById = referrer._id;
      }
    }

    const existingMatch = await findUserByEmail(email);
    if (existingMatch) {
      const existingUser = existingMatch.user;
      if (existingUser.isVerified) {
        return errorResponse(res, 'Email is already registered', 400);
      } else {
        const hashedPassword = await hashPassword(password);
        existingUser.password = hashedPassword;
        existingUser.name = name;
        existingUser.phone = phone;
        Object.assign(existingUser, extraFields);
        await existingUser.save();

        const code = generateOtp();
        await Otp.findOneAndUpdate(
          { email, purpose: 'signup' },
          { code, createdAt: Date.now() },
          { upsert: true, returnDocument: 'after' }
        );
        await sendOtpEmail(email, code);
        return successResponse(res, 'Account pending verification. A new OTP has been sent.', { email }, 200);
      }
    }

    const hashedPassword = await hashPassword(password);
    const isApproved = role === 'customer';
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newUser = new Model({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      isApproved,
      referralCode: role === 'customer' ? referralCode : undefined,
      referredBy: referredById,
      ...extraFields,
    });

    await newUser.save();

    const code = generateOtp();
    await Otp.create({ email, code, purpose: 'signup' });
    await sendOtpEmail(email, code);

    return successResponse(res, 'User registered. Please check email for OTP.', { email }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.signup = (req, res) => registerUser(req, res, 'customer');

exports.signupRestaurantOwner = (req, res) => {
  const { businessName, businessDocuments, fssai, gst, panNumber, bankDetails } = req.body;
  return registerUser(req, res, 'restaurant_owner', { businessName, businessDocuments, fssai, gst, panNumber, bankDetails });
};

exports.signupDeliveryPartner = (req, res) => {
  const { vehicleType, vehicleNumber, licenseNumber, partnerDocuments } = req.body;
  return registerUser(req, res, 'delivery_partner', { vehicleType, vehicleNumber, licenseNumber, partnerDocuments });
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, code, purpose } = req.body;
    const otpRecord = await Otp.findOne({ email, code, purpose });
    if (!otpRecord) return errorResponse(res, 'Invalid or expired OTP', 400);

    const match = await findUserByEmail(email);
    if (!match) return errorResponse(res, 'User not found', 404);
    
    const user = match.user;

    if (purpose === 'signup') {
      user.isVerified = true;
      await user.save();
      await Otp.deleteOne({ _id: otpRecord._id });

      // Only give referral bonus for consumers
      if (user.referredBy && match.role === 'customer') {
        const referrer = await Consumer.findById(user.referredBy);
        if (referrer) {
          const WalletTransaction = require('../models/WalletTransaction');
          const AppConfig = require('../models/AppConfig');
          let bonusAmount = 50;
          const config = await AppConfig.findOne({ key: 'REFERRAL_REWARD_AMOUNT' });
          if (config && config.value) bonusAmount = Number(config.value) || 50;

          referrer.walletBalance = (referrer.walletBalance || 0) + bonusAmount;
          await referrer.save();
          await WalletTransaction.create({
            userModel: 'Consumer',
            user: referrer._id,
            amount: bonusAmount,
            type: 'credit',
            purpose: 'referral_bonus',
            description: 'Referral bonus'
          });
          
          user.walletBalance = (user.walletBalance || 0) + bonusAmount;
          await user.save();
          await WalletTransaction.create({
            userModel: 'Consumer',
            user: user._id,
            amount: bonusAmount,
            type: 'credit',
            purpose: 'referral_bonus',
            description: 'Sign up referral bonus'
          });
        }
      }

      const accessToken = generateAccessToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id, user.role);
      user.activeSessions.push(refreshToken);
      await user.save();

      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
      return successResponse(res, 'Email verified successfully', { accessToken, user: { _id: user._id, name: user.name, email: user.email, role: user.role, isApproved: user.isApproved } });
    }

    if (purpose === 'password_reset') {
      return successResponse(res, 'OTP verified. Proceed to reset password', { email, code });
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const match = await findUserByEmail(email);
    if (!match) return errorResponse(res, 'Invalid email or password', 401);
    
    const user = match.user;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return errorResponse(res, 'Invalid email or password', 401);

    if (!user.isVerified) return errorResponse(res, 'Please verify your email first', 403);
    if (user.isSuspended) return errorResponse(res, 'Account is suspended', 403);

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);
    
    user.activeSessions.push(refreshToken);
    await user.save();

    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });

    const { password: _, activeSessions, ...userData } = user.toObject();
    return successResponse(res, 'Login successful', { accessToken, user: userData });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken && req.user) {
      req.user.activeSessions = req.user.activeSessions.filter(token => token !== refreshToken);
      await req.user.save();
    }
    res.clearCookie('refreshToken');
    return successResponse(res, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.logoutAll = async (req, res) => {
  try {
    if (req.user) {
      req.user.activeSessions = [];
      await req.user.save();
    }
    res.clearCookie('refreshToken');
    return successResponse(res, 'Logged out of all devices');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const rToken = req.cookies.refreshToken;
    if (!rToken) return errorResponse(res, 'No refresh token provided', 401);

    const decoded = verifyRefreshToken(rToken);
    if (!decoded) return errorResponse(res, 'Invalid or expired refresh token', 403);

    const match = await findUserByEmail(decoded.email || ''); // Assuming we can't find by ID if we don't know the table easily, wait, decoded has id and role.
    // Let's find by id and role
    const Model = getModelByRole(decoded.role);
    const user = await Model.findById(decoded.id);

    if (!user || !user.activeSessions.includes(rToken)) {
      return errorResponse(res, 'Invalid refresh token session', 403);
    }

    const accessToken = generateAccessToken(user._id, user.role);
    return successResponse(res, 'Token refreshed', { accessToken });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const match = await findUserByEmail(email);
    if (!match) return successResponse(res, 'If your email is registered, an OTP has been sent.');
    
    const code = generateOtp();
    await Otp.findOneAndUpdate(
      { email, purpose: 'password_reset' },
      { code, createdAt: Date.now() },
      { upsert: true }
    );
    await sendOtpEmail(email, code);

    return successResponse(res, 'If your email is registered, an OTP has been sent.');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const otpRecord = await Otp.findOne({ email, code, purpose: 'password_reset' });
    if (!otpRecord) return errorResponse(res, 'Invalid or expired OTP', 400);

    const match = await findUserByEmail(email);
    if (!match) return errorResponse(res, 'User not found', 404);

    const hashedPassword = await hashPassword(newPassword);
    match.user.password = hashedPassword;
    await match.user.save();
    
    await Otp.deleteOne({ _id: otpRecord._id });
    
    return successResponse(res, 'Password reset successful');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    const match = await findUserByEmail(email);
    if (!match) return errorResponse(res, 'User not found', 404);

    const code = generateOtp();
    await Otp.findOneAndUpdate(
      { email, purpose },
      { code, createdAt: Date.now() },
      { upsert: true }
    );
    await sendOtpEmail(email, code);

    return successResponse(res, 'OTP resent successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
"""

auth_middleware_code = """const jwt = require('jsonwebtoken');
const Consumer = require('../models/Consumer');
const Vendor = require('../models/Vendor');
const DeliveryPartner = require('../models/DeliveryPartner');
const Admin = require('../models/Admin');
const { errorResponse } = require('../utils/apiResponse');

const getModelByRole = (role) => {
  if (role === 'customer') return Consumer;
  if (role === 'restaurant_owner') return Vendor;
  if (role === 'delivery_partner') return DeliveryPartner;
  if (role === 'admin') return Admin;
  return Consumer;
};

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const Model = getModelByRole(decoded.role);
    const user = await Model.findById(decoded.id);

    if (!user) {
      return errorResponse(res, 'User no longer exists', 401);
    }
    if (user.isSuspended) {
      return errorResponse(res, 'Account suspended', 403);
    }

    req.user = user;
    req.user.role = decoded.role; // ensure role is on req.user
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired', 401);
    }
    return errorResponse(res, 'Invalid token', 401);
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, 'Access denied', 403);
    }
    next();
  };
};

module.exports = {
  verifyToken,
  authorizeRoles,
};
"""

with open(auth_controller_path, "w", encoding="utf-8") as f:
    f.write(auth_controller_code)

with open(auth_middleware_path, "w", encoding="utf-8") as f:
    f.write(auth_middleware_code)

print("Updated Auth Controller and Middleware for separate DB models.")

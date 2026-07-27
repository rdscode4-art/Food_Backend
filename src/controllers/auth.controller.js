const User = require('../models/User');
const Otp = require('../models/Otp');
const bcrypt = require('bcrypt');
const { generateOtp } = require('../utils/generateOtp');
const { sendOtpEmail } = require('../utils/sendEmail');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Helper to hash passwords
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Generic signup logic
const registerUser = async (req, res, role, extraFields = {}) => {
  try {
    const { name, email, password, phone, referredByCode, ...rest } = req.body;

    let referredById = null;
    if (referredByCode) {
      const referrer = await User.findOne({ referralCode: referredByCode });
      if (referrer) {
        referredById = referrer._id;
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        return errorResponse(res, 'Email is already registered', 400);
      } else {
        // User is not verified yet, so update their details and resend OTP
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

    // Generate random 6 character referral code
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      isApproved,
      referralCode,
      referredBy: referredById,
      ...extraFields,
    });

    await newUser.save();

    // Generate and send OTP
    const code = generateOtp();
    await Otp.create({ email, code, purpose: 'signup' });
    await sendOtpEmail(email, code);

    return successResponse(res, 'User registered. Please check email for OTP.', { email }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.signup = (req, res) => {
  return registerUser(req, res, 'customer');
};

exports.signupRestaurantOwner = (req, res) => {
  const { businessName, businessDocuments, fssai, gst, panNumber, bankDetails } = req.body;
  return registerUser(req, res, 'restaurant_owner', { 
    businessName, 
    businessDocuments, 
    fssai, 
    gst, 
    panNumber, 
    bankDetails 
  });
};

exports.signupDeliveryPartner = (req, res) => {
  const { vehicleType, vehicleNumber, licenseNumber, partnerDocuments } = req.body;
  return registerUser(req, res, 'delivery_partner', {
    vehicleType,
    vehicleNumber,
    licenseNumber,
    partnerDocuments,
  });
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, code, purpose } = req.body;

    const otpRecord = await Otp.findOne({ email, code, purpose });
    if (!otpRecord) {
      return errorResponse(res, 'Invalid or expired OTP', 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    if (purpose === 'signup') {
      user.isVerified = true;
      await user.save();

      // Check for Referral Bonus if they were referred
      if (user.referredBy) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          const WalletTransaction = require('../models/WalletTransaction');
          const AppConfig = require('../models/AppConfig');
          let bonusAmount = 50;
          const config = await AppConfig.findOne({ key: 'REFERRAL_REWARD_AMOUNT' });
          if (config && config.value) {
            bonusAmount = Number(config.value) || 50;
          }

          // Reward new user
          user.walletBalance = (user.walletBalance || 0) + bonusAmount;
          await user.save();
          await WalletTransaction.create({
            user: user._id,
            amount: bonusAmount,
            type: 'credit',
            purpose: 'referral_bonus',
            description: 'Sign up referral bonus'
          });

          // Reward referrer
          referrer.walletBalance = (referrer.walletBalance || 0) + bonusAmount;
          await referrer.save();
          await WalletTransaction.create({
            user: referrer._id,
            amount: bonusAmount,
            type: 'credit',
            purpose: 'referral_bonus',
            description: 'Friend registered using your referral code'
          });
        }
      }
    }

    // Delete OTP record after successful verification
    await Otp.deleteOne({ _id: otpRecord._id });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Add to active sessions
    user.activeSessions = user.activeSessions || [];
    user.activeSessions.push(refreshToken);
    await user.save();

    // Set refresh token in cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return successResponse(res, 'OTP verified successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        isVerified: user.isVerified
      },
      accessToken,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    // Optional: add real rate-limiting logic here beyond express-rate-limit if needed
    const code = generateOtp();
    
    // Upsert OTP
    await Otp.findOneAndUpdate(
      { email, purpose },
      { code, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    await sendOtpEmail(email, code);

    return successResponse(res, 'OTP resent successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    if (!user.isVerified) {
      return errorResponse(res, 'Please verify your email first', 403);
    }

    if (user.isSuspended) {
      return errorResponse(res, 'Your account is suspended', 403);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Add to active sessions
    user.activeSessions = user.activeSessions || [];
    user.activeSessions.push(refreshToken);
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(res, 'Login successful', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
      accessToken,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const code = generateOtp();
    await Otp.findOneAndUpdate(
      { email, purpose: 'reset_password' },
      { code, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    await sendOtpEmail(email, code);

    return successResponse(res, 'Password reset OTP sent to email');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const otpRecord = await Otp.findOne({ email, code, purpose: 'reset_password' });
    if (!otpRecord) {
      return errorResponse(res, 'Invalid or expired OTP', 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    await Otp.deleteOne({ _id: otpRecord._id });

    return successResponse(res, 'Password reset successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.refreshToken = async (req, res) => {
  try {
    // Client can send refresh token in cookie or body
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) {
      return errorResponse(res, 'No refresh token provided', 401);
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);
    if (!user || !user.activeSessions.includes(token)) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    const accessToken = generateAccessToken(user);

    return successResponse(res, 'Token refreshed', { accessToken });
  } catch (error) {
    return errorResponse(res, 'Invalid or expired refresh token', 401);
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (token) {
      const decoded = verifyRefreshToken(token);
      await User.findByIdAndUpdate(decoded.id, {
        $pull: { activeSessions: token }
      });
    }
    res.clearCookie('refreshToken');
    return successResponse(res, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.logoutAll = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.activeSessions = [];
      await user.save();
    }
    res.clearCookie('refreshToken');
    return successResponse(res, 'Logged out from all devices successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

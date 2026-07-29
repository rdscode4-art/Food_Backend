const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'src/controllers/auth.controller.js');
let content = fs.readFileSync(filepath, 'utf8');

// Find the START of exports.refreshToken
const refreshTokenStart = content.indexOf('exports.refreshToken = async (req, res) => {');

if (refreshTokenStart !== -1) {
    const cleanContent = content.substring(0, refreshTokenStart);
    
    const appendContent = `exports.refreshToken = async (req, res) => {
  try {
    const rToken = req.cookies.refreshToken;
    if (!rToken) return errorResponse(res, 'No refresh token provided', 401);

    const decoded = verifyRefreshToken(rToken);
    if (!decoded) return errorResponse(res, 'Invalid or expired refresh token', 403);

    const Model = getModelByRole(decoded.role);
    const user = await Model.findById(decoded.id);

    if (!user || !user.activeSessions.includes(rToken)) {
      return errorResponse(res, 'Invalid refresh token session', 403);
    }

    const accessToken = generateAccessToken(user);
    return successResponse(res, 'Token refreshed', { accessToken });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const match = await findUserByEmail(email);
    if (!match) return errorResponse(res, 'User not found', 404);

    const code = generateOtp();
    await Otp.findOneAndUpdate(
      { email, purpose: 'password_reset' },
      { code, createdAt: Date.now() },
      { upsert: true }
    );
    await sendOtpEmail(email, code);

    return successResponse(res, 'OTP sent to email for password reset', { email, code });
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

    return successResponse(res, 'OTP resent successfully', { code });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.logout = async (req, res) => {
  try {
    const user = req.user;
    const rToken = req.cookies.refreshToken;
    user.activeSessions = user.activeSessions.filter(token => token !== rToken);
    await user.save();
    res.clearCookie('refreshToken');
    return successResponse(res, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.logoutAll = async (req, res) => {
  try {
    const user = req.user;
    user.activeSessions = [];
    await user.save();
    res.clearCookie('refreshToken');
    return successResponse(res, 'Logged out from all devices');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
`;

    fs.writeFileSync(filepath, cleanContent + appendContent, 'utf8');
    console.log("auth.controller.js fixed successfully!");
} else {
    console.log("Could not find exports.refreshToken");
}

const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'src/controllers/auth.controller.js');
let content = fs.readFileSync(filepath, 'utf8');

// The file got corrupted after line 265
// exports.forgotPassword was deleted and replaced by a mix.
// Let's just find the end of `exports.refreshToken` which ends with:
//     return errorResponse(res, error.message, 500);
//   }
// };

const startToken = `    const accessToken = generateAccessToken(user);
    return successResponse(res, 'Token refreshed', { accessToken });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};`;

const endToken = `exports.resendOtp = async (req, res) => {`;

const startIdx = content.indexOf(startToken);
const endIdx = content.indexOf(endToken);

if (startIdx !== -1 && endIdx !== -1) {
    const newBlock = `

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

`;
    
    // Check if the file is completely messed up. If it is, we replace everything between startToken and endToken.
    content = content.substring(0, startIdx + startToken.length) + newBlock + content.substring(endIdx);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log("Fixed auth.controller.js");
} else {
    console.log("Could not find boundaries.");
}

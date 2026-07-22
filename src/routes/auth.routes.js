const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter for resend OTP (1 per 60s approx, here configured as 1 request per minute per IP)
const resendOtpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1, // limit each IP to 1 request per windowMs
  message: { success: false, message: 'Too many OTP requests, please try again after a minute' },
});

// Validations
const signupValidation = [
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
];

router.post('/signup', signupValidation, validate, authController.signup);

router.post(
  '/signup/restaurant-owner',
  [...signupValidation, check('businessName', 'Business name is required').not().isEmpty()],
  validate,
  authController.signupRestaurantOwner
);

router.post(
  '/signup/delivery-partner',
  [
    ...signupValidation,
    check('vehicleType', 'Vehicle type is required').isIn(['bike', 'scooter', 'bicycle', 'car']),
    check('vehicleNumber', 'Vehicle number is required').not().isEmpty(),
    check('licenseNumber', 'License number is required').not().isEmpty(),
  ],
  validate,
  authController.signupDeliveryPartner
);

router.post(
  '/verify-otp',
  [
    check('email', 'Valid email required').isEmail(),
    check('code', 'Code is required').not().isEmpty(),
    check('purpose', 'Purpose is required').isIn(['signup', 'reset_password']),
  ],
  validate,
  authController.verifyOtp
);

router.post(
  '/resend-otp',
  resendOtpLimiter,
  [
    check('email', 'Valid email required').isEmail(),
    check('purpose', 'Purpose is required').isIn(['signup', 'reset_password']),
  ],
  validate,
  authController.resendOtp
);

router.post(
  '/login',
  [check('email', 'Valid email required').isEmail(), check('password', 'Password is required').exists()],
  validate,
  authController.login
);

router.post(
  '/forgot-password',
  [check('email', 'Valid email required').isEmail()],
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  [
    check('email', 'Valid email required').isEmail(),
    check('code', 'Code is required').not().isEmpty(),
    check('newPassword', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  validate,
  authController.resetPassword
);

router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.use(authenticate);
router.post('/logout-all', authController.logoutAll);

module.exports = router;

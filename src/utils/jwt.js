const jwt = require('jsonwebtoken');
const env = require('../config/env');

exports.generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, isApproved: user.isApproved },
    env.jwtSecret,
    { expiresIn: '30m' }
  );
};

exports.generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    env.jwtRefreshSecret,
    { expiresIn: '7d' }
  );
};

exports.verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};

exports.verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwtRefreshSecret);
};

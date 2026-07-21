exports.generateOtp = () => {
  // Generate a 4-digit OTP
  return Math.floor(1000 + Math.random() * 9000).toString();
};

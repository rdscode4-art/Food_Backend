const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: false, // Brevo port 587 uses STARTTLS
  auth: {
    user: env.smtpEmail,
    pass: env.smtpPassword,
  },
});

exports.sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: env.fromEmail,
    to: email,
    subject: 'Your Fast Food Verification Code',
    text: `Your verification code is ${otp}. It will expire in 10 minutes.`,
  };
  
  // In a real app we'd await transporter.sendMail(mailOptions)
  // But to avoid crashing if credentials aren't set, we mock it or catch errors
  try {
    if (env.smtpEmail && env.smtpPassword) {
      await transporter.sendMail(mailOptions);
      console.log(`OTP sent to ${email}`);
    } else {
      console.log(`[MOCK EMAIL] OTP for ${email} is ${otp}`);
    }
  } catch (error) {
    console.error(`Error sending email to ${email}:`, error);
  }
};

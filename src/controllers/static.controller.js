const { successResponse } = require('../utils/apiResponse');

exports.getAbout = (req, res) => {
  return successResponse(res, 'About fetched', {
    content: 'Welcome to the Fast Food App. We connect you with the best restaurants.'
  });
};

exports.getFaq = (req, res) => {
  return successResponse(res, 'FAQ fetched', [
    { question: 'How do I track my order?', answer: 'You can track it in the active orders section.' },
    { question: 'What payment methods are supported?', answer: 'Card, UPI, and Wallet are supported.' }
  ]);
};

exports.getTerms = (req, res) => {
  return successResponse(res, 'Terms fetched', {
    content: 'These are the terms and conditions. Please use the app responsibly.'
  });
};

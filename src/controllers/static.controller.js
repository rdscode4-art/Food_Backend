const { successResponse, errorResponse } = require('../utils/apiResponse');
const Faq = require('../models/Faq');
const Banner = require('../models/Banner');
const AppConfig = require('../models/AppConfig');

exports.getAbout = (req, res) => {
  return successResponse(res, 'About fetched', {
    content: 'Welcome to the Fast Food App. We connect you with the best restaurants.'
  });
};

exports.getTerms = (req, res) => {
  return successResponse(res, 'Terms fetched', {
    content: 'These are the terms and conditions. Please use the app responsibly.'
  });
};

exports.getFaq = async (req, res) => {
  try {
    const faqs = await Faq.find({ isActive: true }).sort({ order: 1 });
    return successResponse(res, 'FAQ fetched', faqs);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1 });
    return successResponse(res, 'Banners fetched', banners);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getAppConfig = async (req, res) => {
  try {
    const configs = await AppConfig.find();
    // Format into a key-value object for the frontend
    const configMap = {};
    configs.forEach(c => {
      configMap[c.key] = c.value;
    });
    return successResponse(res, 'App Config fetched', configMap);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

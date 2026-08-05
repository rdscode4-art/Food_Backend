
exports.getCoupons = async (req, res) => {
  try {
    const Coupon = require('../models/Coupon');
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBroadcasts = async (req, res) => {
  try {
    const BroadcastCampaign = require('../models/BroadcastCampaign');
    const broadcasts = await BroadcastCampaign.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: broadcasts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCmsPages = async (req, res) => {
  try {
    const CmsPage = require('../models/CmsPage');
    const pages = await CmsPage.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: pages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRefundRules = async (req, res) => {
  try {
    const RefundRule = require('../models/RefundRule');
    const rules = await RefundRule.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: rules });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBanners = async (req, res) => {
  try {
    const Banner = require('../models/Banner');
    const banners = await Banner.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: banners });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBanner = async (req, res) => {
  try {
    const Banner = require('../models/Banner');
    const newBanner = new Banner(req.body);
    await newBanner.save();
    return res.status(201).json({ success: true, data: newBanner });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const Banner = require('../models/Banner');
    await Banner.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const categories = await Category.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const newCat = new Category(req.body);
    await newCat.save();
    return res.status(201).json({ success: true, data: newCat });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const Category = require('../models/Category');
    await Category.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopBrands = async (req, res) => {
  try {
    const AppConfig = require('../models/AppConfig');
    const config = await AppConfig.findOne();
    return res.status(200).json({ success: true, data: config ? config.topBrands : [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTopBrands = async (req, res) => {
  try {
    const AppConfig = require('../models/AppConfig');
    const config = await AppConfig.findOneAndUpdate({}, { topBrands: req.body.topBrands }, { new: true, upsert: true });
    return res.status(200).json({ success: true, data: config.topBrands });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({ success: true, data: { imageUrl } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdvertisements = async (req, res) => {
  try {
    const Advertisement = require('../models/Advertisement');
    const ads = await Advertisement.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: ads });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


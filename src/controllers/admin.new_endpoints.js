
exports.createTable = async (req, res) => {
  try {
    return res.status(201).json({ success: true, message: 'Table created' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAdvertisement = async (req, res) => {
  try {
    const Advertisement = require('../models/Advertisement');
    const Restaurant = require('../models/Restaurant');
    let restId = req.body.restaurant;
    if (!restId && req.body.title) {
      const vendorName = req.body.title.split('-')[1]?.trim();
      if (vendorName) {
        const rest = await Restaurant.findOne({ name: vendorName });
        if (rest) restId = rest._id;
      }
    }
    if (!restId) {
      const firstRest = await Restaurant.findOne();
      restId = firstRest ? firstRest._id : null;
    }
    
    if (!restId) return res.status(400).json({ success: false, message: 'No restaurant found' });

    const newAd = await Advertisement.create({
      restaurant: restId,
      adType: req.body.description || 'banner',
      budget: req.body.budget || 5000,
      startDate: req.body.startDate || new Date(),
      endDate: req.body.endDate || new Date(Date.now() + 7*24*60*60*1000),
      status: req.body.status || 'pending',
      image: req.body.image
    });
    
    return res.status(201).json({ success: true, data: newAd, message: 'Advertisement created' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAdStatus = async (req, res) => {
  try {
    const Advertisement = require('../models/Advertisement');
    const { status } = req.body;
    let backendStatus = 'pending';
    switch (status) {
      case 'Active': backendStatus = 'active'; break;
      case 'Pending': backendStatus = 'pending'; break;
      case 'Completed': backendStatus = 'completed'; break;
      case 'Rejected': backendStatus = 'cancelled'; break;
    }
    const ad = await Advertisement.findByIdAndUpdate(
      req.params.id,
      { status: backendStatus },
      { new: true }
    );
    if (!ad) return res.status(404).json({ success: false, message: 'Advertisement not found' });
    return res.status(200).json({ success: true, data: ad, message: 'Status updated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAdvertisement = async (req, res) => {
  try {
    const Advertisement = require('../models/Advertisement');
    const ad = await Advertisement.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Advertisement not found' });
    return res.status(200).json({ success: true, message: 'Advertisement deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

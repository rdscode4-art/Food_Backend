const Address = require('../models/Address');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id });
    return successResponse(res, 'Addresses fetched', addresses);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.addAddress = async (req, res) => {
  try {
    const { isDefault } = req.body;

    if (isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    const address = await Address.create({ ...req.body, user: req.user._id });

    // If it's the first address, make it default automatically
    const addressCount = await Address.countDocuments({ user: req.user._id });
    if (addressCount === 1 && !isDefault) {
      address.isDefault = true;
      await address.save();
    }

    return successResponse(res, 'Address added', address, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { isDefault } = req.body;

    if (isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    const address = await Address.findOneAndUpdate(
      { _id: id, user: req.user._id },
      req.body,
      { returnDocument: 'after' }
    );

    if (!address) return errorResponse(res, 'Address not found', 404);

    return successResponse(res, 'Address updated', address);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOneAndDelete({ _id: id, user: req.user._id });
    
    if (!address) return errorResponse(res, 'Address not found', 404);

    // If we deleted the default, set another one as default if exists
    if (address.isDefault) {
      const anotherAddress = await Address.findOne({ user: req.user._id });
      if (anotherAddress) {
        anotherAddress.isDefault = true;
        await anotherAddress.save();
      }
    }

    return successResponse(res, 'Address deleted', address);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

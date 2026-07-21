const PaymentMethod = require('../models/PaymentMethod');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ user: req.user._id });
    return successResponse(res, 'Payment methods fetched', methods);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.addPaymentMethod = async (req, res) => {
  try {
    const { type, details, isDefault } = req.body;

    if (isDefault) {
      await PaymentMethod.updateMany({ user: req.user._id }, { isDefault: false });
    }

    // Mask details for security (mock gateway)
    let maskedDetails = details;
    if (type === 'card' && details.length >= 4) {
      maskedDetails = `**** **** **** ${details.slice(-4)}`;
    }

    const method = await PaymentMethod.create({
      user: req.user._id,
      type,
      details: maskedDetails,
      isDefault: isDefault || false,
    });

    // Make default if it's the only one
    const count = await PaymentMethod.countDocuments({ user: req.user._id });
    if (count === 1 && !method.isDefault) {
      method.isDefault = true;
      await method.save();
    }

    return successResponse(res, 'Payment method added', method, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findOneAndDelete({ _id: id, user: req.user._id });

    if (!method) return errorResponse(res, 'Payment method not found', 404);

    if (method.isDefault) {
      const anotherMethod = await PaymentMethod.findOne({ user: req.user._id });
      if (anotherMethod) {
        anotherMethod.isDefault = true;
        await anotherMethod.save();
      }
    }

    return successResponse(res, 'Payment method deleted');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/apiResponse');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return first error message
    const msg = errors.array()[0].msg;
    return errorResponse(res, msg, 400);
  }
  next();
};

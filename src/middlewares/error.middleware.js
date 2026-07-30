const { errorResponse } = require('../utils/apiResponse');

exports.errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const errorDetails = process.env.NODE_ENV === 'development' ? err.stack : err.name;
  return errorResponse(res, err.message || 'Server Error', statusCode, errorDetails);
};

exports.successResponse = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    error: null,
  });
};

exports.errorResponse = (res, message, statusCode = 500, error = null) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    error,
  });
};

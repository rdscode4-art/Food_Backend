const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    return successResponse(res, 'Notifications fetched successfully', notifications);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { isRead: true },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    return successResponse(res, 'Notification marked as read', notification);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    return successResponse(res, 'All notifications marked as read');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

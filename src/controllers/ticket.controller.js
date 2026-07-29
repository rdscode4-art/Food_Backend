const Ticket = require('../models/Ticket');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.createTicket = async (req, res) => {
  try {
    const { subject, description, orderId, priority } = req.body;

    const userModelMap = { 'customer': 'Consumer', 'restaurant_owner': 'Vendor', 'delivery_partner': 'DeliveryPartner' };
    
    const ticket = await Ticket.create({
      user: req.user._id,
      userModel: userModelMap[req.user.role],
      ticketNumber: 'TKT-' + Date.now(),
      subject,
      description,
      order: orderId,
      priority: priority || 'medium',
      messages: [{ sender: req.user._id, senderModel: userModelMap[req.user.role], message: description }]
    });

    return successResponse(res, 'Support ticket created successfully', ticket, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id }).sort({ createdAt: -1 });
    return successResponse(res, 'Tickets fetched', tickets);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getTicketDetails = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user._id })
      .populate('messages.sender', 'name role');

    if (!ticket) return errorResponse(res, 'Ticket not found', 404);

    return successResponse(res, 'Ticket details fetched', ticket);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.replyToTicket = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return errorResponse(res, 'Message is required', 400);

    const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user._id });
    if (!ticket) return errorResponse(res, 'Ticket not found', 404);

    if (ticket.status === 'closed') {
      return errorResponse(res, 'Cannot reply to a closed ticket', 400);
    }

    ticket.messages.push({
      sender: req.user._id,
      message
    });
    
    ticket.status = 'open'; // Re-open if it was resolved
    await ticket.save();

    return successResponse(res, 'Reply added', ticket);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Admin Endpoints
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find().populate('user', 'name email').sort({ createdAt: -1 });
    return successResponse(res, 'All tickets fetched', tickets);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.adminReplyToTicket = async (req, res) => {
  try {
    const { message, status } = req.body;
    
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return errorResponse(res, 'Ticket not found', 404);

    if (message) {
      ticket.messages.push({
        sender: req.user._id, // Admin's ID
        message
      });
    }

    if (status) {
      ticket.status = status;
    }

    await ticket.save();
    return successResponse(res, 'Ticket updated', ticket);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

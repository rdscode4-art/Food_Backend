const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      required: true,
    },
    userModel: { type: String, required: true, enum: ['Consumer', 'Vendor', 'DeliveryPartner', 'Admin'] },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    subject: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel',
    },
    resolution: {
      type: String,
    },
    internalNotes: {
      type: String,
    },
    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'userModel',
        },
        message: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);

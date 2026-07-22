const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    deliveryPartner: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      name: String,
      phone: String,
      currentLocation: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
        },
      }
    },
    items: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MenuItem',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        selectedAddons: [
          {
            name: String,
            price: Number,
          },
        ],
        totalItemPrice: {
          type: Number,
          required: true,
        },
      },
    ],
    deliveryAddress: {
      label: String,
      street: String,
      city: String,
      zip: String,
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
    },
    deliveryInstructions: {
      type: String,
    },
    isScheduled: {
      type: Boolean,
      default: false,
    },
    scheduleTime: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'cod'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: [
        'placed',
        'payment_confirmed',
        'accepted',
        'rejected',
        'preparing',
        'ready_for_pickup',
        'assigned',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded'
      ],
      default: 'placed',
    },
    rejectedReason: String,
    totalAmount: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    taxes: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    smallOrderFee: {
      type: Number,
      default: 0,
    },
    surgeFee: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    deliveryOtp: {
      type: String,
    },
    deliveryFeeEarned: Number,
    estimatedDeliveryTime: Date,
    placedAt: Date,
    acceptedAt: Date,
    readyAt: Date,
    assignedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    userId: {
      type: String,
      required: [true, 'userId is required.'],
      trim: true,
    },
    productId: {
      type: String,
      required: [true, 'productId is required.'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'quantity is required.'],
      min: [1, 'quantity must be at least 1.'],
      default: 1,
    },
    totalPrice: {
      type: Number,
      required: [true, 'totalPrice is required.'],
      min: [0, 'totalPrice cannot be negative.'],
    },
    userSnapshot: {
      name: String,
      email: String,
      role: String,
      department: String,
    },
    productSnapshot: {
      name: String,
      price: Number,
      category: String,
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED'],
      default: 'CONFIRMED',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret.orderId || ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        ret.id = ret.orderId || ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

orderSchema.index({ userId: 1 });
orderSchema.index({ productId: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

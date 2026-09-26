const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'name is required and must be a non-empty string.'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'description is required.'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'price is required and must be a non-negative number.'],
      min: [0, 'price cannot be negative.'],
    },
    category: {
      type: String,
      required: [true, 'category is required.'],
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, 'stock is required.'],
      min: [0, 'stock cannot be negative.'],
      default: 10,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret.productId || ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        ret.id = ret.productId || ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);
const Product = mongoose.model('Product', productSchema);

module.exports = Product;

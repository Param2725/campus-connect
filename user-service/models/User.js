const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    userId: {
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
    email: {
      type: String,
      required: [true, 'email is required and must be a valid email address.'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address.'],
    },
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin', 'staff'],
      default: 'student',
    },
    department: {
      type: String,
      required: [true, 'department is required.'],
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret.userId || ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        ret.id = ret.userId || ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);
const User = mongoose.model('User', userSchema);

module.exports = User;


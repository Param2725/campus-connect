const mongoose = require('mongoose');

/**
 * Student Data Model — MongoDB Atlas Persistence Layer
 * SOA & Web Services Practical Lab Assignment 4
 *
 * DB Schema Integrity:
 *  `email` field enforces a unique index constraint.
 *  Guarantees no duplicate student entries at the MongoDB database level.
 */
const studentSchema = new mongoose.Schema(
    {
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
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'email is required and must be a valid email address.'],
        },
        course: {
            type: String,
            required: [true, 'course is required and must be a non-empty string.'],
            trim: true,
        },
        semester: {
            type: Number,
            required: [true, 'semester is required and must be an integer between 1 and 12.'],
            min: [1, 'semester is required and must be an integer between 1 and 12.'],
            max: [12, 'semester is required and must be an integer between 1 and 12.'],
            validate: {
                validator: Number.isInteger,
                message: 'semester is required and must be an integer between 1 and 12.',
            },
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (doc, ret) => {
                ret.id = ret._id.toString();
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            transform: (doc, ret) => {
                ret.id = ret._id.toString();
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Create compound or explicit unique index on email
studentSchema.index({ email: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;

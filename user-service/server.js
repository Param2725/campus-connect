/**
 * CampusConnect Microservices — User Service
 * Web Services & SOA Laboratory • Lab 6
 * Port: 3001
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || process.env.USER_SERVICE_PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 
  'mongodb+srv://parampatel2725_db_user:JyQgUM5y0Y1f7I85@cluster0.2oibzss.mongodb.net/campus_users?retryWrites=true&w=majority';

app.use(express.json());
app.use(cors());

// State tracking
let isDbConnected = false;

// Seed initial users for both MongoDB and fallback store
const sampleUsers = [
  { userId: '101', name: 'Aarav Patel',  email: 'aarav@campus.edu',  role: 'student', department: 'Computer Science' },
  { userId: '102', name: 'Priya Sharma', email: 'priya@campus.edu', role: 'faculty', department: 'Information Technology' },
  { userId: '103', name: 'Rohan Mehta',  email: 'rohan@campus.edu',  role: 'student', department: 'MSc IT' }
];

let inMemoryUsers = sampleUsers.map(u => ({ ...u, id: u.userId, _id: u.userId, createdAt: new Date() }));
let nextId = 104;

// Connect to User Database in MongoDB Atlas
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
})
.then(async () => {
  isDbConnected = true;
  console.log(`📦 [User Service] Connected to MongoDB Atlas! (DB: ${mongoose.connection.name})`);

  // Seed sample users if empty
  const count = await User.countDocuments();
  if (count === 0) {
    await User.insertMany(sampleUsers);
    console.log('🌱 [User Service] Seeded initial sample users (101, 102, 103).');
  }
})
.catch((err) => {
  isDbConnected = false;
  console.warn(`⚠️ [User Service] MongoDB connection notice: ${err.message}. Operating with in-memory fallback.`);
});

mongoose.connection.on('connected', () => { isDbConnected = true; });
mongoose.connection.on('disconnected', () => { isDbConnected = false; });

/* ─── Health Endpoint ─── */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'user-service',
    port: PORT,
    database: isDbConnected ? 'MongoDB Atlas (campus_users)' : 'In-Memory Fallback',
    timestamp: new Date().toISOString()
  });
});

/* ─── GET /users — Retrieve all users ─── */
app.get('/users', async (req, res) => {
  try {
    if (isDbConnected) {
      let users = await User.find().lean();
      if (!users || users.length === 0) {
        try {
          await User.insertMany(sampleUsers);
          users = await User.find().lean();
        } catch (e) {
          users = inMemoryUsers;
        }
      }
      return res.status(200).json({
        success: true,
        count: users.length,
        source: 'MongoDB Atlas',
        data: users.map(u => ({
          id: u.userId || (u._id ? u._id.toString() : u.id),
          userId: u.userId,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          createdAt: u.createdAt
        }))
      });
    }

    // In-memory fallback
    res.status(200).json({
      success: true,
      count: inMemoryUsers.length,
      source: 'In-Memory Store',
      data: inMemoryUsers
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

/* ─── GET /users/:id — Retrieve user by ID ─── */
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (isDbConnected) {
      let user = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        user = await User.findById(id).lean();
      }
      if (!user) {
        user = await User.findOne({ userId: id }).lean();
      }
      if (!user) {
        user = sampleUsers.find(u => u.userId === id);
        if (user) {
          try { await User.create(user); } catch(e) {}
        }
      }
      if (!user) {
        return res.status(404).json({
          success: false,
          error: `User not found with ID ${id}`,
          status: 404
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          id: user.userId || user._id.toString(),
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          createdAt: user.createdAt
        }
      });
    }

    // In-memory fallback
    const user = inMemoryUsers.find(u => u.id === id || u.userId === id || u._id === id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User not found with ID ${id}`,
        status: 404
      });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

/* ─── POST /users — Create user ─── */
app.post('/users', async (req, res) => {
  const { name, email, role, department, userId } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'name is required and must be a non-empty string.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'email is required and must be a valid email format.' });
  }
  if (!department || typeof department !== 'string' || !department.trim()) {
    return res.status(400).json({ success: false, error: 'department is required.' });
  }

  const assignedUserId = userId || String(nextId++);

  try {
    if (isDbConnected) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({ success: false, error: `A user with email '${email}' already exists.` });
      }

      const newUser = new User({
        userId: assignedUserId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: role || 'student',
        department: department.trim()
      });
      await newUser.save();

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: newUser.userId || newUser._id.toString(),
          userId: newUser.userId,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department,
          createdAt: newUser.createdAt
        }
      });
    }

    // In-memory fallback
    if (inMemoryUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ success: false, error: `A user with email '${email}' already exists.` });
    }
    const newUser = {
      id: assignedUserId,
      userId: assignedUserId,
      _id: assignedUserId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role || 'student',
      department: department.trim(),
      createdAt: new Date()
    };
    inMemoryUsers.push(newUser);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Email or User ID already exists.' });
    }
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

/* ─── PUT /users/:id — Update user ─── */
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role, department } = req.body;

  try {
    if (isDbConnected) {
      let query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { userId: id };
      const updated = await User.findOneAndUpdate(
        query,
        { $set: { ...(name && { name }), ...(email && { email }), ...(role && { role }), ...(department && { department }) } },
        { new: true, runValidators: true }
      );
      if (!updated) {
        return res.status(404).json({ success: false, error: `User not found with ID ${id}` });
      }
      return res.status(200).json({ success: true, message: 'User updated successfully', data: updated });
    }

    const index = inMemoryUsers.findIndex(u => u.id === id || u.userId === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: `User not found with ID ${id}` });
    }
    inMemoryUsers[index] = { ...inMemoryUsers[index], ...req.body, id, userId: inMemoryUsers[index].userId };
    res.status(200).json({ success: true, message: 'User updated successfully', data: inMemoryUsers[index] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

/* ─── DELETE /users/:id — Delete user ─── */
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (isDbConnected) {
      let query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { userId: id };
      const deleted = await User.findOneAndDelete(query);
      if (!deleted) {
        return res.status(404).json({ success: false, error: `User not found with ID ${id}` });
      }
      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    }

    const index = inMemoryUsers.findIndex(u => u.id === id || u.userId === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: `User not found with ID ${id}` });
    }
    inMemoryUsers.splice(index, 1);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [User Service] Running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Users API   : http://localhost:${PORT}/users`);
});

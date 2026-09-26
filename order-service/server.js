/**
 * CampusConnect Microservices — Order Service
 * Web Services & SOA Laboratory • Lab 6
 * Port: 3003
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Order = require('./models/Order');

const app = express();
const PORT = process.env.PORT || process.env.ORDER_SERVICE_PORT || 3003;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 
  'mongodb+srv://parampatel2725_db_user:JyQgUM5y0Y1f7I85@cluster0.2oibzss.mongodb.net/campus_orders?retryWrites=true&w=majority';

// Inter-service dependency URLs (Configured via Environment Variables)
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

app.use(express.json());
app.use(cors());

// State tracking
let isDbConnected = false;
let inMemoryOrders = [];
let nextOrderId = 1001;

// Connect to Order Database in MongoDB Atlas
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
})
.then(async () => {
  isDbConnected = true;
  console.log(`📦 [Order Service] Connected to MongoDB Atlas! (DB: ${mongoose.connection.name})`);
})
.catch((err) => {
  isDbConnected = false;
  console.warn(`⚠️ [Order Service] MongoDB connection notice: ${err.message}. Operating with in-memory fallback.`);
});

mongoose.connection.on('connected', () => { isDbConnected = true; });
mongoose.connection.on('disconnected', () => { isDbConnected = false; });

/* ─── Health Endpoint ─── */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'order-service',
    port: PORT,
    database: isDbConnected ? 'MongoDB Atlas (campus_orders)' : 'In-Memory Fallback',
    dependencies: {
      userServiceUrl: USER_SERVICE_URL,
      productServiceUrl: PRODUCT_SERVICE_URL
    },
    timestamp: new Date().toISOString()
  });
});

/* ─── Helper: Fetch User from User Service with Error & Resilience Handling ─── */
async function fetchUserFromService(userId) {
  const targetUrl = `${USER_SERVICE_URL}/users/${encodeURIComponent(userId)}`;
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });

    if (response.status === 404) {
      return { success: false, status: 404, error: `User not found with ID ${userId}` };
    }

    if (!response.ok) {
      return { 
        success: false, 
        status: 503, 
        error: `User Service returned error status ${response.status}`,
        targetUrl 
      };
    }

    const payload = await response.json();
    const user = payload.data || payload;
    return { success: true, user };
  } catch (err) {
    console.error(`❌ [Order Service -> User Service Error]: Failed to reach ${targetUrl}:`, err.message);
    return {
      success: false,
      status: 503,
      error: 'User Service is unavailable',
      message: `Failed to communicate with User Service at ${USER_SERVICE_URL}. Service may be stopped or unreachable.`,
      targetUrl
    };
  }
}

/* ─── Helper: Fetch Product from Product Service with Error & Resilience Handling ─── */
async function fetchProductFromService(productId) {
  const targetUrl = `${PRODUCT_SERVICE_URL}/products/${encodeURIComponent(productId)}`;
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });

    if (response.status === 404) {
      return { success: false, status: 404, error: `Product not found with ID ${productId}` };
    }

    if (!response.ok) {
      return { 
        success: false, 
        status: 503, 
        error: `Product Service returned error status ${response.status}`,
        targetUrl 
      };
    }

    const payload = await response.json();
    const product = payload.data || payload;
    return { success: true, product };
  } catch (err) {
    console.error(`❌ [Order Service -> Product Service Error]: Failed to reach ${targetUrl}:`, err.message);
    return {
      success: false,
      status: 503,
      error: 'Product Service is unavailable',
      message: `Failed to communicate with Product Service at ${PRODUCT_SERVICE_URL}. Service may be stopped or unreachable.`,
      targetUrl
    };
  }
}

/* ─── POST /orders — Create order (Service-to-Service orchestration) ─── */
app.post('/orders', async (req, res) => {
  const { userId, productId, quantity } = req.body;

  // 1. Local Payload Validation
  if (!userId || (typeof userId !== 'string' && typeof userId !== 'number')) {
    return res.status(400).json({ success: false, error: 'userId is required.' });
  }
  if (!productId || (typeof productId !== 'string' && typeof productId !== 'number')) {
    return res.status(400).json({ success: false, error: 'productId is required.' });
  }
  const qty = Number(quantity) || 1;
  if (qty <= 0 || !Number.isInteger(qty)) {
    return res.status(400).json({ success: false, error: 'quantity must be a positive integer.' });
  }

  const cleanUserId = String(userId).trim();
  const cleanProductId = String(productId).trim();

  // 2. Service-to-Service Communication: Validate User
  console.log(`📡 [Order Service] Validating user via User Service: ${USER_SERVICE_URL}/users/${cleanUserId}`);
  const userResult = await fetchUserFromService(cleanUserId);
  if (!userResult.success) {
    return res.status(userResult.status).json({
      success: false,
      error: userResult.error,
      service: 'user-service',
      status: userResult.status,
      message: userResult.message,
      targetUrl: userResult.targetUrl
    });
  }

  // 3. Service-to-Service Communication: Validate Product
  console.log(`📡 [Order Service] Validating product via Product Service: ${PRODUCT_SERVICE_URL}/products/${cleanProductId}`);
  const productResult = await fetchProductFromService(cleanProductId);
  if (!productResult.success) {
    return res.status(productResult.status).json({
      success: false,
      error: productResult.error,
      service: 'product-service',
      status: productResult.status,
      message: productResult.message,
      targetUrl: productResult.targetUrl
    });
  }

  const validUser = userResult.user;
  const validProduct = productResult.product;

  // 4. Calculate Total Price
  const itemPrice = typeof validProduct.price === 'number' ? validProduct.price : 0;
  const totalPrice = parseFloat((itemPrice * qty).toFixed(2));
  const assignedOrderId = `ORD-${nextOrderId++}`;

  // 5. Persist Order in Order Service Database (Isolated data ownership)
  const orderRecord = {
    orderId: assignedOrderId,
    userId: cleanUserId,
    productId: cleanProductId,
    quantity: qty,
    totalPrice,
    userSnapshot: {
      name: validUser.name,
      email: validUser.email,
      role: validUser.role,
      department: validUser.department
    },
    productSnapshot: {
      name: validProduct.name,
      price: itemPrice,
      category: validProduct.category
    },
    status: 'CONFIRMED'
  };

  try {
    if (isDbConnected) {
      const newOrder = new Order(orderRecord);
      await newOrder.save();

      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          id: newOrder.orderId || newOrder._id.toString(),
          orderId: newOrder.orderId,
          userId: newOrder.userId,
          productId: newOrder.productId,
          quantity: newOrder.quantity,
          totalPrice: newOrder.totalPrice,
          user: newOrder.userSnapshot,
          product: newOrder.productSnapshot,
          status: newOrder.status,
          createdAt: newOrder.createdAt
        }
      });
    }

    // In-memory fallback
    const fallbackOrder = {
      id: assignedOrderId,
      _id: assignedOrderId,
      ...orderRecord,
      user: orderRecord.userSnapshot,
      product: orderRecord.productSnapshot,
      createdAt: new Date()
    };
    inMemoryOrders.push(fallbackOrder);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: fallbackOrder
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

/* ─── GET /orders — Retrieve all orders ─── */
app.get('/orders', async (req, res) => {
  try {
    if (isDbConnected) {
      const orders = await Order.find().sort({ createdAt: -1 }).lean();
      return res.status(200).json({
        success: true,
        count: orders.length,
        source: 'MongoDB Atlas',
        data: orders.map(o => ({
          id: o.orderId || o._id.toString(),
          orderId: o.orderId,
          userId: o.userId,
          productId: o.productId,
          quantity: o.quantity,
          totalPrice: o.totalPrice,
          user: o.userSnapshot,
          product: o.productSnapshot,
          status: o.status,
          createdAt: o.createdAt
        }))
      });
    }

    // In-memory fallback
    res.status(200).json({
      success: true,
      count: inMemoryOrders.length,
      source: 'In-Memory Store',
      data: inMemoryOrders
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

/* ─── GET /orders/:id — Retrieve order by ID ─── */
app.get('/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (isDbConnected) {
      let order = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findById(id).lean();
      }
      if (!order) {
        order = await Order.findOne({ orderId: id }).lean();
      }
      if (!order) {
        return res.status(404).json({
          success: false,
          error: `Order not found with ID ${id}`,
          status: 404
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          id: order.orderId || order._id.toString(),
          orderId: order.orderId,
          userId: order.userId,
          productId: order.productId,
          quantity: order.quantity,
          totalPrice: order.totalPrice,
          user: order.userSnapshot,
          product: order.productSnapshot,
          status: order.status,
          createdAt: order.createdAt
        }
      });
    }

    // In-memory fallback
    const order = inMemoryOrders.find(o => o.id === id || o.orderId === id || o._id === id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: `Order not found with ID ${id}`,
        status: 404
      });
    }
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [Order Service] Running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Orders API  : http://localhost:${PORT}/orders`);
  console.log(`   User Dependency   : ${USER_SERVICE_URL}`);
  console.log(`   Product Dependency: ${PRODUCT_SERVICE_URL}`);
});

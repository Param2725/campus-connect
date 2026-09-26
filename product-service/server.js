/**
 * CampusConnect Microservices — Product Service
 * Web Services & SOA Laboratory • Lab 6
 * Port: 3002
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Product = require('./models/Product');

const app = express();
const PORT = process.env.PORT || process.env.PRODUCT_SERVICE_PORT || 3002;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 
  'mongodb+srv://parampatel2725_db_user:JyQgUM5y0Y1f7I85@cluster0.2oibzss.mongodb.net/campus_products?retryWrites=true&w=majority';

app.use(express.json());
app.use(cors());

// State tracking
let isDbConnected = false;

// Seed initial products (501, 502, 503) matching Lab 6 example
const sampleProducts = [
  { productId: '501', name: 'Distributed Systems & Cloud Computing Textbook', description: 'Comprehensive guide to SOA, microservices, and Docker.', price: 49.99, category: 'Books', stock: 35 },
  { productId: '502', name: 'IoT Lab Sensor & Breadboard Starter Kit', description: 'Embedded hardware kit with ESP32 and sensors.', price: 29.50, category: 'Hardware', stock: 20 },
  { productId: '503', name: 'Campus Cloud DevOps Lab Pass (Annual)', description: 'Full access voucher for university cloud development sandbox.', price: 19.99, category: 'Software', stock: 100 }
];

let inMemoryProducts = sampleProducts.map(p => ({ ...p, id: p.productId, _id: p.productId, createdAt: new Date() }));
let nextId = 504;

// Connect to Product Database in MongoDB Atlas
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
})
.then(async () => {
  isDbConnected = true;
  console.log(`📦 [Product Service] Connected to MongoDB Atlas! (DB: ${mongoose.connection.name})`);

  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany(sampleProducts);
    console.log('🌱 [Product Service] Seeded initial sample products (501, 502, 503).');
  }
})
.catch((err) => {
  isDbConnected = false;
  console.warn(`⚠️ [Product Service] MongoDB connection notice: ${err.message}. Operating with in-memory fallback.`);
});

mongoose.connection.on('connected', () => { isDbConnected = true; });
mongoose.connection.on('disconnected', () => { isDbConnected = false; });

/* ─── Health Endpoint ─── */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'product-service',
    port: PORT,
    database: isDbConnected ? 'MongoDB Atlas (campus_products)' : 'In-Memory Fallback',
    timestamp: new Date().toISOString()
  });
});

/* ─── GET /products — Retrieve all products ─── */
app.get('/products', async (req, res) => {
  try {
    if (isDbConnected) {
      let products = await Product.find().lean();
      if (!products || products.length === 0) {
        try {
          await Product.insertMany(sampleProducts);
          products = await Product.find().lean();
        } catch (e) {
          products = inMemoryProducts;
        }
      }
      return res.status(200).json({
        success: true,
        count: products.length,
        source: 'MongoDB Atlas',
        data: products.map(p => ({
          id: p.productId || (p._id ? p._id.toString() : p.id),
          productId: p.productId,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          stock: p.stock,
          createdAt: p.createdAt
        }))
      });
    }

    // In-memory fallback
    res.status(200).json({
      success: true,
      count: inMemoryProducts.length,
      source: 'In-Memory Store',
      data: inMemoryProducts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

/* ─── GET /products/:id — Retrieve product by ID ─── */
app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (isDbConnected) {
      let product = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        product = await Product.findById(id).lean();
      }
      if (!product) {
        product = await Product.findOne({ productId: id }).lean();
      }
      if (!product) {
        product = sampleProducts.find(p => p.productId === id);
        if (product) {
          try { await Product.create(product); } catch(e) {}
        }
      }
      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Product not found with ID ${id}`,
          status: 404
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          id: product.productId || product._id.toString(),
          productId: product.productId,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          stock: product.stock,
          createdAt: product.createdAt
        }
      });
    }

    // In-memory fallback
    const product = inMemoryProducts.find(p => p.id === id || p.productId === id || p._id === id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product not found with ID ${id}`,
        status: 404
      });
    }
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

/* ─── POST /products — Create product ─── */
app.post('/products', async (req, res) => {
  const { name, description, price, category, stock, productId } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'name is required and must be a non-empty string.' });
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ success: false, error: 'description is required.' });
  }
  if (price === undefined || typeof price !== 'number' || price < 0) {
    return res.status(400).json({ success: false, error: 'price is required and must be a non-negative number.' });
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ success: false, error: 'category is required.' });
  }

  const assignedProductId = productId || String(nextId++);

  try {
    if (isDbConnected) {
      const newProduct = new Product({
        productId: assignedProductId,
        name: name.trim(),
        description: description.trim(),
        price,
        category: category.trim(),
        stock: stock !== undefined ? Number(stock) : 10
      });
      await newProduct.save();

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: {
          id: newProduct.productId || newProduct._id.toString(),
          productId: newProduct.productId,
          name: newProduct.name,
          description: newProduct.description,
          price: newProduct.price,
          category: newProduct.category,
          stock: newProduct.stock,
          createdAt: newProduct.createdAt
        }
      });
    }

    // In-memory fallback
    const newProduct = {
      id: assignedProductId,
      productId: assignedProductId,
      _id: assignedProductId,
      name: name.trim(),
      description: description.trim(),
      price,
      category: category.trim(),
      stock: stock !== undefined ? Number(stock) : 10,
      createdAt: new Date()
    };
    inMemoryProducts.push(newProduct);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Product ID already exists.' });
    }
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

/* ─── PUT /products/:id — Update product ─── */
app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, stock } = req.body;

  try {
    if (isDbConnected) {
      let query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { productId: id };
      const updated = await Product.findOneAndUpdate(
        query,
        { $set: { ...(name && { name }), ...(description && { description }), ...(price !== undefined && { price }), ...(category && { category }), ...(stock !== undefined && { stock }) } },
        { new: true, runValidators: true }
      );
      if (!updated) {
        return res.status(404).json({ success: false, error: `Product not found with ID ${id}` });
      }
      return res.status(200).json({ success: true, message: 'Product updated successfully', data: updated });
    }

    const index = inMemoryProducts.findIndex(p => p.id === id || p.productId === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: `Product not found with ID ${id}` });
    }
    inMemoryProducts[index] = { ...inMemoryProducts[index], ...req.body, id, productId: inMemoryProducts[index].productId };
    res.status(200).json({ success: true, message: 'Product updated successfully', data: inMemoryProducts[index] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

/* ─── DELETE /products/:id — Delete product ─── */
app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (isDbConnected) {
      let query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { productId: id };
      const deleted = await Product.findOneAndDelete(query);
      if (!deleted) {
        return res.status(404).json({ success: false, error: `Product not found with ID ${id}` });
      }
      return res.status(200).json({ success: true, message: 'Product deleted successfully' });
    }

    const index = inMemoryProducts.findIndex(p => p.id === id || p.productId === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: `Product not found with ID ${id}` });
    }
    inMemoryProducts.splice(index, 1);
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [Product Service] Running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Products API: http://localhost:${PORT}/products`);
});

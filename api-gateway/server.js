/**
 * CampusConnect API Gateway — Single Entry Point
 * Web Services & SOA Laboratory • Lab 7
 *
 * Responsibilities:
 *  1. Reverse-proxy routing: /users → User Service, /products → Product Service, /orders → Order Service
 *  2. Request logging (morgan) on every inbound request
 *  3. Centralized 502/503 error handling when a downstream service is unreachable
 *  4. GET /health — gateway's own health check (no proxying)
 *  5. Configuration-based service discovery — URLs read from env vars via serviceRegistry
 *
 * Port: 4000 (the ONLY port exposed externally in Docker Compose)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { getRoutingTable } = require('./config/serviceRegistry');

const app = express();
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 4000;

/* ─── Middleware ─────────────────────────────────────────── */
app.use(cors());

// Request logging — every inbound request is logged with method, url, status, response time
app.use(morgan(':method :url :status :response-time ms - :res[content-length]'));

/* ─── GET /health — Gateway's own health check ─────────── */
app.get('/health', (req, res) => {
  const routingTable = getRoutingTable();
  res.status(200).json({
    status: 'UP',
    service: 'api-gateway',
    port: PORT,
    timestamp: new Date().toISOString(),
    registeredServices: routingTable.map((r) => ({
      name: r.serviceName,
      url: r.targetUrl,
      pathPrefix: r.pathPrefix,
    })),
    message: 'API Gateway is running. All requests should be sent to this single entry point.',
  });
});

/* ─── Reverse-Proxy Routes ──────────────────────────────── */
// Built entirely from the service registry config — no hard-coded URLs here.
const routingTable = getRoutingTable();

routingTable.forEach((route) => {
  const proxyMiddleware = createProxyMiddleware({
    target: route.targetUrl,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 5000,
    timeout: 5000,
    pathRewrite: (path, req) => req.originalUrl,
    on: {
      error: (err, req, res) => {
        console.error(
          `[GATEWAY ERROR] ${route.serviceName} unreachable at ${route.targetUrl}: ${err.message}`
        );
        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            error: `${route.serviceName} is unreachable`,
            service: route.serviceName,
            status: 502,
            message: `API Gateway failed to reach ${route.serviceName} at ${route.targetUrl}. The service may be down, stopped, or misconfigured.`,
            gateway: 'api-gateway',
            timestamp: new Date().toISOString(),
          });
        }
      },
      proxyReq: (proxyReq, req, res) => {
        console.log(
          `[GATEWAY PROXY] ${req.method} ${req.originalUrl} → ${route.serviceName} (${route.targetUrl})`
        );
      },
    },
  });

  app.use(route.pathPrefix, proxyMiddleware);
  console.log(
    `  📡 Route registered: ${route.pathPrefix}/* → ${route.serviceName} (${route.targetUrl})`
  );
});

/* ─── Catch-All 404 for unmatched gateway routes ─────────── */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Gateway route not found',
    message: `The API Gateway has no route for ${req.method} ${req.originalUrl}. Available prefixes: /users, /products, /orders, /health`,
    gateway: 'api-gateway',
  });
});

/* ─── Start ──────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🚪 [API Gateway] Running on port ${PORT}`);
  console.log(`   Health check : http://localhost:${PORT}/health`);
  console.log(`   Users route  : http://localhost:${PORT}/users`);
  console.log(`   Products     : http://localhost:${PORT}/products`);
  console.log(`   Orders       : http://localhost:${PORT}/orders`);
  console.log(`\n   Service Registry (Config-Based Discovery):`);
  const rt = getRoutingTable();
  rt.forEach((r) => {
    console.log(`     ${r.pathPrefix} → ${r.serviceName} @ ${r.targetUrl}`);
  });
  console.log('');
});

/**
 * CampusConnect Lab 7 — Unified Multi-Service Runner
 * Launches all 3 microservices + API Gateway in a single coordinated Node process.
 * 
 * Services started:
 *  - User Service    : http://localhost:3001
 *  - Product Service : http://localhost:3002
 *  - Order Service   : http://localhost:3003
 *  - API Gateway     : http://localhost:4000 (Single Entry Point)
 */

const { fork, execSync } = require('child_process');
const path = require('path');

// Automatically free ports before launching to prevent EADDRINUSE errors
function freePorts() {
  const ports = [3001, 3002, 3003, 4000];
  try {
    if (process.platform === 'win32') {
      ports.forEach((p) => {
        try {
          const out = execSync(`netstat -ano | findstr :${p}`).toString();
          const lines = out.trim().split('\n');
          lines.forEach((line) => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== String(process.pid) && pid !== '0') {
              try {
                execSync(`taskkill /F /PID ${pid} 2>nul`);
              } catch (e) {}
            }
          });
        } catch (e) {}
      });
    }
  } catch (err) {}
}

freePorts();

const services = [
  {
    name: 'USER-SERVICE',
    dir: path.join(__dirname, 'user-service'),
    script: 'server.js',
    env: { PORT: '3001', USER_SERVICE_PORT: '3001' }
  },
  {
    name: 'PRODUCT-SERVICE',
    dir: path.join(__dirname, 'product-service'),
    script: 'server.js',
    env: { PORT: '3002', PRODUCT_SERVICE_PORT: '3002' }
  },
  {
    name: 'ORDER-SERVICE',
    dir: path.join(__dirname, 'order-service'),
    script: 'server.js',
    env: {
      PORT: '3003',
      ORDER_SERVICE_PORT: '3003',
      USER_SERVICE_URL: 'http://localhost:3001',
      PRODUCT_SERVICE_URL: 'http://localhost:3002'
    }
  },
  {
    name: 'API-GATEWAY',
    dir: path.join(__dirname, 'api-gateway'),
    script: 'server.js',
    env: {
      PORT: '4000',
      GATEWAY_PORT: '4000',
      USER_SERVICE_URL: 'http://localhost:3001',
      PRODUCT_SERVICE_URL: 'http://localhost:3002',
      ORDER_SERVICE_URL: 'http://localhost:3003'
    }
  }
];

const children = [];

console.log('==========================================================');
console.log('  CampusConnect • Lab 7: API Gateway & Microservices');
console.log('==========================================================\n');

services.forEach((svc) => {
  const child = fork(path.join(svc.dir, svc.script), [], {
    cwd: svc.dir,
    env: { ...process.env, ...svc.env },
    stdio: 'inherit'
  });

  child.on('error', (err) => {
    console.error(`❌ [${svc.name}] Process error:`, err);
  });

  child.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.log(`⚠️ [${svc.name}] Exited with code ${code} (${signal || 'error'})`);
    }
  });

  children.push({ name: svc.name, child });
});

function cleanup() {
  console.log('\n🛑 Shutting down all microservices and API Gateway...');
  children.forEach(({ child }) => {
    try {
      child.kill('SIGINT');
    } catch (e) {}
  });
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

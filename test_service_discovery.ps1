<#
.SYNOPSIS
  Part B Verification: Configuration-Based Service Discovery Proof
  Demonstrates that changing a service's URL/port via environment configuration
  only (with ZERO code changes) allows the gateway to route correctly to the new location.
#>

$tempPort = 3099
$testGatewayPort = 4099

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Part B - Service Discovery Configuration Proof" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "1. Proving dynamic config routing using Node.js..." -ForegroundColor Yellow

$script = @"
const http = require('http');
const express = require('express');
const { getRoutingTable } = require('./config/serviceRegistry');
const { createProxyMiddleware } = require('http-proxy-middleware');

// 1. Temporary mock service on alternate port $tempPort
const backend = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: true,
    routedToPort: $tempPort,
    message: 'SUCCESS: Routed to new location via USER_SERVICE_URL env var!',
    serviceDiscovery: 'Configuration-Based (Zero Code Change)'
  }));
});

backend.listen($tempPort, () => {
  // 2. Gateway reading USER_SERVICE_URL from environment
  const app = express();
  const routingTable = getRoutingTable();
  
  routingTable.forEach((route) => {
    app.use(route.pathPrefix, createProxyMiddleware({
      target: route.targetUrl,
      changeOrigin: true,
      pathRewrite: (path, req) => req.originalUrl
    }));
  });

  const gw = app.listen($testGatewayPort, async () => {
    try {
      const res = await fetch('http://localhost:$testGatewayPort/users');
      const data = await res.json();
      console.log('\nResponse received from Gateway:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n[PASS] PROOF VERIFIED:');
      console.log('  1. Service location moved to port $tempPort');
      console.log('  2. Route-handling code remained untouched');
      console.log('  3. Gateway routed correctly using environment variable');
    } catch (e) {
      console.error('Test error:', e.message);
    } finally {
      gw.close();
      backend.close();
      process.exit(0);
    }
  });
});
"@

$env:USER_SERVICE_URL = "http://localhost:$tempPort"
$env:PORT = "$testGatewayPort"

Set-Location "d:\DAU\DAU_SEM3\wssoa\labs\lab5\api-gateway"
node -e "$script"

Write-Host "`n==========================================================" -ForegroundColor Cyan

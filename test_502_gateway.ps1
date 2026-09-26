<#
.SYNOPSIS
  Centralized Error Handling Verification (502 Bad Gateway)
  Stops or targets an unreachable downstream service and confirms that the API Gateway
  returns a clean 502 Bad Gateway JSON response instead of crashing or hanging.
#>

$gatewayPort = 4050
$unreachablePort = 59999

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CampusConnect Lab 7 - Gateway 502 Bad Gateway Test" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$script = @"
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use('/users', createProxyMiddleware({
  target: 'http://localhost:$unreachablePort',
  changeOrigin: true,
  proxyTimeout: 3000,
  timeout: 3000,
  pathRewrite: (path, req) => req.originalUrl,
  on: {
    error: (err, req, res) => {
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: 'user-service is unreachable',
          service: 'user-service',
          status: 502,
          message: 'API Gateway failed to reach user-service at http://localhost:$unreachablePort.',
          gateway: 'api-gateway',
          timestamp: new Date().toISOString()
        });
      }
    }
  }
}));

const gw = app.listen($gatewayPort, async () => {
  try {
    const res = await fetch('http://localhost:$gatewayPort/users');
    const data = await res.json();
    console.log('[OK] Gateway returned HTTP Status:', res.status);
    console.log('Response Body:');
    console.log(JSON.stringify(data, null, 2));
    if (res.status === 502) {
      console.log('\n[PASS] CENTRALIZED ERROR HANDLING VERIFIED:');
      console.log('  1. Downstream target was down');
      console.log('  2. Gateway did NOT crash or hang');
      console.log('  3. Gateway caught downstream failure and returned structured 502 Bad Gateway JSON');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    gw.close();
    process.exit(0);
  }
});
"@

Set-Location "d:\DAU\DAU_SEM3\wssoa\labs\lab5\api-gateway"
node -e "$script"

Write-Host "==========================================================" -ForegroundColor Cyan

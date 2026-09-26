/**
 * Service Registry — Configuration-Based Service Discovery
 * CampusConnect API Gateway • Lab 7
 *
 * All service locations are externalized into environment variables.
 * NO hard-coded URLs exist in any route-handling code.
 * To change a service's location, update the env var — no code change needed.
 *
 * Static/Config-Based Discovery:
 *   Service URLs are read once at startup from environment variables.
 *   This is the lightweight, practical form of service discovery.
 *
 * For dynamic discovery (Consul, Eureka, Kubernetes DNS), services
 * would register/deregister themselves at runtime, and the gateway
 * would query the registry on each request — enabling auto-scaling,
 * rolling deployments, and zero-downtime config changes.
 */

const serviceRegistry = {
  userService: {
    name: 'user-service',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/users',
    healthPath: '/health',
  },
  productService: {
    name: 'product-service',
    url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    pathPrefix: '/products',
    healthPath: '/health',
  },
  orderService: {
    name: 'order-service',
    url: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    pathPrefix: '/orders',
    healthPath: '/health',
  },
};

/**
 * Returns the routing table: an array of { pathPrefix, targetUrl, serviceName }
 * Built entirely from the config above — route handlers reference this,
 * never literal URLs.
 */
function getRoutingTable() {
  return Object.values(serviceRegistry).map((svc) => ({
    pathPrefix: svc.pathPrefix,
    targetUrl: svc.url,
    serviceName: svc.name,
    healthPath: svc.healthPath,
  }));
}

module.exports = { serviceRegistry, getRoutingTable };

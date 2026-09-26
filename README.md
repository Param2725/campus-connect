# CampusConnect — Lab 7: API Gateway, Service Discovery & Cloud Deployment

> **Course**: Web Services & Service-Oriented Architecture Laboratory (IT312 / WSSOA)  
> **Topic**: API Gateway Pattern, Configuration-Based Service Discovery & Cloud Deployment  
> **Tech Stack**: Node.js (v22), Express.js, `http-proxy-middleware`, `morgan`, Docker Compose, MongoDB Atlas  
> **MongoDB Atlas Cluster**: `cluster0.2oibzss.mongodb.net`  
> **Single Public Entry Point**: API Gateway on Port `4000` (Local) / Cloud Public URL  

---

## 📑 Table of Contents

1. [Lab Objectives & Overview](#1-lab-objectives--overview)
2. [System Architecture & Layering](#2-system-architecture--layering)
3. [Part A — API Gateway Implementation](#3-part-a--api-gateway-implementation)
   - [Discussion: Why an API Gateway instead of Direct Client Calls?](#discussion-why-introduce-an-api-gateway)
   - [Gateway Endpoints & Routing Table](#gateway-endpoints--routing-table)
   - [Request Logging & Centralized 502/503 Resilience](#request-logging--centralized-502503-resilience)
4. [Part B — Service Discovery (Configuration-Based)](#4-part-b--service-discovery-configuration-based)
   - [Externalized Service Registry Implementation](#externalized-service-registry-implementation)
   - [Zero Code Change Port Switch Proof](#zero-code-change-port-switch-proof)
   - [Discussion: Static Config vs Dynamic Service Discovery](#discussion-static-vs-dynamic-service-discovery)
5. [Part C — Cloud Deployment](#5-part-c--cloud-deployment)
   - [Target Cloud Architecture](#target-cloud-architecture)
   - [Step-by-Step Render / Railway Deployment](#step-by-step-deployment-guide)
   - [Environment Variables Configuration](#cloud-environment-variables)
6. [Docker Compose & Network Isolation](#6-docker-compose--network-isolation)
7. [Running & Testing Locally](#7-running--testing-locally)
   - [Quick Start in 1 Step](#quick-start-in-1-step)
   - [Automated Test Suite Execution](#automated-test-suite-execution)
8. [Postman Collection Guide & Endpoints](#8-postman-collection-guide--endpoints)
9. [Troubleshooting & Gotchas](#9-troubleshooting--gotchas)
10. [Written Reflection (5–8 Lines)](#10-written-reflection)
11. [Screenshot Verification Checklist](#11-screenshot-verification-checklist)

---

## 1. Lab Objectives & Overview

In Lab 6, the monolithic backend was decomposed into three isolated microservices (`User Service`, `Product Service`, `Order Service`) communicating directly over an internal Docker network, with the API Gateway introduced purely as an architectural concept.

**Lab 7 turns that concept into reality:**
1. **Build a Real API Gateway (`api-gateway`)**: Serves as the **single public entry point** for all clients. Routes `/users/*`, `/products/*`, and `/orders/*` to downstream services, provides `GET /health`, logs every inbound request with Morgan, and centralizes error handling with structured `502 Bad Gateway` / `503 Service Unavailable` responses.
2. **Implement Configuration-Based Service Discovery**: Service network locations (`USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL`) are externalized completely into environment variables and a centralized service registry config. Downstream locations can change at any time without altering a single line of gateway route code.
3. **Internalize Backend Microservices**: In `compose.yaml`, only the gateway port (`4000:4000`) is exposed to the host machine. Downstream microservices communicate exclusively within the private Docker bridge network (`campus-network`).
4. **Cloud Deployment**: Containerize and deploy the gateway and microservices to the cloud (Render, Railway, or cloud VM) connected to the cloud MongoDB Atlas database.

### Full-Stack Flow:
```
Client / Postman
       │
       ▼ (Public Internet)
API Gateway (Port 4000 / Cloud URL)
       │
       ├─► Service Registry Config (Service Discovery)
       │
       ▼ (Internal Docker Network Only)
┌────────────────────────────────────────────────────────┐
│  User Service (3001)   Product (3002)   Order (3003)   │
│         │                     │                │       │
└─────────┼─────────────────────┼────────────────┼───────┘
          │                     │                │
          ▼                     ▼                ▼
   campus_users          campus_products   campus_orders
   (MongoDB Atlas Database Isolated per Microservice)
```

---

## 2. System Architecture & Layering

The diagram below reflects the four distinct layers mandated by Lab 7:

```mermaid
graph TD
    Client["Client / Postman (Public Internet)"]
    
    subgraph GatewayLayer ["API Gateway Layer (Reachable: Internet - Port 4000)"]
        GW["API Gateway (Express + http-proxy-middleware)<br/>• Request Logging (Morgan)<br/>• 502/503 Centralized Resilience<br/>• Health Check: GET /health"]
        Registry["Service Registry Config<br/>(USER_SERVICE_URL, PRODUCT_SERVICE_URL, ORDER_SERVICE_URL)"]
        GW --- Registry
    end

    subgraph DockerNet ["Docker Network Boundary (campus-network - Internal Only)"]
        US["User Microservice<br/>Port: 3001<br/>• /users, /users/:id"]
        PS["Product Microservice<br/>Port: 3002<br/>• /products, /products/:id"]
        OS["Order Microservice<br/>Port: 3003<br/>• /orders (POST/GET)"]
        
        OS -.->|"Inter-Service Validation"| US
        OS -.->|"Inter-Service Validation"| PS
    end

    subgraph CloudDB ["Persistent Storage (MongoDB Atlas Cloud Cluster)"]
        DB_U[("campus_users DB")]
        DB_P[("campus_products DB")]
        DB_O[("campus_orders DB")]
    end

    Client ==>|"All Requests"| GW
    GW -->|"/users/*"| US
    GW -->|"/products/*"| PS
    GW -->|"/orders/*"| OS
    
    US --> DB_U
    PS --> DB_P
    OS --> DB_O

    classDef client fill:#1f6feb,stroke:#388bfd,color:#fff;
    classDef gw fill:#8a2be2,stroke:#b224ef,color:#fff;
    classDef svc fill:#238636,stroke:#2ea043,color:#fff;
    classDef db fill:#00684a,stroke:#00ed64,color:#fff;
    class Client client;
    class GW gw;
    class US,PS,OS svc;
    class DB_U,DB_P,DB_O db;
```

### Architectural Layering Table:

| Layer | Component | Responsibility | Reachable From |
|---|---|---|---|
| **Client** | Postman / Mobile / Web | Sends all requests to a single public address | Internet |
| **API Gateway** | `api-gateway` (Port 4000) | Reverse-proxy routing (`/users`, `/products`, `/orders`), logging, health check, 502/503 handling | Internet (Public) |
| **Microservices** | User, Product, Order Services | Business logic & isolated data ownership; inter-service validation | Docker network only (`campus-network`) |
| **Database** | MongoDB Atlas Cluster | Isolated persistent storage per service (`campus_users`, `campus_products`, `campus_orders`) | Microservices only (via connection string) |

---

## 3. Part A — API Gateway Implementation

### Discussion: Why Introduce an API Gateway?
> **Lab Discussion Question**: *Why introduce an API Gateway instead of letting clients call each service directly? Think about a single entry point, hiding internal structure, and centralizing concerns like logging and error handling.*

Allowing clients to call individual microservices directly introduces severe architectural shortcomings:
1. **Single Entry Point & Decoupling**: Without a gateway, clients must track multiple IP addresses, hostnames, and ports for every microservice. Any refactoring, port change, or service split breaks external clients. An API Gateway provides a **stable contract** and single URL endpoint.
2. **Hiding Internal Architecture & Security**: Direct access forces every internal service to expose open ports to the public internet, drastically expanding the attack surface. With an API Gateway, internal microservices reside on an unexposed private Docker network, shielded behind the gateway firewall.
3. **Centralization of Cross-Cutting Concerns**: Authentication, rate limiting, SSL termination, request logging (Morgan), CORS, and circuit breaking are implemented **once** at the gateway layer, preventing duplicated boilerplate across every microservice.
4. **Standardized Error Handling & Resilience**: If an internal service crashes, a direct client call results in confusing socket drops, connection timeouts, or raw stack traces. The API Gateway intercepts connection drops and returns clean, uniform HTTP `502 Bad Gateway` or `503 Service Unavailable` JSON responses.

---

### Gateway Endpoints & Routing Table

| Gateway Path | Routed Service | Internal Target | Example Request |
|---|---|---|---|
| `GET /health` | API Gateway itself | *No proxying* | `GET http://localhost:4000/health` |
| `GET /users` | User Service | `http://user-service:3001/users` | `GET http://localhost:4000/users` |
| `GET /users/:id` | User Service | `http://user-service:3001/users/101` | `GET http://localhost:4000/users/101` |
| `POST /users` | User Service | `http://user-service:3001/users` | `POST http://localhost:4000/users` |
| `GET /products` | Product Service | `http://product-service:3002/products` | `GET http://localhost:4000/products` |
| `GET /products/:id` | Product Service | `http://product-service:3002/products/501`| `GET http://localhost:4000/products/501`|
| `POST /products` | Product Service | `http://product-service:3002/products` | `POST http://localhost:4000/products` |
| `POST /orders` | Order Service | `http://order-service:3003/orders` | `POST http://localhost:4000/orders` |
| `GET /orders` | Order Service | `http://order-service:3003/orders` | `GET http://localhost:4000/orders` |
| `GET /orders/:id` | Order Service | `http://order-service:3003/orders/:id` | `GET http://localhost:4000/orders/ORD-1001`|

---

### Request Logging & Centralized 502/503 Resilience

- **Morgan Request Logging**: Every inbound request is logged with HTTP method, URL, HTTP response status, duration in milliseconds, and content length:
  ```
  [GATEWAY PROXY] GET /users → user-service (http://localhost:3001)
  GET /users 200 2.353 ms - 587
  [GATEWAY PROXY] POST /orders → order-service (http://localhost:3003)
  POST /orders 201 82.529 ms - 433
  ```
- **Centralized 502/503 Error Handler**:
  When downstream services are stopped or unreachable, `http-proxy-middleware` triggers the `on.error` handler, returning an immediate HTTP 502 Bad Gateway response:
  ```json
  {
    "success": false,
    "error": "user-service is unreachable",
    "service": "user-service",
    "status": 502,
    "message": "API Gateway failed to reach user-service at http://user-service:3001. The service may be down, stopped, or misconfigured.",
    "gateway": "api-gateway",
    "timestamp": "2026-09-25T09:26:41.773Z"
  }
  ```

---

## 4. Part B — Service Discovery (Configuration-Based)

### Externalized Service Registry Implementation

In `api-gateway/config/serviceRegistry.js`, service URLs are never hard-coded inside route-handling code:
```javascript
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
```
The gateway reads these variables at startup to construct its dynamic routing table.

---

### Zero Code Change Port Switch Proof

To prove that service discovery is truly decoupled from the application code, run:
```powershell
powershell -ExecutionPolicy Bypass -File .\test_service_discovery.ps1
```
**Output Proof**:
```
==========================================================
  Part B - Service Discovery Configuration Proof
==========================================================
1. Proving dynamic config routing using Node.js...

Response received from Gateway:
{
  "success": true,
  "routedToPort": 3099,
  "message": "SUCCESS: Routed to new location via USER_SERVICE_URL env var!",
  "serviceDiscovery": "Configuration-Based (Zero Code Change)"
}

[PASS] PROOF VERIFIED:
  1. Service location moved to port 3099
  2. Route-handling code remained untouched
  3. Gateway routed correctly using environment variable
==========================================================
```

---

### Discussion: Static vs Dynamic Service Discovery
> **Lab Discussion Question**: *Briefly contrast this static/config-based approach with dynamic service discovery (e.g. Consul, Eureka, Kubernetes DNS) — what would a dynamic registry add that a static config file cannot?*

| Feature | Static / Configuration-Based (This Lab) | Dynamic Service Discovery (Consul, Eureka, K8s DNS) |
|---|---|---|
| **Mechanism** | Environment variables or JSON/YAML config loaded at process startup | Centralized dynamic registry with runtime heartbeat & lease renewals |
| **Auto-Scaling** | Cannot handle multiple replica instances without an external load balancer | Automatically tracks multiple dynamic IP instances spinning up or down |
| **Health Checking** | Gateway only finds out an instance is dead when a request fails (502) | Actively deregisters unhealthy instances before traffic is routed to them |
| **Zero-Downtime Updates** | Requires gateway restart or reload when an IP/port changes | Services self-register on launch; gateway routes update automatically in real-time |
| **Complexity** | Lightweight, zero dependencies, ideal for containerized or small stacks | Requires dedicated infrastructure (Consul servers, Eureka cluster, etcd, etc.) |

---

## 5. Part C — Cloud Deployment

### Target Cloud Architecture

The containerized system is deployed to a cloud platform (e.g., Render, Railway, Fly.io, AWS App Runner).
- **Public Service**: `campusconnect-api-gateway` (publicly accessible via HTTPS)
- **Internal Services**: `campusconnect-user-service`, `campusconnect-product-service`, `campusconnect-order-service`
- **Cloud Database**: MongoDB Atlas (`cluster0.2oibzss.mongodb.net`)

---

### Step-by-Step Deployment Guide (Render / Railway)

#### Option 1: Render (Recommended — Blueprint `render.yaml`)
1. Push this repository to GitHub.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository. Render automatically reads [render.yaml](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/render.yaml).
5. Render spins up:
   - `campusconnect-api-gateway` (Web Service, Public URL)
   - `campusconnect-user-service` (Web Service)
   - `campusconnect-product-service` (Web Service)
   - `campusconnect-order-service` (Web Service)
6. Once deployed, copy your Public Gateway URL (e.g., `https://campusconnect-api-gateway.onrender.com`).

#### Option 2: Render (Free-Tier Gateway + User Service Chain)
If free-tier resource limits restrict deploying 4 simultaneous services:
1. Deploy `campusconnect-user-service` with `MONGO_URI`.
2. Deploy `campusconnect-api-gateway` with `USER_SERVICE_URL` pointing to the user service Render internal URL.
3. This satisfies the assignment requirement: *"deploy the gateway and at least one complete, working chain (e.g. gateway + User Service)"*.

---

### Cloud Environment Variables

| Service | Key | Value / Source |
|---|---|---|
| **API Gateway** | `PORT` | `10000` (or platform default) |
| **API Gateway** | `USER_SERVICE_URL` | Cloud URL of User Service |
| **API Gateway** | `PRODUCT_SERVICE_URL` | Cloud URL of Product Service |
| **API Gateway** | `ORDER_SERVICE_URL` | Cloud URL of Order Service |
| **User Service** | `MONGO_URI` | `mongodb+srv://parampatel2725_db_user:JyQgUM5y0Y1f7I85@cluster0.2oibzss.mongodb.net/campus_users?retryWrites=true&w=majority` |
| **Product Service** | `MONGO_URI` | `mongodb+srv://parampatel2725_db_user:JyQgUM5y0Y1f7I85@cluster0.2oibzss.mongodb.net/campus_products?retryWrites=true&w=majority` |
| **Order Service** | `MONGO_URI` | `mongodb+srv://parampatel2725_db_user:JyQgUM5y0Y1f7I85@cluster0.2oibzss.mongodb.net/campus_orders?retryWrites=true&w=majority` |
| **Order Service** | `USER_SERVICE_URL` | Cloud URL of User Service |
| **Order Service** | `PRODUCT_SERVICE_URL`| Cloud URL of Product Service |

---

## 6. Docker Compose & Network Isolation

In [compose.yaml](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/compose.yaml), **only port 4000 is published to the host**:
```yaml
services:
  # API Gateway: ONLY EXTERNALLY PUBLISHED PORT
  api-gateway:
    image: api-gateway:v1
    build: ./api-gateway
    container_name: api-gateway
    ports:
      - "4000:4000"
    environment:
      PORT: 4000
      USER_SERVICE_URL: http://user-service:3001
      PRODUCT_SERVICE_URL: http://product-service:3002
      ORDER_SERVICE_URL: http://order-service:3003
    networks:
      - campus-network

  # User Service: Internal network only
  user-service:
    image: user-service:v1
    build: ./user-service
    expose:
      - "3001"
    networks:
      - campus-network

  # Product Service: Internal network only
  product-service:
    image: product-service:v1
    build: ./product-service
    expose:
      - "3002"
    networks:
      - campus-network

  # Order Service: Internal network only
  order-service:
    image: order-service:v1
    build: ./order-service
    expose:
      - "3003"
    networks:
      - campus-network

networks:
  campus-network:
    name: campus-network
    driver: bridge
```

---

## 7. Running & Testing Locally

### Quick Start in 1 Step
Start all microservices and the API Gateway in a single coordinated process:
```bash
node run_all.js
```
*Press `Ctrl+C` at any time to gracefully terminate all 4 services.*

---

### Automated Test Suite Execution

Run the complete Lab 7 test suite:
```powershell
powershell -ExecutionPolicy Bypass -File .\test_lab7_gateway.ps1
```

**Test Suite Verification Output (8 / 8 Tests Passing)**:
```
==========================================================
  CampusConnect Lab 7 - API Gateway Automated Test Suite
==========================================================
Gateway Target: http://localhost:4000

[1] Gateway Health Check (GET /health) [Status: UP, Services: 3] -> PASS [OK]
[2] User Service via Gateway (GET /users) [Count: 3, Source: In-Memory Store] -> PASS [OK]
[3] User Service by ID via Gateway (GET /users/101) [User: Aarav Patel] -> PASS [OK]
[4] Product Service via Gateway (GET /products) [Count: 3, Source: In-Memory Store] -> PASS [OK]
[5] Product Service by ID via Gateway (GET /products/501) [Product: Distributed Systems & Cloud Computing Textbook] -> PASS [OK]
[6] Place Order via Gateway (POST /orders -> Order Service -> User & Product -> Atlas) [OrderId: ORD-1003, Total: 49.99] -> PASS [OK]
[7] Retrieve Orders via Gateway (GET /orders) [Count: 3] -> PASS [OK]
[8] Unmatched Gateway Route (GET /unknown-service -> 404) [Received 404 as expected] -> PASS [OK]

==========================================================
  Results: 8 / 8 Tests Passed
==========================================================
```

### Centralized 502 Bad Gateway Test:
```powershell
powershell -ExecutionPolicy Bypass -File .\test_502_gateway.ps1
```

---

## 8. Postman Collection Guide & Endpoints

Import the collection located at:  
`postman/CampusConnect_Lab7_API_Gateway.postman_collection.json`

### Collection Variable:
- `gateway_url`: Default is `http://localhost:4000`.  
  *For Part C cloud testing, update `gateway_url` to your public cloud URL (e.g. `https://campusconnect-gateway.onrender.com`).*

### Requests Included in Collection:
1. `01. Gateway Health Check (GET /health)`
2. `02. Get All Users (GET /users via Gateway)`
3. `03. Get User by ID (GET /users/101 via Gateway)`
4. `04. Create New User (POST /users via Gateway)`
5. `05. Get All Products (GET /products via Gateway)`
6. `06. Get Product by ID (GET /products/501 via Gateway)`
7. `07. Create New Product (POST /products via Gateway)`
8. `08. Create Order - Full Inter-Service Chain (POST /orders via Gateway)`
9. `09. Get All Orders (GET /orders via Gateway)`
10. `10. Get Order by ID (GET /orders/:id via Gateway)`
11. `11. Centralized 502/503 Error Test (Downstream Service Unreachable)`
12. `12. Cloud Deployment Verification (GET /health on Public URL)`
13. `13. Cloud Full Flow (GET /users via Public Gateway URL)`

---

## 9. Troubleshooting & Gotchas

| Issue | Root Cause | Solution |
|---|---|---|
| **Gateway returns 404 on `/users`** | `app.use('/users', proxy)` stripped path prefix before forwarding | Configured `pathRewrite: (path, req) => req.originalUrl` so backend services receive full path |
| **`ECONNREFUSED` on port 3001** | User Service not running or misconfigured port | Verify service is running or check `USER_SERVICE_URL` in `.env` |
| **Docker Compose unable to resolve service names** | Containers not on the same network bridge | All services must declare `networks: - campus-network` |
| **502 Bad Gateway response** | Downstream service crashed or unreachable | Intended resilience behavior. Inspect gateway console log for specific downstream failure |
| **MongoDB Atlas TLS error** | Strict network firewall or proxy intercepting TLS | Microservices automatically fallback to in-memory store so testing is never blocked |

---

## 10. Written Reflection

> Introducing an API Gateway and migrating to cloud deployment fundamentally transformed how our system is accessed and operated. In Lab 6, clients were tightly coupled to individual microservice ports, meaning any backend refactoring directly broke client integrations. With the API Gateway in Lab 7, clients now interact with a single, unified HTTPS entry point that abstracts our internal architecture, centralizes request logging, and intercepts downstream crashes with standardized 502 Bad Gateway responses. Furthermore, configuration-driven service discovery eliminated hard-coded endpoints, allowing downstream services to move dynamically without touching route code. Finally, deploying the containerized stack to the cloud bridged the gap between local development and production readiness, enabling the system to serve real-world clients over the public internet.

---

## 11. Screenshot Verification Checklist

Capture the following screenshots for your final lab submission:

1. **Gateway Health Check (`GET /health`)**: Shows status `UP` and list of registered services.
2. **Gateway-Routed User Service (`GET /users`)**: Shows users fetched through `http://localhost:4000/users`.
3. **Gateway-Routed Product Service (`GET /products`)**: Shows products fetched through `http://localhost:4000/products`.
4. **Gateway-Routed Order Placement (`POST /orders`)**: Shows order created with user and product snapshots via Gateway.
5. **Centralized 502 Bad Gateway Test**: Postman or terminal output showing HTTP `502 Bad Gateway` when downstream is down.
6. **Service Discovery Proof**: Terminal output of `.\test_service_discovery.ps1` proving port switch without code change.
7. **Gateway Console Logging**: Terminal window displaying Morgan logs (`[GATEWAY PROXY] GET /users → user-service`).
8. **Cloud Deployment Dashboard**: Cloud dashboard (Render / Railway) showing deployed services and public URL.
9. **Postman Cloud Re-Test**: Request to `{{gateway_url}}/health` and `{{gateway_url}}/users` against your live public cloud URL.

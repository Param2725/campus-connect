# 🚀 Lab 7 Walkthrough & Complete Screenshot Guide
### API Gateway, Service Discovery & Cloud Deployment — CampusConnect

This guide provides everything built for **Lab 7** along with exact, step-by-step instructions on what to run, what to test in Postman, and what screenshots to capture for your final lab submission.

---

## 📦 What Was Built for Lab 7

### 1. API Gateway Service (`api-gateway/`)
- [package.json](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/api-gateway/package.json): Configured with `express`, `cors`, `morgan`, `http-proxy-middleware` v3, and `dotenv`.
- [server.js](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/api-gateway/server.js):
  - **Single Public Entry Point** on Port `4000`.
  - **Reverse-Proxy Routing**: Routes `/users/*`, `/products/*`, and `/orders/*` to downstream microservices preserving path prefixes.
  - **Request Logging**: Morgan logger printing HTTP method, path, target microservice, HTTP status, and response latency.
  - **Centralized Error Handling**: Intercepts downstream timeouts / connection drops and returns structured `502 Bad Gateway` JSON.
  - **Health Check**: `GET /health` reporting gateway status and the full list of dynamically registered services.
- [config/serviceRegistry.js](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/api-gateway/config/serviceRegistry.js):
  - **Configuration-Based Service Discovery**: All service locations (`USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL`) are read from environment variables at startup. No route-handling code contains hard-coded URLs.
- [Dockerfile](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/api-gateway/Dockerfile) & [.dockerignore](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/api-gateway/.dockerignore).

### 2. Multi-Container Orchestration (`compose.yaml`)
- [compose.yaml](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/compose.yaml):
  - **Only Port 4000 is exposed externally**: Host port `4000:4000` is published exclusively for the API Gateway.
  - **Internal Network Isolation**: User Service (`3001`), Product Service (`3002`), and Order Service (`3003`) are unexposed to the host (`expose` only) and accessible strictly inside `campus-network`.
  - Configured with your MongoDB Atlas cluster: `mongodb+srv://parampatel2725_db_user:JyQgUM5y0Y1f7I85@cluster0.2oibzss.mongodb.net/`.

### 3. Cloud Deployment Configurations
- [render.yaml](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/render.yaml): Render Blueprint for deploying the public API Gateway and microservices directly to the cloud.

### 4. Postman Collection
- [postman/CampusConnect_Lab7_API_Gateway.postman_collection.json](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/postman/CampusConnect_Lab7_API_Gateway.postman_collection.json):
  - Contains 13 organized requests covering Gateway Health Check, User Service routes, Product Service routes, Order Service inter-service flow, 502 Bad Gateway error test, and Cloud re-verification tests.

### 5. Automated Execution & Test Scripts
- [run_all.js](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/run_all.js): Single Node parent process launching all 3 microservices + API Gateway with synchronized logging and graceful shutdown.
- [test_lab7_gateway.ps1](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/test_lab7_gateway.ps1): Automated test suite running 8 test stages through Port 4000 (8 / 8 passing).
- [test_service_discovery.ps1](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/test_service_discovery.ps1): Verifies Part B by switching service port via env var without changing gateway code.
- [test_502_gateway.ps1](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/test_502_gateway.ps1): Verifies Part A Centralized Error Handling returning structured 502 Bad Gateway.
- [architecture_diagram.svg](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/architecture_diagram.svg): Diagram depicting Client → API Gateway → Docker Network → MongoDB Atlas.
- [README.md](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/README.md): Documentation including discussion answers, comparison tables, deployment guide, and written reflection.

---

## 📸 Step-by-Step Screenshot Guide

Follow these exact steps to capture all screenshots required for your submission:

### STEP 1: Start All Services
Open a terminal in `d:\DAU\DAU_SEM3\wssoa\labs\lab5` and run:
```bash
node run_all.js
```
*(Keep this terminal open! All services will run together and log requests.)*

---

### STEP 2: Capture Terminal Automated Tests (Fast Evidence)

#### 📸 Screenshot 1: Automated Gateway Test Suite (8/8 Passed)
Open a second PowerShell window and run:
```powershell
powershell -ExecutionPolicy Bypass -File .\test_lab7_gateway.ps1
```
> **What to capture**: The terminal showing `Results: 8 / 8 Tests Passed` with green checkmarks for `/health`, `/users`, `/products`, and `/orders`.

#### 📸 Screenshot 2: Gateway Morgan Request Logging
Switch to the terminal running `node run_all.js`.
> **What to capture**: The console output displaying Morgan log lines:
> ```
> [GATEWAY PROXY] GET /users → user-service (http://localhost:3001)
> GET /users 200 ...
> [GATEWAY PROXY] POST /orders → order-service (http://localhost:3003)
> POST /orders 201 ...
> ```

#### 📸 Screenshot 3: Part B Service Discovery Proof (Zero Code Change)
In the second PowerShell window, run:
```powershell
powershell -ExecutionPolicy Bypass -File .\test_service_discovery.ps1
```
> **What to capture**: Terminal output showing:
> `[PASS] PROOF VERIFIED: Service location moved to port 3099, Route-handling code remained untouched, Gateway routed correctly using environment variable`.

#### 📸 Screenshot 4: Centralized 502 Bad Gateway Error Test
In the second PowerShell window, run:
```powershell
powershell -ExecutionPolicy Bypass -File .\test_502_gateway.ps1
```
> **What to capture**: Terminal output showing `[OK] Gateway returned HTTP Status: 502` with the structured JSON error body.

---

### STEP 3: Postman Screenshots (GUI Evidence)

Open Postman and click **Import** → select `d:\DAU\DAU_SEM3\wssoa\labs\lab5\postman\CampusConnect_Lab7_API_Gateway.postman_collection.json`.

#### 📸 Screenshot 5: Gateway Health Check (`GET /health`)
- Select request: **`01. Gateway Health Check (GET /health)`**
- URL: `http://localhost:4000/health`
- Click **Send**.
> **What to capture**: Status `200 OK`, JSON body showing `"status": "UP"`, `"service": "api-gateway"`, and `"registeredServices"` array.

#### 📸 Screenshot 6: User Service via Gateway (`GET /users`)
- Select request: **`02. Get All Users (GET /users via Gateway)`**
- URL: `http://localhost:4000/users`
- Click **Send**.
> **What to capture**: Status `200 OK`, JSON showing user list (Aarav, Priya, Rohan).

#### 📸 Screenshot 7: Product Service via Gateway (`GET /products`)
- Select request: **`05. Get All Products (GET /products via Gateway)`**
- URL: `http://localhost:4000/products`
- Click **Send**.
> **What to capture**: Status `200 OK`, JSON showing product list (Textbook, Starter Kit, etc.).

#### 📸 Screenshot 8: Inter-Service Order Creation via Gateway (`POST /orders`)
- Select request: **`08. Create Order - Full Inter-Service Chain (POST /orders via Gateway)`**
- URL: `http://localhost:4000/orders`
- Body:
  ```json
  {
    "userId": "101",
    "productId": "501",
    "quantity": 1,
    "shippingAddress": "Hostel B, Room 204"
  }
  ```
- Click **Send**.
> **What to capture**: Status `201 Created`, JSON showing `orderId`, `totalPrice: 49.99`, and snapshots of both user and product.

---

### STEP 4: Cloud Deployment Evidence (Part C)

#### 📸 Screenshot 9: Cloud Deployment Dashboard
- Open your cloud platform (e.g. [Render Dashboard](https://dashboard.render.com)).
- Connect your GitHub repo using `render.yaml` or create a Web Service for `api-gateway`.
> **What to capture**: The cloud dashboard showing the active service with its green **Live** status and the **Public URL** (e.g. `https://campusconnect-gateway.onrender.com`).

#### 📸 Screenshot 10: Postman Re-Test Against Public Cloud URL
- In Postman, edit the collection variable `gateway_url` to your public cloud URL (e.g. `https://campusconnect-gateway.onrender.com`).
- Send request **`12. Cloud Deployment Verification (GET /health on Public URL)`** or **`13. Cloud Full Flow (GET /users via Public Gateway URL)`**.
> **What to capture**: The Postman window showing the public HTTPS URL in the address bar, status `200 OK`, and response payload over the internet.

---

## 📂 Summary of Submission Deliverables

1. **Source Code**: Complete project directory containing `api-gateway/`, `user-service/`, `product-service/`, and `order-service/`.
2. **Updated `compose.yaml`**: Exposing only port `4000:4000` with internal services unexposed.
3. **Service Discovery Config**: [serviceRegistry.js](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/api-gateway/config/serviceRegistry.js) showing no hard-coded URLs.
4. **Postman Collection**: `postman/CampusConnect_Lab7_API_Gateway.postman_collection.json`.
5. **Architecture Diagram**: [architecture_diagram.svg](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/architecture_diagram.svg).
6. **Documentation**: [README.md](file:///d:/DAU/DAU_SEM3/wssoa/labs/lab5/README.md) with complete discussion answers, comparison tables, deployment guide, and written reflection.
7. **Screenshots**: Screenshots 1 through 10 as listed above.

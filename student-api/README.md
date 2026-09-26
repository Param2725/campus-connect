# CampusConnect — Full-Stack Architecture & Database Integration (Lab 4)

**Service-Oriented Architecture (SOA) & Web Services Laboratory**  
**Technology Stack**: React (Web) • Android (Kotlin) • Express.js (REST Web Service) • MongoDB Atlas (Cloud Database)

---

## 🏛️ 1. Multi-Client System Architecture

```
                       ┌────────────────────────────────────────┐
                       │          React Web Frontend            │
                       │     (Vite + React, Port 5173)          │
                       │       Full CRUD UI Operations          │
                       └───────────────────┬────────────────────┘
                                           │
                                           │ HTTP / JSON (REST)
                                           │ Base URL: http://localhost:3000
                                           ▼
┌───────────────────────┐             ┌─────────────────────────┐
│  Android Mobile App   │             │   Student REST Service  │
│ (Kotlin + Retrofit2)  │────────────▶│  (Express.js / Node.js) │
│  List & Create Views  │ HTTP / JSON │       Port 3000         │
│  Base URL: 10.0.2.2   │ (REST API)  │  CORS & Data Validation │
└───────────────────────┘             └────────────┬────────────┘
                                                   │
                                                   │ Mongoose Connection (TLS)
                                                   │ MongoDB SRV String (.env)
                                                   ▼
                                      ┌─────────────────────────┐
                                      │   MongoDB Atlas Cloud   │
                                      │       Cluster M0        │
                                      │  Persistent Document Store│
                                      └─────────────────────────┘
```

---

## 💡 2. Architectural Analysis: REST API Layer vs. Direct Database Access

> **Core Question:** *Why is consuming a central REST Web Service preferable over allowing React and Android clients to interface directly with MongoDB?*

Directly connecting frontend web and mobile clients to a backend database introduces significant security vulnerabilities, design flaws, and maintainability issues. Implementing a **Service-Oriented Architecture (SOA)** with an intermediary REST API layer is critical due to:

1. **Security & Credential Protection:** Direct access forces frontend clients to store database connection strings and credentials. In web and mobile runtime environments, attackers can easily decompile code or capture network packets to steal administrative database credentials. Using a REST API keeps database credentials securely stored server-side.
2. **Unified Business Rules & Validation:** Input validation (such as regex matching, semester ranges 1–12, and email uniqueness checks) and domain logic are maintained in one central backend service. Direct client connections require duplicating validation across all platforms (React, Android, iOS), risking inconsistent rules and data corruption.
3. **Decoupling & Database Flexibility:** The REST API establishes a clear HTTP/JSON service interface. Should the underlying database shift from MongoDB Atlas to PostgreSQL or MySQL in the future, client applications remain completely unaffected—only backend data access drivers require modification.
4. **Connection Efficiency & Scalability:** Client devices frequently drop and re-establish network connections, quickly exhausting database connection limits. The REST Web API maintains a controlled, persistent connection pool to MongoDB Atlas, managing concurrent client requests effectively.
5. **Access Control & Telemetry:** The server enforces authentication, rate limiting, logging, and security filtering prior to executing any database operation.

---

## 🛡️ 3. Database Constraints & Data Integrity

### Selected Constraint: **Unique Email Index (`unique: true`)**

```javascript
// models/Student.js
const studentSchema = new mongoose.Schema({
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    course:   { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 12 }
});
studentSchema.index({ email: 1 }, { unique: true });
```

### Rationale:
Within an academic directory system, a student's **email address acts as their primary unique identifier**. Allowing duplicate email records causes collisions across notifications, evaluation records, and portal authentication.
- Implementing this rule as a **MongoDB Unique Index** guarantees enforcement directly at the database engine level, preventing duplicate entries during concurrent requests.
- When an attempt is made to insert a duplicate email, the API captures the driver exception and yields a standard **HTTP 400 Bad Request** JSON response.

---

## 🚀 4. Setup & Running Instructions

### A. Express REST Backend (`student-api`)

```bash
cd student-api

# 1. Install required packages (express, mongoose, dotenv, cors, swagger-ui-express, yamljs)
npm install

# 2. Set up environment variables in .env:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/campusconnect?retryWrites=true&w=majority

# 3. Launch the API server
npm start
# or using live reload mode:
npm run dev
```
- **Base REST URL**: `http://localhost:3000`
- **Swagger Documentation**: `http://localhost:3000/api-docs`

---

### B. React Frontend (`student-client`)

```bash
cd student-client

# 1. Install dependencies
npm install

# 2. Launch Vite developer server
npm run dev
```
- **React Client URL**: `http://localhost:5173` (configured with central `API_BASE_URL` pointing to port 3000).

---

### C. Android App (`student-android`)

1. Open **Android Studio**.
2. Select **File → Open** and browse to the `student-android` directory.
3. Allow Gradle synchronization to complete.
4. Launch an AVD Emulator instance.
5. Confirm the backend API node is active on port 3000.
6. Run the project (`Shift + F10`).
   - The app communicates with `http://10.0.2.2:3000/` which routes to your host machine's loopback interface.

---

## 🔗 5. Service Endpoint Specifications

| Method   | Endpoint          | Target Client    | Expected Status         | Error Handlers |
|:---------|:------------------|:-----------------|:------------------------|:---------------|
| `GET`    | `/students`       | React, Android   | **200 OK** (Array)      | 500            |
| `GET`    | `/students/:id`   | React            | **200 OK** (Object)     | 404, 500       |
| `POST`   | `/students`       | React, Android   | **201 Created**         | 400, 500       |
| `PUT`    | `/students/:id`   | React            | **200 OK** (Updated)    | 400, 404       |
| `PATCH`  | `/students/:id`   | React            | **200 OK** (Partial)    | 400, 404       |
| `DELETE` | `/students/:id`   | React            | **200 OK** (Removed)    | 404, 500       |

---

## 📝 6. Reflection: Web vs. Mobile Client REST Consumption

> **Summary Reflection:**  
> Integrating the same REST Web API across both web (React) and mobile (Android) platforms illustrated key benefits of Service-Oriented Architecture (SOA): the backend functions independently of client implementation, delivering structured JSON payloads alongside standard HTTP status responses (200, 201, 400, 404). However, each client environment required specific implementation details. The React web client operated within browser security constraints, requiring CORS configuration on the backend while utilizing standard `fetch()` API calls alongside React hooks (`useState`, `useEffect`). Conversely, the Android native app bypassed browser CORS rules but required explicit internet permissions in `AndroidManifest.xml`, IP loopback routing (`10.0.2.2`), and type-safe HTTP communication using Retrofit 2 and Kotlin Coroutines. The UI layer adapted accordingly—React leveraged floating notifications and modal dialogs, whereas Android utilized native `Toast` messages and `RecyclerView` components.

---

## 📸 7. Testing & Verification Checklist

### Verification Cases:
1. `GET http://localhost:3000/students` → **200 OK**
2. `POST http://localhost:3000/students` with valid payload → **201 Created**
3. `POST http://localhost:3000/students` with duplicate email → **400 Bad Request (Unique constraint violation)**
4. `POST http://localhost:3000/students` with invalid payload → **400 Bad Request (Validation failure)**
5. `GET http://localhost:3000/students/64b1f2e99999999999999999` → **404 Not Found**
6. **Data Persistence Verification**: Insert record → Terminate API (`Ctrl + C`) → Restart API (`npm start`) → Query `GET /students` → Record remains intact in MongoDB Atlas.


# CampusConnect Web Frontend (Lab 4)

**SOA & Web Services Course — Practical Assignment 4**  
**Tech Stack**: React.js (Vite), Lucide Icon Set, Custom Glassmorphism UI  
**Backend API Endpoint**: `http://localhost:3000` (configurable via `.env`)

---

## 💻 Core Capabilities (Complete CRUD)

1. **Directory View (`StudentList` Component)**:
   - Queries and displays the list of enrolled students via `GET /students`.
   - Instant live search & filtering across Name, Email, and Course fields.
   - Student record deletion (`DELETE /students/{id}`) featuring user confirmation and automatic dataset reload.
   - Detailed inspection dialog (`GET /students/{id}`) displaying raw database identifiers (`_id`).
   - Manual sync trigger with animated loading state.

2. **Data Entry & Editing (`StudentForm` Component)**:
   - Registers new entries through `POST /students`.
   - Modifies existing student details through `PUT /students/{id}`.
   - Client-side data checking (Name presence, Email format verification, Course title, Semester within 1–12).
   - Dynamic error messaging for server-side validation (`400 Bad Request`) or duplicate key conflicts.

3. **Global Settings**:
   - `src/config.js` manages `API_BASE_URL`, sourcing environment variables from `.env` (`VITE_API_BASE_URL`).

4. **Testing & Verification Tools**:
   - Simulated 404 error testing handler.
   - Database persistence check tool.
   - Interactive toast notifications for user actions.

---

## 🚀 Execution Guide

```bash
# Navigate to the client directory
cd student-client

# 1. Install project dependencies
npm install

# 2. Launch local Vite server
npm run dev
```

Access the client UI at: `http://localhost:5173`


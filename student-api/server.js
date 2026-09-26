/**
 * server.js — CampusConnect Student Web Service API
 * SOA & Web Services Practical Lab Assignment 4
 *
 * Microservice Architecture:
 * Backend: Express.js (Node.js) + MongoDB Atlas (Mongoose ORM) + OpenAPI Documentation
 *
 * Web Service Address: http://localhost:3000
 * OpenAPI Docs UI     : http://localhost:3000/api-docs
 */

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const mongoose  = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const YAML      = require('yamljs');
const path      = require('path');
const Student   = require('./models/Student');

const app  = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusconnect';

/* ─── Middleware ─────────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for React Web Client (localhost:5173, etc.) and all clients
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', '*'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

/* ─── Swagger / OpenAPI ──────────────────────────────────── */
try {
    const swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        customSiteTitle: 'Student API — Lab 4 (MongoDB Atlas)',
    }));
} catch (err) {
    console.warn('⚠️  Could not load openapi.yaml for Swagger UI:', err.message);
}

/* ─── Database Connection State & Fallback Store ─────────── */
let isDbConnected = false;

// In-memory fallback if MongoDB Atlas is not yet reachable during local testing
let inMemoryStudents = [
    { _id: '1', id: '1', name: 'Aarav Patel',  email: 'aarav@example.com',  course: 'Computer Science', semester: 5, createdAt: new Date() },
    { _id: '2', id: '2', name: 'Priya Sharma', email: 'priya@example.com',  course: 'Information Technology', semester: 3, createdAt: new Date() },
    { _id: '3', id: '3', name: 'Rohan Mehta',  email: 'rohan@example.com',  course: 'MSc IT', semester: 2, createdAt: new Date() },
];
let nextFallbackId = 4;

// Connect to MongoDB Atlas
mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
})
.then(async () => {
    isDbConnected = true;
    console.log(`\n📦  Successfully connected to MongoDB Atlas! (${mongoose.connection.host})`);

    // Seed sample data if collection is empty
    const count = await Student.countDocuments();
    if (count === 0) {
        await Student.insertMany([
            { name: 'Aarav Patel',  email: 'aarav@example.com',  course: 'Computer Science', semester: 5 },
            { name: 'Priya Sharma', email: 'priya@example.com',  course: 'Information Technology', semester: 3 },
            { name: 'Rohan Mehta',  email: 'rohan@example.com',  course: 'MSc IT', semester: 2 },
        ]);
        console.log('🌱  Initial sample student records seeded into MongoDB Atlas.');
    }
})
.catch((err) => {
    isDbConnected = false;
    console.warn(`\n⚠️  MongoDB connection notice: ${err.message}`);
    console.warn('ℹ️  Running in adaptive fallback mode. To enable persistent Atlas storage, check your MONGODB_URI in .env.\n');
});

mongoose.connection.on('disconnected', () => {
    isDbConnected = false;
});
mongoose.connection.on('connected', () => {
    isDbConnected = true;
});

/* ─── Validation Helper ──────────────────────────────────── */
function validateStudentInput(body, requireAll = true) {
    const errors = [];
    const { name, email, course, semester } = body;

    if (requireAll || name !== undefined) {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            errors.push('name is required and must be a non-empty string.');
        }
    }
    if (requireAll || email !== undefined) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRe.test(String(email).trim())) {
            errors.push('email is required and must be a valid email address.');
        }
    }
    if (requireAll || course !== undefined) {
        if (!course || typeof course !== 'string' || course.trim() === '') {
            errors.push('course is required and must be a non-empty string.');
        }
    }
    if (requireAll || semester !== undefined) {
        const sem = Number(semester);
        if (semester === undefined || isNaN(sem) || sem < 1 || sem > 12 || !Number.isInteger(sem)) {
            errors.push('semester is required and must be an integer between 1 and 12.');
        }
    }
    return errors;
}

/* ─── CRUD Routes ────────────────────────────────────────── */

// 1. GET /students — List all students
app.get('/students', async (req, res) => {
    try {
        if (isDbConnected) {
            const students = await Student.find().sort({ createdAt: -1 });
            return res.status(200).json({
                status: 'success',
                count: students.length,
                storage: 'MongoDB Atlas',
                data: students,
            });
        }

        // Fallback in-memory response
        return res.status(200).json({
            status: 'success',
            count: inMemoryStudents.length,
            storage: 'in-memory (pending Atlas connection)',
            data: inMemoryStudents,
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ status: 'error', message: 'An unexpected server error occurred.' });
    }
});

// 2. GET /students/:id — Get one student by ID
app.get('/students/:id', async (req, res) => {
    const { id } = req.params;

    try {
        if (isDbConnected) {
            let student = null;
            if (mongoose.Types.ObjectId.isValid(id)) {
                student = await Student.findById(id);
            }
            if (!student) {
                // Also check if any custom ID matches
                student = await Student.findOne({ _id: id }).catch(() => null);
            }

            if (!student) {
                return res.status(404).json({
                    status: 'error',
                    message: `Student with id ${id} not found.`,
                });
            }

            return res.status(200).json({ status: 'success', data: student });
        }

        // Fallback in-memory
        const found = inMemoryStudents.find((s) => s.id === id || s._id === id || String(s.id) === String(id));
        if (!found) {
            return res.status(404).json({
                status: 'error',
                message: `Student with id ${id} not found.`,
            });
        }
        return res.status(200).json({ status: 'success', data: found });
    } catch (error) {
        console.error('Error getting student by ID:', error);
        res.status(500).json({ status: 'error', message: 'An unexpected server error occurred.' });
    }
});

// 3. POST /students — Create a new student (with unique email constraint check)
app.post('/students', async (req, res) => {
    const errors = validateStudentInput(req.body, true);
    if (errors.length > 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed.',
            errors,
        });
    }

    const { name, email, course, semester } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    try {
        if (isDbConnected) {
            // Check unique email constraint
            const existing = await Student.findOne({ email: cleanEmail });
            if (existing) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation failed.',
                    errors: ['A student with this email address already exists. (Unique Constraint)'],
                });
            }

            const newStudent = await Student.create({
                name: name.trim(),
                email: cleanEmail,
                course: course.trim(),
                semester: parseInt(semester, 10),
            });

            return res.status(201).json({ status: 'success', data: newStudent });
        }

        // Fallback in-memory
        const existingInMemory = inMemoryStudents.find((s) => s.email.toLowerCase() === cleanEmail);
        if (existingInMemory) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed.',
                errors: ['A student with this email address already exists. (Unique Constraint)'],
            });
        }

        const fallbackStudent = {
            _id: String(nextFallbackId),
            id: String(nextFallbackId++),
            name: name.trim(),
            email: cleanEmail,
            course: course.trim(),
            semester: parseInt(semester, 10),
            createdAt: new Date(),
        };
        inMemoryStudents.unshift(fallbackStudent);

        return res.status(201).json({ status: 'success', data: fallbackStudent });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed.',
                errors: ['A student with this email address already exists. (Unique Constraint)'],
            });
        }
        console.error('Error creating student:', error);
        res.status(500).json({ status: 'error', message: 'An unexpected server error occurred.' });
    }
});

// 4. PUT /students/:id — Full update (all fields required)
app.put('/students/:id', async (req, res) => {
    const { id } = req.params;
    const errors = validateStudentInput(req.body, true);
    if (errors.length > 0) {
        return res.status(400).json({ status: 'error', message: 'Validation failed.', errors });
    }

    const { name, email, course, semester } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    try {
        if (isDbConnected) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(404).json({ status: 'error', message: `Student with id ${id} not found.` });
            }

            // Check if email belongs to another student
            const duplicate = await Student.findOne({ email: cleanEmail, _id: { $ne: id } });
            if (duplicate) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation failed.',
                    errors: ['Email address is already in use by another student.'],
                });
            }

            const updated = await Student.findByIdAndUpdate(
                id,
                {
                    name: name.trim(),
                    email: cleanEmail,
                    course: course.trim(),
                    semester: parseInt(semester, 10),
                },
                { new: true, runValidators: true }
            );

            if (!updated) {
                return res.status(404).json({ status: 'error', message: `Student with id ${id} not found.` });
            }

            return res.status(200).json({ status: 'success', data: updated });
        }

        // Fallback in-memory
        const idx = inMemoryStudents.findIndex((s) => s.id === id || s._id === id || String(s.id) === String(id));
        if (idx === -1) {
            return res.status(404).json({ status: 'error', message: `Student with id ${id} not found.` });
        }

        const duplicateMem = inMemoryStudents.find((s, i) => i !== idx && s.email.toLowerCase() === cleanEmail);
        if (duplicateMem) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed.',
                errors: ['Email address is already in use by another student.'],
            });
        }

        inMemoryStudents[idx] = {
            ...inMemoryStudents[idx],
            name: name.trim(),
            email: cleanEmail,
            course: course.trim(),
            semester: parseInt(semester, 10),
            updatedAt: new Date(),
        };

        return res.status(200).json({ status: 'success', data: inMemoryStudents[idx] });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed.',
                errors: ['Email address is already in use by another student.'],
            });
        }
        console.error('Error updating student (PUT):', error);
        res.status(500).json({ status: 'error', message: 'An unexpected server error occurred.' });
    }
});

// 5. PATCH /students/:id — Partial update
app.patch('/students/:id', async (req, res) => {
    const { id } = req.params;
    const errors = validateStudentInput(req.body, false);
    if (errors.length > 0) {
        return res.status(400).json({ status: 'error', message: 'Validation failed.', errors });
    }

    const { name, email, course, semester } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (email !== undefined) updateFields.email = email.trim().toLowerCase();
    if (course !== undefined) updateFields.course = course.trim();
    if (semester !== undefined) updateFields.semester = parseInt(semester, 10);

    try {
        if (isDbConnected) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(404).json({ status: 'error', message: `Student with id ${id} not found.` });
            }

            if (updateFields.email) {
                const duplicate = await Student.findOne({ email: updateFields.email, _id: { $ne: id } });
                if (duplicate) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Validation failed.',
                        errors: ['Email address is already in use by another student.'],
                    });
                }
            }

            const updated = await Student.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true });
            if (!updated) {
                return res.status(404).json({ status: 'error', message: `Student with id ${id} not found.` });
            }

            return res.status(200).json({ status: 'success', data: updated });
        }

        // Fallback in-memory
        const idx = inMemoryStudents.findIndex((s) => s.id === id || s._id === id || String(s.id) === String(id));
        if (idx === -1) {
            return res.status(404).json({ status: 'error', message: `Student with id ${id} not found.` });
        }

        if (updateFields.email) {
            const duplicateMem = inMemoryStudents.find((s, i) => i !== idx && s.email.toLowerCase() === updateFields.email);
            if (duplicateMem) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation failed.',
                    errors: ['Email address is already in use by another student.'],
                });
            }
        }

        inMemoryStudents[idx] = {
            ...inMemoryStudents[idx],
            ...updateFields,
            updatedAt: new Date(),
        };

        return res.status(200).json({ status: 'success', data: inMemoryStudents[idx] });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed.',
                errors: ['Email address is already in use by another student.'],
            });
        }
        console.error('Error updating student (PATCH):', error);
        res.status(500).json({ status: 'error', message: 'An unexpected server error occurred.' });
    }
});

// 6. DELETE /students/:id — Delete a student
app.delete('/students/:id', async (req, res) => {
    const { id } = req.params;

    try {
        if (isDbConnected) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(404).json({ status: 'error', message: `Student with id ${id} not found.` });
            }

            const deleted = await Student.findByIdAndDelete(id);
            if (!deleted) {
                return res.status(404).json({ status: 'error', message: `Student with id ${id} not found.` });
            }

            return res.status(200).json({
                status: 'success',
                message: `Student with id ${id} deleted successfully.`,
            });
        }

        // Fallback in-memory
        const idx = inMemoryStudents.findIndex((s) => s.id === id || s._id === id || String(s.id) === String(id));
        if (idx === -1) {
            return res.status(404).json({ status: 'error', message: `Student with id ${id} not found.` });
        }

        inMemoryStudents.splice(idx, 1);
        return res.status(200).json({
            status: 'success',
            message: `Student with id ${id} deleted successfully.`,
        });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ status: 'error', message: 'An unexpected server error occurred.' });
    }
});

/* ─── Health / Root Route ────────────────────────────────── */
app.get('/', (req, res) => {
    res.json({
        message: 'CampusConnect Student REST API — Lab 4 (MongoDB Atlas + Multi-Client)',
        version: '2.0.0',
        database: isDbConnected ? 'MongoDB Atlas (Connected)' : 'Adaptive Fallback (Configure MONGODB_URI in .env)',
        cors: 'Enabled (React localhost:5173, Android 10.0.2.2/Device)',
        docs: `http://localhost:${PORT}/api-docs`,
        endpoints: {
            'GET    /students':     'List all students (React, Android)',
            'GET    /students/:id': 'Get student by ID (React)',
            'POST   /students':     'Create a student with validation & unique email check (React, Android)',
            'PUT    /students/:id': 'Full update student (React)',
            'PATCH  /students/:id': 'Partial update student (React)',
            'DELETE /students/:id': 'Delete student (React)',
        },
    });
});

/* ─── 404 Catch-All ──────────────────────────────────────── */
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.method} ${req.path} not found.`,
    });
});

/* ─── Global Error Handler ───────────────────────────────── */
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err.stack || err);
    res.status(500).json({
        status: 'error',
        message: 'An unexpected server error occurred.',
    });
});

/* ─── Server Startup ─────────────────────────────────────── */
const server = app.listen(PORT, () => {
    console.log(`\n🚀  Student REST API (Lab 4) running on http://localhost:${PORT}`);
    console.log(`📚  Swagger UI Documentation : http://localhost:${PORT}/api-docs`);
    console.log(`🌐  CORS Enabled for React   : http://localhost:5173`);
    console.log(`📱  Android Emulator Target  : http://10.0.2.2:${PORT}\n`);
});

module.exports = { app, server };

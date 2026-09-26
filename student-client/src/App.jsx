import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Database,
  Layers,
  Smartphone,
  Globe,
  Server,
  RefreshCw,
  AlertTriangle,
  FileQuestion,
  CheckCircle2,
} from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from './config';
import StudentForm from './components/StudentForm';
import StudentList from './components/StudentList';
import StudentDetailsModal from './components/StudentDetailsModal';
import Toast from './components/Toast';

export default function App() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [dbStatus, setDbStatus] = useState('MongoDB Atlas');

  // Dispatch toast feedback message
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const closeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Retrieve student collection from backend service
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.STUDENTS);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch students.`);
      }
      const result = await response.json();
      setStudents(result.data || []);
      if (result.storage) {
        setDbStatus(result.storage);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      const errMsg = 'Unable to load student records from the REST API. Please ensure the backend is running.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle Edit Action
  const handleEditStudent = (student) => {
    setEditingStudent(student);
    window.scrollTo({ top: 300, behavior: 'smooth' });
    showToast(`Editing "${student.name}". Make changes in the form.`, 'info');
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
  };

  const handleSaveSuccess = () => {
    setEditingStudent(null);
    fetchStudents();
  };

  // Test Negative Scenario: 404 Not Found
  const handleTest404 = async () => {
    const fakeId = '64b1f2e99999999999999999';
    try {
      const response = await fetch(API_ENDPOINTS.STUDENT_BY_ID(fakeId));
      if (response.status === 404) {
        const data = await response.json();
        showToast(`HTTP 404 Verified: ${data.message || 'Student not found in database.'}`, 'error');
      } else {
        showToast(`Unexpected status: ${response.status}`, 'info');
      }
    } catch (err) {
      showToast('Network error while testing 404.', 'error');
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onClose={closeToast} />

      {/* Navigation Header */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap size={24} />
          </div>
          <div className="brand-text">
            <h1>CampusConnect</h1>
            <p>Full-Stack Client & Database Integration (Lab 4)</p>
          </div>
        </div>

        <div className="header-badges">
          <div className="badge badge-mongo">
            <span className="badge-dot"></span>
            <span>{dbStatus}</span>
          </div>
          <div className="badge badge-api">
            <span className="badge-dot"></span>
            <span>REST API: {API_BASE_URL}</span>
          </div>
        </div>
      </header>

      {/* Hero / SOA Architecture Banner */}
      <section className="hero-banner">
        <div className="hero-info">
          <h2>Student Management Full-Stack Portal</h2>
          <p>
            This React web client connects to our centralized Express.js REST API with persistent MongoDB Atlas
            storage. Both this Web Client and the Android Mobile Client consume the same decoupled service layer.
          </p>
          <div className="soa-architecture-pill">
            <Layers size={16} color="#818cf8" />
            <span>
              <strong>SOA Pattern:</strong> MongoDB Atlas ↔ REST API (Node/Express) ↔ React Client + Android Client
            </span>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-number">{students.length}</div>
            <div className="stat-label">Active Records</div>
          </div>
          <div className="stat-box">
            <div className="stat-number" style={{ color: '#34d399' }}>200 OK</div>
            <div className="stat-label">Service Health</div>
          </div>
        </div>
      </section>

      {/* Quick Testing Bar for Lab 4 Requirements */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
          <Server size={16} color="#38bdf8" />
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong>Lab 4 Verification Utilities:</strong> Test service contract & error handling
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleTest404}
            className="btn btn-secondary btn-sm"
            title="Test GET /students/invalid-id to verify HTTP 404 response handling"
          >
            <FileQuestion size={14} /> Test 404 Not Found
          </button>
          <button
            onClick={fetchStudents}
            className="btn btn-secondary btn-sm"
            title="Re-fetch all data to verify persistence after restart"
          >
            <RefreshCw size={14} /> Verify Persistence
          </button>
        </div>
      </div>

      {/* Main Workspace Grid: Form (Left) & Directory (Right) */}
      <main className="workspace-grid">
        <section>
          <StudentForm
            editingStudent={editingStudent}
            onSaveSuccess={handleSaveSuccess}
            onCancelEdit={handleCancelEdit}
            onShowToast={showToast}
          />
        </section>

        <section>
          <StudentList
            students={students}
            isLoading={isLoading}
            error={error}
            editingStudent={editingStudent}
            onEditStudent={handleEditStudent}
            onViewStudent={(student) => setSelectedStudent(student)}
            onRefresh={fetchStudents}
            onShowToast={showToast}
          />
        </section>
      </main>

      {/* Student Details Modal */}
      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}

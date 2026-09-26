import React, { useState } from 'react';
import { Users, Search, RefreshCw, Trash2, Edit3, Eye, AlertCircle, Database } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

export default function StudentList({
  students,
  isLoading,
  error,
  editingStudent,
  onEditStudent,
  onViewStudent,
  onRefresh,
  onShowToast,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Filter students by name, email, or course
  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.course && s.course.toLowerCase().includes(term))
    );
  });

  const handleDelete = async (student) => {
    const id = student.id || student._id;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete student "${student.name}" (ID: ${id}) from MongoDB Atlas?`
    );
    if (!confirmDelete) return;

    setDeletingId(id);

    try {
      const response = await fetch(API_ENDPOINTS.STUDENT_BY_ID(id), {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.status === 200 || response.status === 204) {
        onShowToast(`Student "${student.name}" deleted successfully!`, 'success');
        onRefresh();
      } else if (response.status === 404) {
        onShowToast('HTTP 404: Student was not found or already deleted.', 'error');
        onRefresh();
      } else {
        onShowToast(`HTTP ${response.status}: Failed to delete student.`, 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      onShowToast('Unable to connect to REST API server to delete record.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const activeEditId = editingStudent ? (editingStudent.id || editingStudent._id) : null;

  return (
    <div className="card-container">
      <div className="card-header">
        <div className="card-title">
          <Users size={20} className="card-title-icon" />
          <span>Enrolled Students Directory</span>
          <span className="badge badge-api" style={{ marginLeft: '0.5rem' }}>
            {students.length} Total
          </span>
        </div>
        <div className="list-actions">
          <button
            onClick={onRefresh}
            className="btn btn-secondary btn-sm"
            disabled={isLoading}
            title="Refresh list from MongoDB"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="card-body">
        {/* Search Bar */}
        <div className="list-controls">
          <div className="input-wrapper search-input">
            <Search size={16} className="input-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, email, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Error Loading Data:</strong> {error}
              <div style={{ marginTop: '0.4rem' }}>
                <button onClick={onRefresh} className="btn btn-secondary btn-sm">
                  Retry Loading
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="spinner-container">
            <div className="spinner"></div>
            <p>Fetching records from MongoDB Atlas via REST API...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No Students Found</h3>
            <p style={{ marginTop: '0.4rem', fontSize: '0.88rem' }}>
              {searchTerm
                ? `No students matching "${searchTerm}". Try another search term.`
                : 'The student database is currently empty. Use the form to enroll the first student!'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Course</th>
                  <th>Semester</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const id = student.id || student._id;
                  const isBeingEdited = activeEditId === id;
                  const isDeleting = deletingId === id;

                  return (
                    <tr key={id} className={isBeingEdited ? 'active-editing' : ''}>
                      <td>
                        <div className="student-name-cell">
                          <div className="avatar">
                            {student.name ? student.name.substring(0, 2).toUpperCase() : 'ST'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{student.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              ID: {String(id).substring(0, 10)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{student.email}</td>
                      <td>{student.course}</td>
                      <td>
                        <span className="semester-badge">Sem {student.semester}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                          {/* View Details */}
                          <button
                            onClick={() => onViewStudent(student)}
                            className="btn btn-secondary btn-icon"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onEditStudent(student)}
                            className="btn btn-secondary btn-icon"
                            title="Edit Student"
                            style={{
                              color: isBeingEdited ? '#818cf8' : 'inherit',
                              borderColor: isBeingEdited ? '#6366f1' : 'var(--border-color)',
                            }}
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(student)}
                            className="btn btn-danger btn-icon"
                            disabled={isDeleting}
                            title="Delete Student"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

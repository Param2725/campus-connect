import React, { useState, useEffect } from 'react';
import { User, Mail, BookOpen, GraduationCap, PlusCircle, Save, XCircle, AlertTriangle } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

export default function StudentForm({ editingStudent, onSaveSuccess, onCancelEdit, onShowToast }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    course: '',
    semester: '1',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiErrors, setApiErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form data when editing a student
  useEffect(() => {
    if (editingStudent) {
      setFormData({
        name: editingStudent.name || '',
        email: editingStudent.email || '',
        course: editingStudent.course || '',
        semester: String(editingStudent.semester || '1'),
      });
      setFieldErrors({});
      setApiErrors([]);
    } else {
      setFormData({ name: '', email: '', course: '', semester: '1' });
      setFieldErrors({});
      setApiErrors([]);
    }
  }, [editingStudent]);

  // Client-side validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Full name is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!formData.course.trim()) {
      errors.course = 'Course name is required.';
    }
    const sem = parseInt(formData.semester, 10);
    if (!formData.semester || isNaN(sem) || sem < 1 || sem > 12) {
      errors.semester = 'Semester must be between 1 and 12.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiErrors([]);

    // 1. Perform client-side validation first
    if (!validateForm()) {
      onShowToast('Please correct the highlighted form errors.', 'error');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      course: formData.course.trim(),
      semester: parseInt(formData.semester, 10),
    };

    const isEditMode = Boolean(editingStudent && (editingStudent.id || editingStudent._id));
    const targetId = editingStudent ? (editingStudent.id || editingStudent._id) : null;
    const url = isEditMode ? API_ENDPOINTS.STUDENT_BY_ID(targetId) : API_ENDPOINTS.STUDENTS;
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 201 || (response.status === 200 && isEditMode)) {
        onShowToast(
          isEditMode
            ? `Student "${payload.name}" updated successfully!`
            : `Student "${payload.name}" enrolled successfully!`,
          'success'
        );
        setFormData({ name: '', email: '', course: '', semester: '1' });
        setFieldErrors({});
        setApiErrors([]);
        onSaveSuccess();
      } else if (response.status === 400) {
        // Backend HTTP 400 Validation or Unique Email Constraint failure
        const errors = data.errors || [data.message || 'Validation failed.'];
        setApiErrors(errors);
        onShowToast(`HTTP 400: ${data.message || 'Validation error from API'}`, 'error');
      } else if (response.status === 404) {
        onShowToast('HTTP 404: Student not found in database.', 'error');
        setApiErrors(['Student record not found in the database.']);
      } else {
        onShowToast(`HTTP ${response.status}: Failed to save student.`, 'error');
        setApiErrors([data.message || 'An unexpected server error occurred.']);
      }
    } catch (err) {
      console.error('Network Error:', err);
      onShowToast('Unable to connect to REST API server. Is it running on port 3000?', 'error');
      setApiErrors(['Network connection error. Please verify backend is online.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(editingStudent);

  return (
    <div className="card-container">
      <div className="card-header">
        <div className="card-title">
          {isEditing ? (
            <>
              <Save size={20} className="card-title-icon" style={{ color: '#38bdf8' }} />
              <span>Edit Student Details</span>
            </>
          ) : (
            <>
              <PlusCircle size={20} className="card-title-icon" />
              <span>Enroll New Student</span>
            </>
          )}
        </div>
        {isEditing && (
          <button onClick={onCancelEdit} className="btn btn-secondary btn-sm" title="Cancel Editing">
            <XCircle size={15} /> Cancel
          </button>
        )}
      </div>

      <div className="card-body">
        {/* Backend API 400 Error Banner */}
        {apiErrors.length > 0 && (
          <div className="alert alert-danger">
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>API Error Response (HTTP 400):</strong>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem' }}>
                {apiErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="student-name">
              Full Name <span className="req">*</span>
            </label>
            <div className="input-wrapper">
              <User size={16} className="input-icon" />
              <input
                id="student-name"
                name="name"
                type="text"
                className={`form-input ${fieldErrors.name ? 'error' : ''}`}
                placeholder="e.g. Aarav Patel"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="student-email">
              Email Address <span className="req">*</span>
            </label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="student-email"
                name="email"
                type="email"
                className={`form-input ${fieldErrors.email ? 'error' : ''}`}
                placeholder="e.g. aarav@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
          </div>

          {/* Course Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="student-course">
              Course / Degree <span className="req">*</span>
            </label>
            <div className="input-wrapper">
              <BookOpen size={16} className="input-icon" />
              <input
                id="student-course"
                name="course"
                type="text"
                className={`form-input ${fieldErrors.course ? 'error' : ''}`}
                placeholder="e.g. Computer Science & Eng."
                value={formData.course}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            {fieldErrors.course && <div className="field-error">{fieldErrors.course}</div>}
          </div>

          {/* Semester */}
          <div className="form-group">
            <label className="form-label" htmlFor="student-semester">
              Current Semester (1 – 12) <span className="req">*</span>
            </label>
            <div className="input-wrapper">
              <GraduationCap size={16} className="input-icon" />
              <select
                id="student-semester"
                name="semester"
                className={`form-select ${fieldErrors.semester ? 'error' : ''}`}
                value={formData.semester}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Semester {i + 1}
                  </option>
                ))}
              </select>
            </div>
            {fieldErrors.semester && <div className="field-error">{fieldErrors.semester}</div>}
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <span>Saving to MongoDB...</span>
              ) : isEditing ? (
                <>
                  <Save size={16} /> Update Student
                </>
              ) : (
                <>
                  <PlusCircle size={16} /> Enroll Student
                </>
              )}
            </button>
            {isEditing && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancelEdit}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

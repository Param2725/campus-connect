import React from 'react';
import { X, User, Mail, BookOpen, GraduationCap, Database, Calendar } from 'lucide-react';

export default function StudentDetailsModal({ student, onClose }) {
  if (!student) return null;

  const id = student.id || student._id;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title">
            <User size={20} className="card-title-icon" />
            <span>Student Record Details</span>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div
              className="avatar"
              style={{ width: '56px', height: '56px', fontSize: '1.25rem' }}
            >
              {student.name ? student.name.substring(0, 2).toUpperCase() : 'ST'}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>{student.name}</h3>
              <span className="badge badge-mongo">
                <span className="badge-dot"></span> MongoDB Document
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                Database Record ID (_id)
              </div>
              <code style={{ color: '#38bdf8', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                {id}
              </code>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <Mail size={14} /> EMAIL
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{student.email}</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <GraduationCap size={14} /> SEMESTER
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Semester {student.semester}</div>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                <BookOpen size={14} /> COURSE / PROGRAMME
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{student.course}</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

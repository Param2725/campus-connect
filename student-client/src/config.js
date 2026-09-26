/**
 * Centralized API Configuration
 * Web Services & SOA Laboratory — Lab 4
 *
 * All client HTTP calls MUST derive from this single API_BASE_URL constant.
 * Configured via Vite environment variable (VITE_API_BASE_URL) or defaults to http://localhost:3000.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  STUDENTS: `${API_BASE_URL}/students`,
  STUDENT_BY_ID: (id) => `${API_BASE_URL}/students/${id}`,
};

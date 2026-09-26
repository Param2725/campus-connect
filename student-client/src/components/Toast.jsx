import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onClose }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let icon = <Info size={18} />;
        let className = 'toast toast-info';

        if (toast.type === 'success') {
          icon = <CheckCircle2 size={18} />;
          className = 'toast toast-success';
        } else if (toast.type === 'error') {
          icon = <AlertCircle size={18} />;
          className = 'toast toast-error';
        }

        return (
          <div key={toast.id} className={className}>
            {icon}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => onClose(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'currentColor',
                cursor: 'pointer',
                opacity: 0.7,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

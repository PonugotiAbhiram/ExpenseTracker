// src/components/ConfirmModal.jsx
// Styled confirmation dialog — replaces window.confirm()
import React from "react";

const ConfirmModal = ({
  title       = "Are you sure?",
  message     = "This action cannot be undone.",
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}) => {
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="confirm-modal">
        <div className="confirm-modal__icon">
          <TrashIcon />
        </div>
        <h3 id="confirm-title" className="confirm-modal__title">{title}</h3>
        <p className="confirm-modal__message">{message}</p>
        <div className="confirm-modal__actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const TrashIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

export default ConfirmModal;

import React from 'react';
import { RotateCcw, AlertTriangle, X, Check, ShieldCheck } from 'lucide-react';
import './ResetConfirmModal.css';

export default function ResetConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="reset-modal-overlay" onClick={onClose}>
      <div
        className="reset-modal-container glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-modal-title"
      >
        <div className="reset-modal-header">
          <div className="reset-title-left">
            <div className="reset-icon-halo">
              <RotateCcw size={18} className="text-cyan" />
            </div>
            <div>
              <h3 id="reset-modal-title" className="reset-title">
                RESET DEMO SESSION
              </h3>
              <p className="reset-subtitle">
                Operator Confirmation Required • Hack Day Bengaluru 2026
              </p>
            </div>
          </div>
          <button
            type="button"
            className="reset-close-btn"
            onClick={onClose}
            title="Cancel Reset (Esc)"
            id="btn-cancel-reset-modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="reset-modal-body">
          <div className="reset-warning-box">
            <AlertTriangle size={18} className="text-ice flex-shrink-0" />
            <p className="reset-warning-text">
              Are you sure you want to reset the active hackathon demo session?
            </p>
          </div>

          <div className="reset-details-list">
            <span className="reset-details-title">WHAT THIS WILL DO:</span>
            <ul>
              <li>Reset <strong>Pitch Mode Storyboard</strong> progress back to <strong>Scenario 1</strong>.</li>
              <li>Clear the active <strong>conversation transcript</strong>.</li>
              <li>Stop any active <strong>speech synthesis</strong> and <strong>microphone streams</strong>.</li>
              <li>Close any open <strong>camera or screen capture</strong> viewports.</li>
            </ul>

            <div className="reset-preservation-note">
              <ShieldCheck size={14} className="text-teal" />
              <span>
                <strong>Preserved:</strong> Security audit log ledger, workspace files, and language settings are safely retained.
              </span>
            </div>
          </div>
        </div>

        <div className="reset-modal-footer">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            id="btn-abort-reset"
          >
            <span>Cancel (Esc)</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm btn-confirm-reset"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            id="btn-execute-confirmed-reset"
          >
            <RotateCcw size={14} />
            <span>Confirm Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}

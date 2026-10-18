import React from 'react';
import { Keyboard, X, Sparkles, Volume2, ShieldCheck, CornerDownLeft, Eye } from 'lucide-react';
import './KeyboardShortcutsModal.css';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      key: 'P',
      description: 'Toggle Pitch Mode Storyboard',
      category: 'Presentation',
      icon: Sparkles
    },
    {
      key: 'M',
      description: 'Mute / Unmute Spoken Voice Output',
      category: 'Audio',
      icon: Volume2
    },
    {
      key: 'Esc',
      description: 'Close Active Modal / Storyboard',
      category: 'Navigation',
      icon: X
    },
    {
      key: '?',
      description: 'Toggle This Keyboard Shortcuts Help',
      category: 'Help',
      icon: Keyboard
    },
    {
      key: 'Enter',
      description: 'Send Prompt to GENESIS AI Core',
      category: 'Input',
      icon: CornerDownLeft
    },
    {
      key: 'Shift + Enter',
      description: 'Insert Multi-line Line Break',
      category: 'Input',
      icon: CornerDownLeft
    }
  ];

  return (
    <div className="shortcuts-modal-overlay" onClick={onClose}>
      <div
        className="shortcuts-modal-container glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
      >
        <div className="shortcuts-modal-header">
          <div className="shortcuts-title-left">
            <div className="shortcuts-icon-halo">
              <Keyboard size={18} className="text-cyan" />
            </div>
            <div>
              <h3 id="shortcuts-modal-title" className="shortcuts-title">
                KEYBOARD SHORTCUTS
              </h3>
              <p className="shortcuts-subtitle">
                Quick-Access Presentation Hotkeys • Hack Day Bengaluru 2026
              </p>
            </div>
          </div>
          <button
            type="button"
            className="shortcuts-close-btn"
            onClick={onClose}
            title="Close Shortcuts Help (Esc)"
            id="btn-close-shortcuts-modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="shortcuts-modal-body">
          <div className="shortcuts-grid">
            {shortcuts.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div key={idx} className="shortcut-card">
                  <div className="shortcut-card-left">
                    <span className="shortcut-category">{item.category}</span>
                    <span className="shortcut-desc">{item.description}</span>
                  </div>
                  <div className="shortcut-key-badge">
                    <kbd>{item.key}</kbd>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="shortcuts-footer-hint">
            <span className="hint-dot" />
            <span>Hotkeys are disabled while typing inside input and text fields to prevent accidental triggers.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Sparkles, Activity, ShieldCheck, RefreshCw, Cpu } from 'lucide-react';
import './Header.css';

export default function Header({ currentState, onStateChange, onResetConversation }) {
  const states = ['idle', 'listening', 'thinking', 'speaking'];

  return (
    <header className="genesis-header">
      <div className="header-left">
        <div className="brand-logo-container">
          <div className="brand-logo-orb">
            <span className="brand-inner-core" />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">GENESIS AI</h1>
              <span className="badge badge-cyan">v1.0 BETA</span>
            </div>
            <p className="brand-subtitle">Multimodal Autonomous Agent • Hack Day Bengaluru 2026</p>
          </div>
        </div>
      </div>

      <div className="header-center">
        {/* Quick Demo State Switcher for Hackathon Testing */}
        <div className="state-switcher-bar" title="Quickly preview AI Energy Orb states">
          <span className="switcher-label">
            <Activity size={13} />
            <span>STATE DEMO:</span>
          </span>
          <div className="switcher-pills">
            {states.map((st) => (
              <button
                key={st}
                className={`state-pill ${currentState === st ? 'active' : ''}`}
                onClick={() => onStateChange(st)}
                id={`btn-state-${st}`}
              >
                <span className={`status-dot ${st}`} />
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="badge badge-simulated" title="Operating with simulated multimodal pipeline - no API keys required">
          <Cpu size={12} />
          <span>MOCK PIPELINE (LOCAL)</span>
        </div>

        <button
          className="btn btn-ghost btn-sm reset-btn"
          onClick={onResetConversation}
          title="Reset conversation and state"
          id="btn-reset-conversation"
        >
          <RefreshCw size={14} />
          <span className="hide-mobile">Reset</span>
        </button>
      </div>
    </header>
  );
}

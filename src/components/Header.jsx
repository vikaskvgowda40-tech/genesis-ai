import React from 'react';
import { Sparkles, Activity, ShieldCheck, RefreshCw, Cpu, Volume2, VolumeX, Square, Languages, Keyboard } from 'lucide-react';
import './Header.css';

export default function Header({
  currentState,
  onStateChange,
  onResetConversation,
  isVoiceMuted = false,
  onToggleMute,
  onStopSpeaking,
  isSpeaking = false,
  selectedLanguage = 'en-IN',
  onLanguageChange = () => {},
  onOpenPitchMode = () => {},
  onOpenShortcuts = () => {}
}) {
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
        {/* Voice Speaking / Stop Control */}
        {isSpeaking && (
          <button
            className="btn btn-danger-ghost btn-sm speaking-stop-btn"
            onClick={onStopSpeaking}
            title="Stop speaking aloud"
            id="btn-stop-speaking-header"
          >
            <Square size={13} fill="currentColor" />
            <span>Stop Voice</span>
          </button>
        )}

        {/* Voice Mute Toggle */}
        <button
          className={`btn btn-ghost btn-sm ${isVoiceMuted ? 'muted-btn' : ''}`}
          onClick={onToggleMute}
          title={isVoiceMuted ? "Unmute spoken responses" : "Mute spoken responses"}
          id="btn-toggle-voice-mute"
        >
          {isVoiceMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          <span className="hide-mobile">{isVoiceMuted ? "Muted" : "Voice On"}</span>
        </button>

        {/* Multilingual Voice Language Selector */}
        <div className="language-selector-wrap" title="Select Voice & AI Language">
          <Languages size={14} className="lang-icon text-cyan" />
          <select
            className="language-dropdown-select"
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            id="select-header-language"
            aria-label="Select Voice and Speech Language"
          >
            <option value="en-IN">English (India)</option>
            <option value="hi-IN">हिन्दी (Hindi)</option>
            <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
            <option value="ta-IN">தமிழ் (Tamil)</option>
            <option value="te-IN">తెలుగు (Telugu)</option>
          </select>
        </div>

        {/* Hackathon Judges Pitch Mode Trigger */}
        <button
          className="btn btn-pitch-mode btn-sm"
          onClick={onOpenPitchMode}
          title="Open Hackathon Judges Interactive Pitch Mode"
          id="btn-header-pitch-mode"
        >
          <Sparkles size={14} className="pitch-btn-sparkle" />
          <span>PITCH MODE</span>
        </button>

        <div className="badge badge-cyan" title="Operating with Google Gemini 3.8 Flash + Web Speech API">
          <Cpu size={12} />
          <span>GEMINI 3.8 + VOICE</span>
        </div>

        {/* Keyboard Shortcuts Help */}
        <button
          className="btn btn-ghost btn-sm shortcuts-help-btn"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
          id="btn-header-keyboard-shortcuts"
        >
          <Keyboard size={14} />
          <span className="hide-mobile">Keys</span>
        </button>

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

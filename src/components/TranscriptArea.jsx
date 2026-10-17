import React, { useState } from 'react';
import {
  Brain,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Terminal,
  Bot,
  User,
  CheckCircle2,
  XCircle,
  Eye,
  Sparkles
} from 'lucide-react';
import './TranscriptArea.css';

export default function TranscriptArea({
  messages = [],
  onAuthorizeAction,
  onDeclineAction
}) {
  const [expandedThoughts, setExpandedThoughts] = useState({});
  const [playingAudioId, setPlayingAudioId] = useState(null);

  const toggleThoughts = (id) => {
    setExpandedThoughts((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAudio = (id) => {
    if (playingAudioId === id) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
      // Auto-stop audio simulation after 4 seconds
      setTimeout(() => {
        setPlayingAudioId((curr) => (curr === id ? null : curr));
      }, 4500);
    }
  };

  return (
    <div className="transcript-container glass-panel">
      <div className="transcript-header">
        <div className="transcript-title-wrap">
          <Bot size={18} className="title-icon" />
          <span className="transcript-title">MULTIMODAL CONVERSATION & AUDIT STREAM</span>
        </div>
        <span className="badge badge-ice">{messages.length} MESSAGES</span>
      </div>

      <div className="transcript-messages-scroll">
        {messages.length === 0 ? (
          <div className="empty-transcript-state">
            <div className="empty-halo">
              <Sparkles size={28} className="empty-icon" />
            </div>
            <h3 className="empty-title">GENESIS Multimodal Core Online</h3>
            <p className="empty-desc">
              Ready for real-time perception. Speak, upload an image, or request a safe computer action.
            </p>

            <div className="capabilities-grid">
              <div className="cap-card">
                <div className="cap-icon-box cyan">
                  <Eye size={16} />
                </div>
                <div>
                  <div className="cap-name">SEE</div>
                  <div className="cap-detail">Ingests diagrams, schematics & UI images</div>
                </div>
              </div>

              <div className="cap-card">
                <div className="cap-icon-box teal">
                  <Volume2 size={16} />
                </div>
                <div>
                  <div className="cap-name">HEAR & SPEAK</div>
                  <div className="cap-detail">Voice streams & Sarvam AI Indian TTS</div>
                </div>
              </div>

              <div className="cap-card">
                <div className="cap-icon-box ice">
                  <Brain size={16} />
                </div>
                <div>
                  <div className="cap-name">THINK</div>
                  <div className="cap-detail">Gemma reasoning & multi-step plans</div>
                </div>
              </div>

              <div className="cap-card">
                <div className="cap-icon-box cyan">
                  <Terminal size={16} />
                </div>
                <div>
                  <div className="cap-name">ACT</div>
                  <div className="cap-detail">Permission-gated safe computer actions</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.sender === 'user' ? 'user-row' : 'genesis-row'}`}
            >
              <div className="message-avatar">
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div className="message-bubble-wrap">
                {/* User Message */}
                {msg.sender === 'user' && (
                  <div className="user-bubble">
                    {msg.image && (
                      <div className="bubble-image-container">
                        <img src={msg.image.url} alt="Uploaded attachment" className="bubble-image" />
                        <span className="bubble-image-label">📎 {msg.image.name}</span>
                      </div>
                    )}
                    <p className="bubble-text">{msg.text}</p>
                    <span className="bubble-timestamp">{msg.timestamp}</span>
                  </div>
                )}

                {/* GENESIS Response */}
                {msg.sender === 'genesis' && (
                  <div className="genesis-bubble">
                    {/* Header tags */}
                    <div className="bubble-tags-row">
                      <span className="badge badge-cyan">GENESIS</span>
                      {msg.modalities?.map((m) => (
                        <span key={m} className="badge badge-teal">
                          {m}
                        </span>
                      ))}
                      <span className="bubble-timestamp">{msg.timestamp}</span>
                    </div>

                    {/* Text response */}
                    <div className="bubble-text">{msg.text}</div>

                    {/* Gemma Thinking Chain Accordion */}
                    {msg.thinkingChain && (
                      <div className="thinking-accordion">
                        <button
                          className="thinking-toggle-btn"
                          onClick={() => toggleThoughts(msg.id)}
                          type="button"
                        >
                          <Brain size={15} className="thinking-icon" />
                          <span className="thinking-toggle-text">
                            Gemma 2 Reasoning Trace ({msg.thinkingChain.tokens || 142} tokens • {msg.thinkingChain.latency || '320ms'})
                          </span>
                          {expandedThoughts[msg.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {expandedThoughts[msg.id] && (
                          <div className="thinking-content">
                            {msg.thinkingChain.steps.map((step, sIdx) => (
                              <div key={sIdx} className="thinking-step">
                                <span className="step-number">{sIdx + 1}</span>
                                <span className="step-text">{step}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sarvam AI Voice TTS Player Simulation */}
                    {msg.audioResponse && (
                      <div className="sarvam-voice-card">
                        <div className="sarvam-voice-header">
                          <div className="sarvam-badge-wrap">
                            <span className="badge badge-ice">SARVAM AI TTS</span>
                            <span className="sarvam-lang">Voice: {msg.audioResponse.language || 'English (IN)'}</span>
                          </div>
                          <span className="sarvam-voice-model">[Bulbul-v1]</span>
                        </div>

                        <div className="sarvam-player-controls">
                          <button
                            className={`voice-play-btn ${playingAudioId === msg.id ? 'playing' : ''}`}
                            onClick={() => toggleAudio(msg.id)}
                            title={playingAudioId === msg.id ? "Pause voice" : "Listen with Sarvam Voice"}
                          >
                            {playingAudioId === msg.id ? <Pause size={15} /> : <Play size={15} />}
                          </button>

                          <div className="audio-wave-visualizer">
                            {[18, 42, 28, 65, 34, 82, 48, 90, 60, 38, 70, 52, 30, 85, 45, 20].map((h, i) => (
                              <span
                                key={i}
                                className={`wave-bar ${playingAudioId === msg.id ? 'active' : ''}`}
                                style={{
                                  height: playingAudioId === msg.id ? `${h}%` : '24%',
                                  animationDelay: `${i * 0.08}s`
                                }}
                              />
                            ))}
                          </div>

                          <span className="audio-duration">
                            {playingAudioId === msg.id ? "Playing..." : msg.audioResponse.duration || "0:04"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Safe Computer Action Proposal Card */}
                    {msg.actionProposal && (
                      <div className={`action-card status-${msg.actionProposal.status}`}>
                        <div className="action-card-header">
                          <div className="action-title-wrap">
                            <Terminal size={16} className="action-icon" />
                            <span className="action-title">SAFE COMPUTER ACTION PROPOSAL</span>
                          </div>
                          <div className="badge badge-cyan">
                            <ShieldCheck size={12} />
                            <span>{msg.actionProposal.safetyLevel || 'SANDBOX SAFE'}</span>
                          </div>
                        </div>

                        <div className="action-card-body">
                          <div className="action-command-box">
                            <code>{msg.actionProposal.command}</code>
                          </div>
                          <p className="action-description">{msg.actionProposal.description}</p>
                        </div>

                        <div className="action-card-footer">
                          {msg.actionProposal.status === 'pending' ? (
                            <div className="action-btn-group">
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => onAuthorizeAction(msg.id, msg.actionProposal)}
                                id={`btn-auth-action-${msg.id}`}
                              >
                                <CheckCircle2 size={14} />
                                <span>Authorize Action</span>
                              </button>
                              <button
                                className="btn btn-danger-ghost btn-sm"
                                onClick={() => onDeclineAction(msg.id)}
                                id={`btn-deny-action-${msg.id}`}
                              >
                                <XCircle size={14} />
                                <span>Decline</span>
                              </button>
                            </div>
                          ) : msg.actionProposal.status === 'authorized' ? (
                            <div className="action-status-confirmed">
                              <CheckCircle2 size={16} className="text-teal" />
                              <span>Permission Granted • Action Executed Safely ({msg.actionProposal.executedAt || 'Just now'})</span>
                            </div>
                          ) : (
                            <div className="action-status-declined">
                              <XCircle size={16} className="text-dim" />
                              <span>Action Declined by User</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

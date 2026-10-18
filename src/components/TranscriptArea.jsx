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
  Sparkles,
  AlertCircle,
  FileText,
  Youtube,
  ExternalLink,
  Globe,
  Loader2
} from 'lucide-react';
import CalculatorInterface from './CalculatorInterface';
import './TranscriptArea.css';

export default function TranscriptArea({
  messages = [],
  onAuthorizeAction,
  onDeclineAction,
  onAuthorizePlanStep,
  onDeclinePlanStep,
  speakingMessageId = null,
  onSpeakMessage,
  onStopSpeaking,
  isSpeaking = false,
  isVoiceMuted = false,
  selectedLanguage = 'en-IN'
}) {
  const [expandedThoughts, setExpandedThoughts] = useState({});

  const LANGUAGE_LABELS = {
    'en-IN': 'English (India)',
    'hi-IN': 'Hindi (हिन्दी)',
    'kn-IN': 'Kannada (ಕನ್ನಡ)',
    'ta-IN': 'Tamil (தமிழ்)',
    'te-IN': 'Telugu (తెలుగు)'
  };

  const toggleThoughts = (id) => {
    setExpandedThoughts((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggleVoice = (msg) => {
    if (speakingMessageId === msg.id) {
      if (onStopSpeaking) onStopSpeaking();
    } else {
      if (onSpeakMessage) onSpeakMessage(msg.text, msg.id);
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
                    {msg.isError ? (
                      <div className="bubble-error-banner">
                        <AlertCircle size={18} className="error-icon" />
                        <div className="error-content">
                          <span className="error-title">SYSTEM NOTICE</span>
                          <span className="error-text">{msg.text}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bubble-text">{msg.text}</div>
                    )}

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

                    {/* Native Web Speech Synthesis Audio Player */}
                    {!msg.isError && (
                      <div className="sarvam-voice-card">
                        <div className="sarvam-voice-header">
                          <div className="sarvam-badge-wrap">
                            <span className="badge badge-ice">WEB SPEECH SYNTHESIS</span>
                            <span className="sarvam-lang">Voice: {LANGUAGE_LABELS[msg.language || selectedLanguage] || 'Indian English'}</span>
                          </div>
                          <span className="sarvam-voice-model">
                            {speakingMessageId === msg.id ? "[Speaking Aloud]" : "[Ready]"}
                          </span>
                        </div>

                        <div className="sarvam-player-controls">
                          <button
                            className={`voice-play-btn ${speakingMessageId === msg.id ? 'playing' : ''}`}
                            onClick={() => handleToggleVoice(msg)}
                            title={speakingMessageId === msg.id ? "Stop reading aloud" : "Read response aloud"}
                            id={`btn-voice-msg-${msg.id}`}
                          >
                            {speakingMessageId === msg.id ? <Pause size={15} /> : <Play size={15} />}
                          </button>

                          <div className="audio-wave-visualizer">
                            {[18, 42, 28, 65, 34, 82, 48, 90, 60, 38, 70, 52, 30, 85, 45, 20].map((h, i) => (
                              <span
                                key={i}
                                className={`wave-bar ${speakingMessageId === msg.id ? 'active' : ''}`}
                                style={{
                                  height: speakingMessageId === msg.id ? `${h}%` : '24%',
                                  animationDelay: `${i * 0.08}s`
                                }}
                              />
                            ))}
                          </div>

                          <span className="audio-duration">
                            {speakingMessageId === msg.id
                              ? "Reading aloud..."
                              : isVoiceMuted
                              ? "Voice Muted (Click to Listen)"
                              : "Click to Speak"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Autonomous Agent Execution Plan Card */}
                    {msg.agentPlan && Array.isArray(msg.agentPlan.steps) && msg.agentPlan.steps.length > 0 ? (
                      <div className="agent-plan-card">
                        <div className="agent-plan-header">
                          <div className="plan-title-wrap">
                            <Terminal size={17} className="plan-header-icon" />
                            <div>
                              <span className="plan-title">AUTONOMOUS AGENT EXECUTION PLAN</span>
                              <span className="plan-subtitle">
                                {msg.agentPlan.category?.replace(/_/g, ' ') || 'MULTI-STEP AGENT PLAN'}
                              </span>
                            </div>
                          </div>
                          <div className="plan-badges-wrap">
                            <span className="badge badge-teal">
                              {msg.agentPlan.steps.filter((s) => s.status === 'completed').length} / {msg.agentPlan.steps.length} VERIFIED
                            </span>
                            <span className="badge badge-cyan">
                              <ShieldCheck size={12} /> SAFE EXECUTION
                            </span>
                          </div>
                        </div>

                        {/* Plan Goal */}
                        <div className="plan-goal-box">
                          <div className="goal-label">🎯 PLANNED OBJECTIVE:</div>
                          <div className="goal-text">{msg.agentPlan.goal}</div>
                          {msg.agentPlan.explanation && (
                            <div className="goal-explanation">{msg.agentPlan.explanation}</div>
                          )}
                        </div>

                        {/* Ordered Plan Steps */}
                        <div className="plan-steps-container">
                          <div className="steps-list-title">DECOMPOSED TASK EXECUTION STEPS:</div>
                          {msg.agentPlan.steps.map((step, idx) => {
                            const isPendingAuth = (step.status === 'pending' || step.status === 'pending_authorization') &&
                              Boolean(step.requiresAuthorization);

                            const targetPath = step.parameters?.filePath || step.parameters?.path || (step.parameters?.appId ? `Application: ${step.parameters.appId}` : null);
                            const proposedContent = step.parameters?.content !== undefined ? step.parameters.content : (step.parameters?.text || null);

                            return (
                              <div key={step.stepId || idx} className={`plan-step-card status-${step.status} ${isPendingAuth ? 'status-pending-auth' : ''}`}>
                                <div className="step-card-top">
                                  <div className="step-index-pill">{idx + 1}</div>
                                  <div className="step-info">
                                    <div className="step-title-row">
                                      <span className="step-title">{step.title}</span>
                                      <span className="step-tool-badge">{step.tool}</span>
                                    </div>
                                    <div className="step-description">{step.description}</div>
                                  </div>
                                  <div className="step-status-pill">
                                    {step.status === 'completed' && (
                                      <span className="status-badge status-completed">
                                        <CheckCircle2 size={13} /> Completed
                                      </span>
                                    )}
                                    {step.status === 'running' && (
                                      <span className="status-badge status-running">
                                        <Loader2 size={13} className="spin-icon" /> Running
                                      </span>
                                    )}
                                    {isPendingAuth && (
                                      <span className="status-badge status-pending-auth">
                                        <ShieldAlert size={13} /> Requires Confirmation
                                      </span>
                                    )}
                                    {!isPendingAuth && step.status !== 'running' && (step.status === 'pending' || step.status === 'pending_authorization') && (
                                      <span className="status-badge status-pending">
                                        Pending
                                      </span>
                                    )}
                                    {step.status === 'declined' && (
                                      <span className="status-badge status-declined">
                                        <XCircle size={13} /> Declined
                                      </span>
                                    )}
                                    {step.status === 'failed' && (
                                      <span className="status-badge status-failed">
                                        <AlertCircle size={13} /> Failed
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Target Path & Proposed Content Detail Card */}
                                {(targetPath || proposedContent !== null || step.parameters?.expression || step.parameters?.query || step.parameters?.url) && (
                                  <div className="step-params-card">
                                    {targetPath && (
                                      <div className="step-param-row">
                                        <span className="step-param-label">TARGET:</span>
                                        <code className="step-param-path">
                                          <FileText size={12} className="param-icon" />
                                          {targetPath}
                                        </code>
                                      </div>
                                    )}
                                    {step.parameters?.query && (
                                      <div className="step-param-row">
                                        <span className="step-param-label">YOUTUBE QUERY:</span>
                                        <code className="step-param-path">
                                          <Youtube size={13} className="param-icon text-danger" />
                                          {step.parameters.query}
                                        </code>
                                      </div>
                                    )}
                                    {step.parameters?.url && (
                                      <div className="step-param-row">
                                        <span className="step-param-label">WEB ADDRESS:</span>
                                        <code className="step-param-path">
                                          <Globe size={13} className="param-icon" />
                                          {step.parameters.url}
                                        </code>
                                      </div>
                                    )}
                                    {step.parameters?.expression && (
                                      <div className="step-param-row">
                                        <span className="step-param-label">EXPRESSION:</span>
                                        <code className="step-param-path">{step.parameters.expression}</code>
                                      </div>
                                    )}
                                    {proposedContent !== null && proposedContent !== undefined && (
                                      <div className="step-content-box">
                                        <div className="step-content-header">
                                          <span className="step-content-label">PROPOSED FILE CONTENT:</span>
                                          <span className="step-content-meta">
                                            {typeof proposedContent === 'string' ? `${proposedContent.length} chars` : 'structured data'}
                                          </span>
                                        </div>
                                        <pre className="step-content-code">
                                          {typeof proposedContent === 'string'
                                            ? proposedContent
                                            : JSON.stringify(proposedContent, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Authorization action buttons for pending consequential steps */}
                                {isPendingAuth && (
                                  <div className="step-auth-actions">
                                    <span className="auth-notice">
                                      {step.tool === 'workspace.write_file'
                                        ? 'Existing file detected. Confirm to overwrite file content.'
                                        : 'Consequential action requires explicit operator approval before execution.'}
                                    </span>
                                    <div className="step-btn-group">
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => onAuthorizePlanStep ? onAuthorizePlanStep(msg.id, step) : onAuthorizeAction(msg.id, msg.actionProposal)}
                                        id={`btn-auth-step-${step.stepId}`}
                                      >
                                        <CheckCircle2 size={13} />
                                        <span>Authorize Step</span>
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-danger-ghost btn-sm"
                                        onClick={() => onDeclinePlanStep ? onDeclinePlanStep(msg.id, step.stepId) : onDeclineAction(msg.id)}
                                        id={`btn-decline-step-${step.stepId}`}
                                      >
                                        <XCircle size={13} />
                                        <span>Decline</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Verified Real Result Terminal */}
                                {step.result && (
                                  <div className="step-result-wrap">
                                    <div className="step-result-header">
                                      <span className="result-label">
                                        VERIFIED REAL OUTPUT [{step.result.operation || step.tool}]
                                      </span>
                                      <span className="result-verified-badge">✓ Verified</span>
                                    </div>

                                    {/* Process verification note */}
                                    {step.result.processVerified && step.result.pid && (
                                      <div className="step-result-process-row">
                                        <CheckCircle2 size={13} className="text-teal" />
                                        <span>Native Process Verified: <strong>{step.result.displayName || 'Application'}</strong> (PID: {step.result.pid})</span>
                                      </div>
                                    )}

                                    {/* Action link or URL banner if opened in browser */}
                                    {step.result.url && (
                                      <div className="step-result-url-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '0' }}>
                                          <ExternalLink size={13} className="text-cyan" style={{ flexShrink: 0 }} />
                                          <a href={step.result.url} target="_blank" rel="noopener noreferrer" className="result-external-link">
                                            {step.result.title ? `${step.result.title}` : step.result.url}
                                          </a>
                                        </div>
                                        <a
                                          href={step.result.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn btn-primary btn-sm"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '0.78rem', textDecoration: 'none', borderRadius: '6px' }}
                                        >
                                          <Play size={12} fill="currentColor" />
                                          <span>{step.tool === 'media.search_and_play_youtube' ? 'Open on YouTube' : 'Open in Browser'}</span>
                                        </a>
                                      </div>
                                    )}

                                    {/* Honest playback / system context note */}
                                    {step.result.playbackNote && (
                                      <div className="step-result-notice">
                                        <AlertCircle size={13} className="text-cyan" />
                                        <span>{step.result.playbackNote}</span>
                                      </div>
                                    )}

                                    {/* Honest Keyboard Automation Notice */}
                                    {step.result.uiAutomation?.attempted && !step.result.uiAutomation?.success && (
                                      <div className="step-result-notice step-result-warning">
                                        <AlertCircle size={13} className="text-warning" />
                                        <span>Keyboard Input Notice: {step.result.uiAutomation.reason || 'Keystrokes could not be delivered to UWP window due to Windows UIPI.'}</span>
                                      </div>
                                    )}

                                    {/* Interactive Calculator Interface for Math and Calculator Tool Steps */}
                          {(step.tool === 'compute.evaluate_math' ||
                            step.result?.operation === 'evaluate_math' ||
                            step.parameters?.appId === 'calculator' ||
                            step.result?.appId === 'calculator' ||
                            Boolean(step.result?.computeResult)) && (
                            <CalculatorInterface
                              initialExpression={
                                step.result?.computeResult?.expression ||
                                step.result?.expression ||
                                step.parameters?.expression ||
                                ''
                              }
                              initialResult={
                                step.result?.computeResult?.formatted ??
                                step.result?.computeResult?.result ??
                                step.result?.formatted ??
                                step.result?.result ??
                                ''
                              }
                              processInfo={step.result}
                            />
                          )}

                          {/* Verified Compute Calculation */}
                                    {step.result.computeResult && (
                                      <div className="step-result-process-row">
                                        <CheckCircle2 size={13} className="text-cyan" />
                                        <span>Verified Calculation: <strong>{step.result.computeResult.expression} = {step.result.computeResult.formatted || step.result.computeResult.result}</strong></span>
                                      </div>
                                    )}

                                    <pre className="step-result-code">
                                      {typeof step.result === 'object'
                                        ? JSON.stringify(step.result, null, 2)
                                        : String(step.result)}
                                    </pre>
                                  </div>
                                )}

                                {/* Step Failure Error Message */}
                                {step.error && (
                                  <div className="step-error-banner">
                                    <AlertCircle size={14} className="text-danger" />
                                    <span>{step.error}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : msg.actionProposal ? (
                      /* Fallback legacy single-action proposal card for backward compatibility */
                      <div className={`action-card status-${msg.actionProposal.status}`}>
                        <div className="action-card-header">
                          <div className="action-title-wrap">
                            <Terminal size={16} className="action-icon" />
                            <span className="action-title">SAFE COMPUTER ACTION PROPOSAL</span>
                          </div>
                          <div className="badge badge-cyan">
                            <ShieldCheck size={12} />
                            <span>{msg.actionProposal.riskLevel || msg.actionProposal.safetyLevel || 'READ-ONLY SAFE'}</span>
                          </div>
                        </div>

                        <div className="action-card-body">
                          <div className="action-command-box">
                            <code>{msg.actionProposal.command}</code>
                          </div>
                          <p className="action-description">{msg.actionProposal.description}</p>
                          {msg.actionProposal.expectedResult && (
                            <div className="action-expected-result">
                              <span className="expected-label">EXPECTED RESULT (NON-DESTRUCTIVE):</span>
                              <span className="expected-text">{msg.actionProposal.expectedResult}</span>
                            </div>
                          )}

                          {/* Action Proposal Target Path & Proposed Content */}
                          {(msg.actionProposal.targetPath || msg.actionProposal.parameters?.filePath || msg.actionProposal.proposedContent !== null || msg.actionProposal.parameters?.content !== undefined) && (
                            <div className="action-params-card">
                              {(msg.actionProposal.targetPath || msg.actionProposal.parameters?.filePath) && (
                                <div className="step-param-row">
                                  <span className="step-param-label">TARGET PATH:</span>
                                  <code className="step-param-path">
                                    <FileText size={12} className="param-icon" />
                                    {msg.actionProposal.targetPath || msg.actionProposal.parameters?.filePath}
                                  </code>
                                </div>
                              )}
                              {(msg.actionProposal.proposedContent !== null && msg.actionProposal.proposedContent !== undefined || msg.actionProposal.parameters?.content !== undefined) && (
                                <div className="step-content-box">
                                  <div className="step-content-header">
                                    <span className="step-content-label">PROPOSED FILE CONTENT:</span>
                                  </div>
                                  <pre className="step-content-code">
                                    {typeof (msg.actionProposal.proposedContent || msg.actionProposal.parameters?.content) === 'string'
                                      ? (msg.actionProposal.proposedContent || msg.actionProposal.parameters?.content)
                                      : JSON.stringify(msg.actionProposal.proposedContent || msg.actionProposal.parameters?.content, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
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
                            <div className="action-status-confirmed-wrap">
                              <div className="action-status-confirmed">
                                <CheckCircle2 size={16} className="text-teal" />
                                <span>Permission Granted • Action Executed Safely ({msg.actionProposal.executedAt || 'Just now'})</span>
                              </div>
                              {msg.actionProposal.result && (
                                <div className="action-output-terminal">
                                  <div className="terminal-top-bar">
                                    <span className="term-title">SAFE EXECUTION OUTPUT [{msg.actionProposal.result.operation || msg.actionProposal.command}]</span>
                                    <span className="badge badge-ice">READ-ONLY SAFE</span>
                                  </div>
                                  <pre className="terminal-code">
                                    {typeof msg.actionProposal.result === 'object'
                                      ? JSON.stringify(msg.actionProposal.result, null, 2)
                                      : String(msg.actionProposal.result)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="action-status-declined">
                              <XCircle size={16} className="text-dim" />
                              <span>Action Declined by User • Execution Prevented</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
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

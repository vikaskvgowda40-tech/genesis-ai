import React, { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  Eye,
  Mic,
  Brain,
  Volume2,
  Terminal,
  Cpu,
  Clock,
  Layers,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Download,
  FileJson,
  Check
} from 'lucide-react';
import './ActivityStatusPanel.css';

export default function ActivityStatusPanel({
  currentState = 'idle',
  audioLevel = 0,
  actionHistory = [],
  pipelineStats = {},
  isVoiceMuted = false,
  isListening = false,
  isSpeaking = false,
  isLiveVisionActive = false,
  selectedLanguage = 'en-IN'
}) {
  const [isExported, setIsExported] = useState(false);

  const languageLabels = {
    'en-IN': 'English (India)',
    'hi-IN': 'Hindi (हिन्दी)',
    'kn-IN': 'Kannada (ಕನ್ನಡ)',
    'ta-IN': 'Tamil (தமிழ்)',
    'te-IN': 'Telugu (తెలుగు)'
  };
  const activeLangName = languageLabels[selectedLanguage] || 'English (India)';

  const handleExportAuditLedger = () => {
    const sensitiveRegex = /(key|secret|token|auth|cred|password|\.env)/i;

    const sanitizeVal = (val) => {
      if (!val || typeof val !== 'object') return val;
      if (Array.isArray(val)) return val.map(sanitizeVal);
      const clean = {};
      for (const [k, v] of Object.entries(val)) {
        if (sensitiveRegex.test(k)) continue;
        clean[k] = sanitizeVal(v);
      }
      return clean;
    };

    const sanitizedEvents = actionHistory.map((act) => ({
      id: act.id,
      command: act.command,
      status: act.status,
      riskLevel: act.riskLevel || 'READ-ONLY SAFE',
      timestamp: act.timestamp,
      executionTimeMs: act.executionTimeMs ?? null,
      outputSummary: act.outputSummary || null,
      result: act.result ? sanitizeVal(act.result) : null
    }));

    const exportData = {
      project: 'GENESIS AI',
      edition: 'Hack Day Bengaluru 2026',
      exportTimestamp: new Date().toISOString(),
      securityArchitecture: 'Zero-Trust Permission-Gated Sandbox (Strict Human Operator Authorization)',
      allowlistedOperations: [
        'inspect_project_structure',
        'inspect_package_dependencies',
        'inspect_dev_environment',
        'analyze_code_metrics',
        'verify_sandbox_environment',
        'docker_sandbox_init'
      ],
      totalLoggedActions: sanitizedEvents.length,
      metrics: {
        authorized: sanitizedEvents.filter((a) => a.status === 'authorized').length,
        declined: sanitizedEvents.filter((a) => a.status === 'declined').length,
        pending: sanitizedEvents.filter((a) => a.status === 'pending').length
      },
      events: sanitizedEvents
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `genesis-audit-ledger-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExported(true);
    setTimeout(() => setIsExported(false), 2500);
  };

  const multimodalModules = [
    {
      id: 'see',
      name: 'SEE (Vision)',
      model: 'Gemini 3.8 Vision Engine',
      icon: Eye,
      status: isLiveVisionActive ? 'LIVE CAPTURE' : 'ACTIVE',
      colorClass: 'cyan'
    },
    {
      id: 'hear',
      name: 'HEAR (Voice)',
      model: `Web Speech API [${selectedLanguage}]`,
      icon: Mic,
      status: (isListening || currentState === 'listening') ? 'RECORDING' : 'READY',
      colorClass: 'teal'
    },
    {
      id: 'think',
      name: 'THINK (Reason)',
      model: 'Google Gemini 3.8 Flash',
      icon: Brain,
      status: currentState === 'thinking' ? 'COMPUTING' : 'ONLINE',
      colorClass: 'ice'
    },
    {
      id: 'speak',
      name: 'SPEAK (TTS)',
      model: `TTS Engine [${selectedLanguage}]`,
      icon: Volume2,
      status: (isSpeaking || currentState === 'speaking') ? 'READING ALOUD' : (isVoiceMuted ? 'MUTED' : 'READY'),
      colorClass: 'cyan'
    },
    {
      id: 'act',
      name: 'ACT (Computer)',
      model: 'Strict Read-Only Allowlist',
      icon: Terminal,
      status: actionHistory.some(a => a.status === 'pending')
        ? 'AWAITING AUTH'
        : currentState === 'thinking' && actionHistory.some(a => a.status === 'authorizing')
        ? 'EXECUTING'
        : 'ENFORCED',
      colorClass: 'teal'
    }
  ];

  return (
    <aside className="activity-panel glass-panel">
      {/* Panel Header */}
      <div className="activity-header">
        <div className="activity-title-wrap">
          <Activity size={17} className="activity-icon" />
          <h2 className="activity-title">SYSTEM HUD & AUDIT</h2>
        </div>
        <span className={`status-dot ${currentState}`} />
      </div>

      <div className="activity-scroll-body">
        {/* Multimodal Pipeline Status */}
        <div className="hud-section">
          <div className="hud-section-header">
            <Layers size={14} />
            <span>MULTIMODAL PIPELINE</span>
          </div>

          <div className="pipeline-cards-list">
            {multimodalModules.map((mod) => {
              const IconComp = mod.icon;
              return (
                <div key={mod.id} className="pipeline-card">
                  <div className={`mod-icon-box ${mod.colorClass}`}>
                    <IconComp size={15} />
                  </div>
                  <div className="mod-info">
                    <div className="mod-name-row">
                      <span className="mod-name">{mod.name}</span>
                      <span className={`mod-status ${mod.status.toLowerCase()}`}>
                        {mod.status}
                      </span>
                    </div>
                    <div className="mod-model">{mod.model}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Telemetry */}
        <div className="hud-section">
          <div className="hud-section-header">
            <Cpu size={14} />
            <span>AI CORE TELEMETRY</span>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-item">
              <span className="telemetry-label">SYSTEM STATE</span>
              <span className="telemetry-value highlight">{currentState.toUpperCase()}</span>
            </div>

            <div className="telemetry-item">
              <span className="telemetry-label">AUDIO INGEST</span>
              <div className="audio-meter-bar">
                <div
                  className="audio-meter-fill"
                  style={{ width: `${Math.max(12, audioLevel * 100)}%` }}
                />
              </div>
            </div>

            <div className="telemetry-item">
              <span className="telemetry-label">REASONING CORE</span>
              <span className="telemetry-value">Gemini 3.8 Flash (Active)</span>
            </div>

            <div className="telemetry-item">
              <span className="telemetry-label">VOICE SYNTHESIS</span>
              <span className="telemetry-value">
                {isSpeaking || currentState === 'speaking'
                  ? 'Speaking Aloud'
                  : isVoiceMuted
                  ? 'Muted (Audio Off)'
                  : 'Web Speech Synthesis'}
              </span>
            </div>

            <div className="telemetry-item">
              <span className="telemetry-label">VOICE LANGUAGE</span>
              <span className="telemetry-value highlight">{activeLangName}</span>
            </div>
          </div>
        </div>

        {/* Safe Computer Actions Audit Gate */}
        <div className="hud-section">
          <div className="hud-section-header hud-header-with-action">
            <div className="hud-header-title">
              <ShieldCheck size={14} />
              <span>SAFE COMPUTER ACTIONS LOG</span>
            </div>
            <button
              type="button"
              className="btn-export-audit"
              onClick={handleExportAuditLedger}
              title="Download verified session security audit ledger as JSON"
              id="btn-export-audit-ledger"
            >
              {isExported ? (
                <>
                  <Check size={12} className="text-teal" />
                  <span>EXPORTED</span>
                </>
              ) : (
                <>
                  <Download size={12} />
                  <span>EXPORT LEDGER</span>
                </>
              )}
            </button>
          </div>

          <div className="security-badges-row">
            <div className="security-status-badge">
              <ShieldCheck size={14} className="text-teal" />
              <span>SAFETY GATE: STRICT USER PERMISSION</span>
            </div>
            <div className="policy-sub-badge">
              <ShieldAlert size={12} className="text-ice" />
              <span>ARBITRARY SHELL: STRICTLY BLOCKED</span>
            </div>
          </div>

          <div className="audit-stats-row">
            <span className="stat-pill">TOTAL: {actionHistory.length}</span>
            <span className="stat-pill teal">AUTH: {actionHistory.filter(a => a.status === 'authorized').length}</span>
            <span className="stat-pill dim">DECLINED: {actionHistory.filter(a => a.status === 'declined').length}</span>
          </div>

          <div className="actions-history-list">
            {actionHistory.length === 0 ? (
              <div className="empty-history">
                <Clock size={14} />
                <span>No actions executed in this session</span>
              </div>
            ) : (
              actionHistory.map((act) => (
                <div key={act.id} className={`action-history-item status-${act.status}`}>
                  <div className="history-item-top">
                    <span className="history-command">{act.command}</span>
                    <span className={`history-badge ${act.status}`}>
                      {act.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="history-item-mid">
                    <span className="history-risk">{act.riskLevel || 'READ-ONLY SAFE'}</span>
                    {act.executionTimeMs !== undefined && (
                      <span className="history-timing">{act.executionTimeMs}ms</span>
                    )}
                  </div>
                  {act.outputSummary && (
                    <div className="history-item-summary">{act.outputSummary}</div>
                  )}
                  <div className="history-item-time">{act.timestamp}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hackathon Meta Banner */}
        <div className="hackathon-badge-container">
          <div className="badge badge-cyan w-full">
            <span>⚡ HACK DAY BENGALURU 2026 LIVE</span>
          </div>
          <p className="hackathon-sub">
            Autonomous Multimodal Agent live on Google Gemini 3.8 Flash with Web Audio, Indian multilingual speech, and zero-trust permission sandbox.
          </p>
        </div>
      </div>
    </aside>
  );
}

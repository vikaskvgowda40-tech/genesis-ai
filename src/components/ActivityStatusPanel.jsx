import React from 'react';
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
  AlertCircle
} from 'lucide-react';
import './ActivityStatusPanel.css';

export default function ActivityStatusPanel({
  currentState = 'idle',
  audioLevel = 0,
  actionHistory = [],
  pipelineStats = {}
}) {
  const multimodalModules = [
    {
      id: 'see',
      name: 'SEE (Vision)',
      model: 'Gemma 2 Multimodal',
      icon: Eye,
      status: 'READY',
      colorClass: 'cyan'
    },
    {
      id: 'hear',
      name: 'HEAR (Voice)',
      model: 'Web Audio Stream',
      icon: Mic,
      status: currentState === 'listening' ? 'ACTIVE' : 'READY',
      colorClass: 'teal'
    },
    {
      id: 'think',
      name: 'THINK (Reason)',
      model: 'Gemma 2B / 9B',
      icon: Brain,
      status: currentState === 'thinking' ? 'COMPUTING' : 'STANDBY',
      colorClass: 'ice'
    },
    {
      id: 'speak',
      name: 'SPEAK (TTS)',
      model: 'Sarvam AI Bulbul',
      icon: Volume2,
      status: currentState === 'speaking' ? 'SYNTHESIZING' : 'READY',
      colorClass: 'cyan'
    },
    {
      id: 'act',
      name: 'ACT (Computer)',
      model: 'Permission Sandbox',
      icon: Terminal,
      status: 'ENFORCED',
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
              <span className="telemetry-value">Gemma 2 (Simulated)</span>
            </div>

            <div className="telemetry-item">
              <span className="telemetry-label">VOICE SYNTHESIS</span>
              <span className="telemetry-value">Sarvam AI (Indian TTS)</span>
            </div>
          </div>
        </div>

        {/* Safe Computer Actions Audit Gate */}
        <div className="hud-section">
          <div className="hud-section-header">
            <ShieldCheck size={14} />
            <span>SAFE COMPUTER ACTIONS LOG</span>
          </div>

          <div className="security-status-badge">
            <ShieldCheck size={14} className="text-teal" />
            <span>SAFETY GATE: STRICT USER PERMISSION</span>
          </div>

          <div className="actions-history-list">
            {actionHistory.length === 0 ? (
              <div className="empty-history">
                <Clock size={14} />
                <span>No actions executed in this session</span>
              </div>
            ) : (
              actionHistory.map((act) => (
                <div key={act.id} className="action-history-item">
                  <div className="history-item-top">
                    <span className="history-command">{act.command}</span>
                    <span className={`history-badge ${act.status}`}>
                      {act.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="history-item-time">{act.timestamp}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hackathon Meta Banner */}
        <div className="hackathon-badge-container">
          <div className="badge badge-simulated w-full">
            <span>⚡ HACK DAY BENGALURU 2026 DEMO</span>
          </div>
          <p className="hackathon-sub">
            Frontend prototype running in zero-API-key simulation mode. Multimodal hooks wired for Gemma & Sarvam AI.
          </p>
        </div>
      </div>
    </aside>
  );
}

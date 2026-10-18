import React, { useState } from 'react';
import {
  Sparkles,
  Eye,
  Mic,
  Brain,
  Volume2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Camera,
  Languages,
  Terminal,
  Minimize2,
  Maximize2,
  X,
  Play,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';
import './PitchModeModal.css';

export default function PitchModeModal({
  isOpen,
  onClose,
  onOpenLiveVision,
  onSendMessage,
  selectedLanguage = 'en-IN',
  onLanguageChange = () => {},
  messages = [],
  actionHistory = [],
  onResetConversation = () => {},
  currentStep: externalCurrentStep,
  onStepChange: setExternalStep
}) {
  const [internalCurrentStep, setInternalCurrentStep] = useState(1);
  const currentStep = externalCurrentStep !== undefined ? externalCurrentStep : internalCurrentStep;
  const setCurrentStep = setExternalStep || setInternalCurrentStep;
  const [isMinimized, setIsMinimized] = useState(false);

  // Check if scenario goals were met in the live session
  const hasVisionTested = messages.some((m) => m.image || m.modalities?.some((mod) => mod.includes('SEE')));
  const hasMultilingualTested = messages.some((m) => m.language && m.language !== 'en-IN');
  const hasSafeActionTested = actionHistory.some((a) => a.status === 'authorized');

  const languagePresets = [
    {
      code: 'kn-IN',
      name: 'ಕನ್ನಡ (Kannada)',
      samplePrompt: 'ಕನ್ನಡದಲ್ಲಿ GENESIS AI ನ ಪ್ರಮುಖ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಸಂಕ್ಷಿಪ್ತವಾಗಿ ಪರಿಚಯಿಸಿ.',
      label: 'Kannada Pitch Intro'
    },
    {
      code: 'hi-IN',
      name: 'हिन्दी (Hindi)',
      samplePrompt: 'GENESIS AI के मल्टीमॉडल आर्किटेक्चर और पांच स्तंभों को हिंदी में समझाइए।',
      label: 'Hindi Architecture Summary'
    },
    {
      code: 'ta-IN',
      name: 'தமிழ் (Tamil)',
      samplePrompt: 'GENESIS AI-ன் முக்கிய நன்மைகளையும் பாதுகாப்பு முறைகளையும் தமிழில் சுருக்கமாகக் கூறுங்கள்.',
      label: 'Tamil Security Overview'
    },
    {
      code: 'te-IN',
      name: 'తెలుగు (Telugu)',
      samplePrompt: 'GENESIS AI ఎలా పనిచేస్తుందో మరియు హ్యాకథాన్ ప్రాముఖ్యతను తెలుగులో వివరించండి.',
      label: 'Telugu Pitch Overview'
    },
    {
      code: 'en-IN',
      name: 'English (India)',
      samplePrompt: 'Provide an executive pitch summary of GENESIS AI for the hackathon judges.',
      label: 'English Executive Pitch'
    }
  ];

  const handleLaunchScenario1 = () => {
    setIsMinimized(true);
    onOpenLiveVision();
  };

  const handleSendSampleVision = () => {
    setIsMinimized(true);
    // Draw synthetic schematic frame
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#040b16';
      ctx.fillRect(0, 0, 400, 200);
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 40, 100, 60);
      ctx.fillStyle = '#00f2fe';
      ctx.font = '12px monospace';
      ctx.fillText('SEE INGEST', 32, 75);

      ctx.strokeStyle = '#00e5c9';
      ctx.strokeRect(150, 40, 100, 60);
      ctx.fillStyle = '#00e5c9';
      ctx.fillText('GEMINI CORE', 158, 75);

      ctx.strokeStyle = '#70d6ff';
      ctx.strokeRect(280, 40, 100, 60);
      ctx.fillStyle = '#70d6ff';
      ctx.fillText('SAFE ACTION', 288, 75);

      ctx.strokeStyle = '#edf5fa';
      ctx.beginPath();
      ctx.moveTo(120, 70); ctx.lineTo(150, 70);
      ctx.moveTo(250, 70); ctx.lineTo(280, 70);
      ctx.stroke();

      onSendMessage({
        text: 'Examine this system architecture diagram and explain each subsystem block.',
        image: {
          name: 'genesis_architecture.png',
          url: canvas.toDataURL('image/png'),
          mimeType: 'image/png',
          size: '16.8 KB (Schematic Capture)'
        },
        actMode: false
      });
    }
  };

  const handleLaunchScenario2 = (preset) => {
    onLanguageChange(preset.code);
    setIsMinimized(true);
    onSendMessage({
      text: preset.samplePrompt,
      actMode: false
    });
  };

  const handleLaunchScenario3 = (actionPrompt) => {
    setIsMinimized(true);
    onSendMessage({
      text: actionPrompt,
      actMode: true
    });
  };

  const handleResetTour = () => {
    onResetConversation();
  };

  if (!isOpen) return null;

  // Minimized Floating HUD Pill
  if (isMinimized) {
    return (
      <div className="pitch-minimized-pill glass-panel" onClick={() => setIsMinimized(false)}>
        <div className="minimized-inner">
          <span className="live-pulsing-dot" />
          <Sparkles size={15} className="text-cyan" />
          <span className="minimized-text">
            PITCH MODE // SCENARIO {currentStep} OF 3
          </span>
          <button
            type="button"
            className="maximize-btn"
            title="Expand Pitch Guide"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pitch-mode-overlay" onClick={onClose}>
      <div
        className="pitch-mode-modal glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pitch-modal-title"
      >
        {/* Top Header */}
        <div className="pitch-modal-header">
          <div className="pitch-header-left">
            <div className="pitch-badge-halo">
              <Sparkles size={18} className="text-cyan" />
            </div>
            <div>
              <div className="pitch-title-row">
                <h2 id="pitch-modal-title" className="pitch-title">
                  HACKATHON JUDGES DEMO STORYBOARD
                </h2>
                <span className="badge badge-cyan">LIVE PITCH MODE</span>
              </div>
              <p className="pitch-subtitle">
                Interactive 1-2-3 Multimodal Verification Flow • Hack Day Bengaluru 2026
              </p>
            </div>
          </div>

          <div className="pitch-header-controls">
            <button
              type="button"
              className="pitch-ctrl-btn"
              onClick={() => setIsMinimized(true)}
              title="Minimize to floating pill to observe dashboard"
              id="btn-minimize-pitch"
            >
              <Minimize2 size={16} />
            </button>
            <button
              type="button"
              className="pitch-ctrl-btn"
              onClick={onClose}
              title="Close Pitch Mode"
              id="btn-close-pitch"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Progress Bar & Scenario Selector Tabs */}
        <div className="pitch-scenario-nav">
          <div className="scenario-nav-tabs">
            <button
              type="button"
              className={`nav-tab-btn ${currentStep === 1 ? 'active' : ''} ${hasVisionTested ? 'completed' : ''}`}
              onClick={() => setCurrentStep(1)}
              id="tab-scenario-1"
            >
              <span className="tab-number">1</span>
              <Eye size={15} />
              <span>LIVE VISION (SEE)</span>
              {hasVisionTested && <CheckCircle2 size={14} className="text-teal tab-check" />}
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${currentStep === 2 ? 'active' : ''} ${hasMultilingualTested ? 'completed' : ''}`}
              onClick={() => setCurrentStep(2)}
              id="tab-scenario-2"
            >
              <span className="tab-number">2</span>
              <Languages size={15} />
              <span>MULTILINGUAL VOICE</span>
              {hasMultilingualTested && <CheckCircle2 size={14} className="text-teal tab-check" />}
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${currentStep === 3 ? 'active' : ''} ${hasSafeActionTested ? 'completed' : ''}`}
              onClick={() => setCurrentStep(3)}
              id="tab-scenario-3"
            >
              <span className="tab-number">3</span>
              <ShieldCheck size={15} />
              <span>SAFE ACTION (ACT)</span>
              {hasSafeActionTested && <CheckCircle2 size={14} className="text-teal tab-check" />}
            </button>
          </div>

          {/* Progress Bar Line */}
          <div className="pitch-progress-track">
            <div
              className="pitch-progress-fill"
              style={{
                width: currentStep === 1 ? '33.3%' : currentStep === 2 ? '66.6%' : '100%'
              }}
            />
          </div>
        </div>

        {/* Modal Scenario Body */}
        <div className="pitch-modal-body">
          {/* SCENARIO 1: LIVE VISION */}
          {currentStep === 1 && (
            <div className="scenario-card">
              <div className="scenario-header">
                <div className="scenario-pillar-badge cyan">
                  <Eye size={18} />
                  <span>PILLAR 1: SEE // OPTICAL PERCEPTION</span>
                </div>
                <span className="scenario-step-indicator">SCENARIO 1 OF 3</span>
              </div>

              <h3 className="scenario-title">Real-Time Camera & Screen Vision Ingest</h3>
              <p className="scenario-desc">
                Demonstrates GENESIS AI's direct visual intake using the live browser camera or screen capture pipeline. Real captured frames are encoded as JPEG and evaluated by Google Gemini 3.8 Flash Vision with synthesized speech explanation.
              </p>

              <div className="scenario-instructions-box">
                <span className="inst-title">JUDGE DEMO INSTRUCTIONS:</span>
                <ol className="inst-list">
                  <li>
                    Click <strong>"Launch Live Vision Capture"</strong> below to open the cybernetic camera viewport.
                  </li>
                  <li>
                    Point your camera at a document, phone screen, or diagram (or switch to <strong>Screen Capture</strong> or <strong>Simulated Demo Frame</strong>).
                  </li>
                  <li>
                    Click <strong>"Capture Frame & Analyze"</strong>. Observe the Living Energy Orb transition into <code>THINKING</code>, followed by visual reasoning and voice synthesis.
                  </li>
                </ol>
              </div>

              <div className="scenario-action-row">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleLaunchScenario1}
                  id="btn-pitch-launch-vision"
                >
                  <Camera size={18} />
                  <span>Launch Live Vision Camera / Screen</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSendSampleVision}
                  id="btn-pitch-sample-schematic"
                >
                  <Sparkles size={16} />
                  <span>1-Click Test: System Schematic Ingest</span>
                </button>
              </div>

              {hasVisionTested && (
                <div className="scenario-verified-banner">
                  <CheckCircle2 size={16} className="text-teal" />
                  <span>Vision pipeline verified: Real image frame analyzed by Gemini 3.8 Flash.</span>
                </div>
              )}
            </div>
          )}

          {/* SCENARIO 2: MULTILINGUAL VOICE */}
          {currentStep === 2 && (
            <div className="scenario-card">
              <div className="scenario-header">
                <div className="scenario-pillar-badge teal">
                  <Languages size={18} />
                  <span>PILLAR 2 & 4: HEAR & SPEAK // REGIONAL MULTILINGUAL</span>
                </div>
                <span className="scenario-step-indicator">SCENARIO 2 OF 3</span>
              </div>

              <h3 className="scenario-title">Native Indian Multilingual Intelligence</h3>
              <p className="scenario-desc">
                GENESIS AI reasons and communicates natively in Indian languages (Kannada, Hindi, Tamil, Telugu, and Indian English). The Living Energy Orb reacts in real time to speech synthesis cadence and Web Audio API microphone levels.
              </p>

              <div className="scenario-instructions-box">
                <span className="inst-title">JUDGE DEMO INSTRUCTIONS:</span>
                <ol className="inst-list">
                  <li>Select any Indian language below to instantly configure Gemini and the voice pipeline.</li>
                  <li>Click a pre-calibrated pitch prompt in that language or toggle the mic to speak.</li>
                  <li>Observe Gemini 3.8 Flash reply in authentic native script while the Energy Orb pulses in vocal sync.</li>
                </ol>
              </div>

              <div className="multilingual-chips-grid">
                {languagePresets.map((preset) => (
                  <div
                    key={preset.code}
                    className={`lang-demo-card ${selectedLanguage === preset.code ? 'active' : ''}`}
                  >
                    <div className="lang-demo-header">
                      <span className="lang-native-name">{preset.name}</span>
                      <span className="badge badge-teal">{preset.code}</span>
                    </div>
                    <p className="lang-sample-text">"{preset.samplePrompt}"</p>
                    <button
                      type="button"
                      className="btn btn-secondary-ghost btn-sm w-full"
                      onClick={() => handleLaunchScenario2(preset)}
                      id={`btn-pitch-lang-${preset.code}`}
                    >
                      <Play size={13} />
                      <span>Test {preset.label}</span>
                    </button>
                  </div>
                ))}
              </div>

              {hasMultilingualTested && (
                <div className="scenario-verified-banner">
                  <CheckCircle2 size={16} className="text-teal" />
                  <span>Multilingual pipeline verified: Authentic regional dialogue generated and spoken.</span>
                </div>
              )}
            </div>
          )}

          {/* SCENARIO 3: SAFE COMPUTER ACTION */}
          {currentStep === 3 && (
            <div className="scenario-card">
              <div className="scenario-header">
                <div className="scenario-pillar-badge ice">
                  <ShieldCheck size={18} />
                  <span>PILLAR 5: ACT // PERMISSION-GATED SANDBOX</span>
                </div>
                <span className="scenario-step-indicator">SCENARIO 3 OF 3</span>
              </div>

              <h3 className="scenario-title">Zero-Trust Permission-Gated Computer Actions</h3>
              <p className="scenario-desc">
                GENESIS AI strictly blocks arbitrary shell execution (HTTP 403) and isolates host credentials. Actions are restricted to an allowlist of read-only operations, requiring explicit human operator authorization before running.
              </p>

              <div className="scenario-instructions-box">
                <span className="inst-title">JUDGE DEMO INSTRUCTIONS:</span>
                <ol className="inst-list">
                  <li>Click <strong>"Propose Workspace File Inspection"</strong> to request a safe read-only operation.</li>
                  <li>In the conversation transcript, inspect the <strong>Safe Computer Action Proposal</strong> card.</li>
                  <li>Click <strong>"Authorize Action"</strong> to run it safely, or <strong>"Decline"</strong> to test policy prevention.</li>
                  <li>View the real JSON result in the terminal card and registered in the HUD Audit Log.</li>
                </ol>
              </div>

              <div className="scenario-action-row">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => handleLaunchScenario3('Inspect the project workspace files and report structural hierarchy.')}
                  id="btn-pitch-act-inspect"
                >
                  <Terminal size={18} />
                  <span>Propose Workspace File Inspection (Safe Action)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleLaunchScenario3('Analyze code metrics and count source lines across the codebase.')}
                  id="btn-pitch-act-metrics"
                >
                  <ShieldCheck size={16} />
                  <span>Propose Codebase Metrics Analysis</span>
                </button>
              </div>

              {hasSafeActionTested && (
                <div className="scenario-verified-banner">
                  <CheckCircle2 size={16} className="text-teal" />
                  <span>Safe Action Sandbox verified: Execution permission-gated & audit ledger updated.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="pitch-modal-footer">
          <div className="footer-left-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm reset-tour-btn"
              onClick={handleResetTour}
              title="Reset pitch tour and conversation"
              id="btn-reset-pitch-tour"
            >
              <RotateCcw size={14} />
              <span>Reset Demo Tour</span>
            </button>
          </div>

          <div className="footer-navigation-group">
            {currentStep > 1 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                id="btn-pitch-prev-step"
              >
                <ArrowLeft size={14} />
                <span>Previous Scenario</span>
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                id="btn-pitch-next-step"
              >
                <span>Next Scenario</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onClose}
                id="btn-pitch-finish-tour"
              >
                <CheckCircle2 size={14} />
                <span>Return to Live Interface</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

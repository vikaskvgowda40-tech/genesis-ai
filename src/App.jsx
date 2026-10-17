import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import EnergyOrb from './components/EnergyOrb';
import CommandCenter from './components/CommandCenter';
import TranscriptArea from './components/TranscriptArea';
import ActivityStatusPanel from './components/ActivityStatusPanel';
import { Eye, Mic, Brain, Volume2, ShieldCheck, Sparkles } from 'lucide-react';
import './App.css';

export default function App() {
  const [currentState, setCurrentState] = useState('idle');
  const [audioLevel, setAudioLevel] = useState(0.1);
  const [isListening, setIsListening] = useState(false);
  const [actionHistory, setActionHistory] = useState([
    {
      id: 'act-0',
      command: 'verify_sandbox_environment --isolated',
      status: 'authorized',
      timestamp: '10:20:15'
    }
  ]);

  // Initial welcome and demo messages showing all multimodal pillars
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'genesis',
      text: "Greetings. I am GENESIS AI, an autonomous multimodal assistant designed for Hack Day Bengaluru 2026. I perceive through Vision (See), Voice (Hear), reason with Gemma (Think), synthesize speech with Sarvam AI (Speak), and execute safe, permission-gated actions (Act).",
      timestamp: '10:21:00',
      modalities: ['SEE', 'HEAR', 'THINK', 'SPEAK', 'ACT'],
      thinkingChain: {
        tokens: 168,
        latency: '240ms',
        steps: [
          'Initialized multimodal sensory ingest pipelines.',
          'Calibrated Gemma 2 reasoning context for Bengaluru Hack Day.',
          'Verified Sarvam AI Bulbul TTS voice synthesis bridge.',
          'Armed permission-based computer action sandbox.'
        ]
      },
      audioResponse: {
        language: 'Indian English (Sarvam Bulbul)',
        duration: '0:06'
      },
      actionProposal: {
        command: 'docker_sandbox_init --container=hackday2026',
        description: 'Initialize a safe, isolated container for executing demo computations without host access.',
        safetyLevel: 'SANDBOX ISOLATED',
        status: 'authorized',
        executedAt: '10:21:05'
      }
    }
  ]);

  // Audio level simulation loop when listening or speaking
  useEffect(() => {
    let intervalId;
    if (currentState === 'listening') {
      intervalId = setInterval(() => {
        setAudioLevel(0.3 + Math.random() * 0.65);
      }, 100);
    } else if (currentState === 'speaking') {
      intervalId = setInterval(() => {
        setAudioLevel(0.2 + Math.random() * 0.5);
      }, 120);
    } else {
      setAudioLevel(0.08 + Math.random() * 0.05);
    }

    return () => clearInterval(intervalId);
  }, [currentState]);

  // Handle user sending a prompt / message
  const handleSendMessage = ({ text, image }) => {
    const userMsgId = 'user-' + Date.now();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newUserMsg = {
      id: userMsgId,
      sender: 'user',
      text: text || (image ? "Please analyze this uploaded image." : ""),
      image: image || null,
      timestamp: currentTime
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setCurrentState('thinking');

    // Simulate Gemma reasoning latency
    setTimeout(() => {
      generateGenesisResponse({ userText: text, userImage: image });
    }, 1800);
  };

  // Generate multimodal simulated AI response
  const generateGenesisResponse = ({ userText = '', userImage = null }) => {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isImageQuery = !!userImage || userText.toLowerCase().includes('diagram') || userText.toLowerCase().includes('image');
    const isActionQuery = userText.toLowerCase().includes('act') || userText.toLowerCase().includes('action') || userText.toLowerCase().includes('run') || userText.toLowerCase().includes('script') || userText.toLowerCase().includes('clean');
    const isVoiceQuery = userText.toLowerCase().includes('sarvam') || userText.toLowerCase().includes('voice') || userText.toLowerCase().includes('speak');

    let responseText = '';
    let modalities = [];
    let thinkingSteps = [];
    let actionProposal = null;
    let audioResponse = null;

    if (isImageQuery) {
      modalities.push('SEE (Vision)', 'THINK (Gemma)');
      responseText = `I have inspected "${userImage?.name || 'the uploaded artifact'}". The schematic exhibits a modular multi-tier architecture with segregated sensory input layers and verified security barriers. All components align with Hack Day safety protocols.`;
      thinkingSteps = [
        'Multimodal Vision Ingest: Parsed 2D structural layout and node graph.',
        'Extracted semantic entities: See Engine, Gemma 2 Core, Sarvam TTS Layer.',
        'Safety validation: Verified no unauthorized network egress channels.',
        'Formulated concise situational briefing.'
      ];
    } else if (isActionQuery) {
      modalities.push('THINK (Gemma)', 'ACT (Safe Computer Action)');
      responseText = `I have analyzed your request and prepared a safe execution plan. In accordance with GENESIS Safety Directives, I require your explicit authorization before modifying files or executing scripts.`;
      thinkingSteps = [
        'Interpreted user computer action intent.',
        'Synthesized sandboxed execution command with read-only audit parameters.',
        'Generated Cryptographic Action Token (Perm-Gate-09).',
        'Paused execution awaiting human operator sign-off.'
      ];
      actionProposal = {
        command: 'genesis_agent_runner --target=workspace --audit-mode=strict',
        description: 'Execute a secure local inspection and create an activity report in the workspace sandbox.',
        safetyLevel: 'SANDBOX SAFE',
        status: 'pending'
      };
    } else {
      modalities.push('THINK (Gemma)', 'SPEAK (Sarvam AI)');
      responseText = `Processing complete. Gemma 2 evaluated your query using deep context conditioning. The reasoning tree completed with zero safety anomalies. Synthesized audio response is ready for audition.`;
      thinkingSteps = [
        'Parsed input semantic intent and constraints.',
        'Retrieved Hack Day Bengaluru 2026 situational knowledge.',
        'Gemma 2 synthesized natural language explanation.',
        'Sent audio payload to Sarvam AI Bulbul TTS pipeline.'
      ];
    }

    // Include Sarvam voice payload
    audioResponse = {
      language: userText.toLowerCase().includes('kannada') ? 'Kannada (Sarvam Bulbul)' : userText.toLowerCase().includes('hindi') ? 'Hindi (Sarvam Bulbul)' : 'Indian English (Sarvam Bulbul)',
      duration: '0:05'
    };

    const aiMsg = {
      id: 'genesis-' + Date.now(),
      sender: 'genesis',
      text: responseText,
      timestamp: currentTime,
      modalities,
      thinkingChain: {
        tokens: Math.floor(120 + Math.random() * 80),
        latency: `${Math.floor(220 + Math.random() * 140)}ms`,
        steps: thinkingSteps
      },
      audioResponse,
      actionProposal
    };

    setMessages((prev) => [...prev, aiMsg]);
    setCurrentState('speaking');

    // Return to idle after speech finishes
    setTimeout(() => {
      setCurrentState('idle');
    }, 4000);
  };

  // Voice Listening workflow
  const handleStartListening = () => {
    setIsListening(true);
    setCurrentState('listening');

    // Simulate voice query capture after 3.5s of speech
    setTimeout(() => {
      setIsListening(false);
      setCurrentState('thinking');

      setTimeout(() => {
        handleSendMessage({
          text: "GENESIS, status report on Bengaluru Hack Day 2026 multimodal subsystem readiness."
        });
      }, 1000);
    }, 3500);
  };

  const handleStopListening = () => {
    setIsListening(false);
    setCurrentState('idle');
  };

  // Authorize Computer Action
  const handleAuthorizeAction = (messageId, actionProposal) => {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.actionProposal) {
          return {
            ...msg,
            actionProposal: {
              ...msg.actionProposal,
              status: 'authorized',
              executedAt: currentTime
            }
          };
        }
        return msg;
      })
    );

    // Add to HUD Audit history
    setActionHistory((prev) => [
      {
        id: 'act-' + Date.now(),
        command: actionProposal.command,
        status: 'authorized',
        timestamp: currentTime
      },
      ...prev
    ]);
  };

  // Decline Computer Action
  const handleDeclineAction = (messageId) => {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.actionProposal) {
          return {
            ...msg,
            actionProposal: {
              ...msg.actionProposal,
              status: 'declined'
            }
          };
        }
        return msg;
      })
    );

    setActionHistory((prev) => [
      {
        id: 'act-' + Date.now(),
        command: 'User declined action',
        status: 'declined',
        timestamp: currentTime
      },
      ...prev
    ]);
  };

  // Reset conversation
  const handleResetConversation = () => {
    setMessages([]);
    setCurrentState('idle');
    setIsListening(false);
  };

  // Clicking on the orb cycles states or greets
  const handleOrbClick = () => {
    const stateCycle = {
      idle: 'listening',
      listening: 'thinking',
      thinking: 'speaking',
      speaking: 'idle'
    };
    setCurrentState(stateCycle[currentState] || 'idle');
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        currentState={currentState}
        onStateChange={setCurrentState}
        onResetConversation={handleResetConversation}
      />

      {/* Main Content Layout */}
      <main className="main-content">
        {/* Left Column: Centerpiece AI Orb + Command Center + Conversation Stream */}
        <div className="center-stage-column">
          {/* Hero Orb Section */}
          <section className="hero-orb-section glass-panel">
            <div className="orb-display-wrap">
              <EnergyOrb
                state={currentState}
                audioLevel={audioLevel}
                onClick={handleOrbClick}
              />
            </div>

            <div className="orb-caption-area">
              <div className="status-announcement">
                <span className="announcement-prefix">CORE STATUS:</span>
                <span className="announcement-state">{currentState.toUpperCase()}</span>
                <span className="announcement-detail">
                  {currentState === 'idle' && '— Calibrated and awaiting multimodal input'}
                  {currentState === 'listening' && '— Sampling voice stream via microphone'}
                  {currentState === 'thinking' && '— Gemma 2 Neural reasoning in progress'}
                  {currentState === 'speaking' && '— Sarvam AI Indian TTS voice synthesis'}
                </span>
              </div>

              {/* Five Core Pillars Pill */}
              <div className="multimodal-pillars-bar">
                <span className="pillar-item">
                  <Eye size={12} className="pillar-icon" /> SEE
                </span>
                <span className="pillar-dot">•</span>
                <span className="pillar-item">
                  <Mic size={12} className="pillar-icon" /> HEAR
                </span>
                <span className="pillar-dot">•</span>
                <span className="pillar-item">
                  <Brain size={12} className="pillar-icon" /> THINK
                </span>
                <span className="pillar-dot">•</span>
                <span className="pillar-item">
                  <Volume2 size={12} className="pillar-icon" /> SPEAK
                </span>
                <span className="pillar-dot">•</span>
                <span className="pillar-item">
                  <ShieldCheck size={12} className="pillar-icon" /> ACT
                </span>
              </div>
            </div>
          </section>

          {/* Input & Quick Command Controls */}
          <CommandCenter
            currentState={currentState}
            onSendMessage={handleSendMessage}
            onStartListening={handleStartListening}
            onStopListening={handleStopListening}
            isListening={isListening}
          />

          {/* Conversation & Action Audit Stream */}
          <TranscriptArea
            messages={messages}
            onAuthorizeAction={handleAuthorizeAction}
            onDeclineAction={handleDeclineAction}
          />
        </div>

        {/* Right Column: System Telemetry, HUD, and Permission Audit Log */}
        <ActivityStatusPanel
          currentState={currentState}
          audioLevel={audioLevel}
          actionHistory={actionHistory}
        />
      </main>
    </div>
  );
}

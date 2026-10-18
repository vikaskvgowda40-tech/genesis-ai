import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import EnergyOrb from './components/EnergyOrb';
import CommandCenter from './components/CommandCenter';
import TranscriptArea from './components/TranscriptArea';
import ActivityStatusPanel from './components/ActivityStatusPanel';
import PitchModeModal from './components/PitchModeModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ResetConfirmModal from './components/ResetConfirmModal';
import { Eye, Mic, Brain, Volume2, ShieldCheck, Sparkles } from 'lucide-react';
import './App.css';

export const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)', label: 'English', native: 'English', prefix: 'en' },
  { code: 'hi-IN', name: 'Hindi', label: 'Hindi (हिन्दी)', native: 'हिन्दी', prefix: 'hi' },
  { code: 'kn-IN', name: 'Kannada', label: 'Kannada (ಕನ್ನಡ)', native: 'ಕನ್ನಡ', prefix: 'kn' },
  { code: 'ta-IN', name: 'Tamil', label: 'Tamil (தமிழ்)', native: 'தமிழ்', prefix: 'ta' },
  { code: 'te-IN', name: 'Telugu', label: 'Telugu (తెలుగు)', native: 'తెలుగు', prefix: 'te' }
];

export default function App() {
  const [currentState, setCurrentState] = useState('idle');
  const [audioLevel, setAudioLevel] = useState(0.08);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [speechError, setSpeechError] = useState(null);
  const [isLiveVisionActive, setIsLiveVisionActive] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-IN');
  const [isPitchModeOpen, setIsPitchModeOpen] = useState(false);
  const [pitchDemoStep, setPitchDemoStep] = useState(1);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isActMode, setIsActMode] = useState(false);

  const recognitionRef = useRef(null);
  const keepAliveTimerRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const currentTranscriptRef = useRef('');
  const hasSubmittedVoiceRef = useRef(false);
  const activeImageRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animFrameRef = useRef(null);
  const speechCadenceIntervalRef = useRef(null);

  // Sync ref with selected image so voice and async handlers can access it reliably
  useEffect(() => {
    activeImageRef.current = selectedImage;
  }, [selectedImage]);

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

  // Clean up all active Web Audio API & MediaStream resources
  const stopWebAudioMicAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) { }
      micStreamRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (_) { }
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (_) { }
      audioContextRef.current = null;
    }
  };

  // Start real-time microphone Web Audio frequency and volume analysis
  const startWebAudioMicAnalysis = async () => {
    stopWebAudioMicAnalysis();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !navigator.mediaDevices?.getUserMedia) return null;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      micStreamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i] / 255;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const targetLevel = Math.min(1, Math.max(0.12, rms * 3.2));
        setAudioLevel((prev) => prev * 0.6 + targetLevel * 0.4);

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
      return stream;
    } catch (err) {
      console.warn('Web Audio mic analysis note:', err);
      return null;
    }
  };

  // Ambient baseline audio level loop when idle or thinking
  useEffect(() => {
    let intervalId;
    if (currentState === 'idle') {
      intervalId = setInterval(() => {
        setAudioLevel(0.07 + Math.sin(Date.now() / 600) * 0.03);
      }, 150);
    } else if (currentState === 'thinking') {
      intervalId = setInterval(() => {
        setAudioLevel(0.25 + Math.random() * 0.35);
      }, 100);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentState]);

  // Clean up speech synthesis, speech recognition, and Web Audio API resources on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) { }
      }
      if (keepAliveTimerRef.current) {
        clearInterval(keepAliveTimerRef.current);
      }
      if (speechCadenceIntervalRef.current) {
        clearInterval(speechCadenceIntervalRef.current);
      }
      stopWebAudioMicAnalysis();
    };
  }, []);

  // Sanitize AI markdown responses so SpeechSynthesis reads cleanly without markdown clutter
  const cleanTextForSpeech = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return '';
    return rawText
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, 'Code snippet omitted for speech.')
      // Remove inline code backticks
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown bold/italics
      .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
      // Remove markdown headers
      .replace(/^#+\s+/gm, '')
      // Remove markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove URLs
      .replace(/https?:\/\/\S+/g, '')
      // Remove bullet list symbols at line starts
      .replace(/^\s*[-*+]\s+/gm, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Real Web Speech Synthesis function with multilingual voice selection & dynamic orb cadence
  const speakText = (rawText, messageId = null, lang = selectedLanguage) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      return;
    }

    // Stop previous utterance and clear timers
    window.speechSynthesis.cancel();
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
    if (speechCadenceIntervalRef.current) {
      clearInterval(speechCadenceIntervalRef.current);
      speechCadenceIntervalRef.current = null;
    }

    const speechString = cleanTextForSpeech(rawText);
    if (!speechString) {
      setCurrentState('idle');
      setAudioLevel(0.08);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(speechString);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = lang;

      // Select voice matching language code or prefix (e.g. kn, hi, ta, te, en)
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = lang.split('-')[0].toLowerCase();
      if (voices && voices.length > 0) {
        const preferredVoice =
          voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
          voices.find((v) => v.lang.toLowerCase().includes(langPrefix)) ||
          voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('English'))) ||
          voices[0];
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      // Word/syllable boundary reaction for dynamic Energy Orb pulsation
      utterance.onboundary = () => {
        setAudioLevel((prev) => Math.min(1, Math.max(0.4, prev + 0.35)));
      };

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingMessageId(messageId);
        setCurrentState('speaking');

        // Smooth speech cadence wave driving the living orb while speaking
        let step = 0;
        speechCadenceIntervalRef.current = setInterval(() => {
          step += 0.2;
          const cadence = 0.35 + Math.sin(step) * 0.25 + Math.random() * 0.15;
          setAudioLevel((prev) => prev * 0.5 + cadence * 0.5);
        }, 80);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        if (speechCadenceIntervalRef.current) {
          clearInterval(speechCadenceIntervalRef.current);
          speechCadenceIntervalRef.current = null;
        }
        if (keepAliveTimerRef.current) {
          clearInterval(keepAliveTimerRef.current);
          keepAliveTimerRef.current = null;
        }
        setAudioLevel(0.08);
        setCurrentState((curr) => (curr === 'speaking' ? 'idle' : curr));
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('SpeechSynthesis playback note:', e.error);
        }
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        if (speechCadenceIntervalRef.current) {
          clearInterval(speechCadenceIntervalRef.current);
          speechCadenceIntervalRef.current = null;
        }
        if (keepAliveTimerRef.current) {
          clearInterval(keepAliveTimerRef.current);
          keepAliveTimerRef.current = null;
        }
        setAudioLevel(0.08);
        setCurrentState((curr) => (curr === 'speaking' ? 'idle' : curr));
      };

      // Chrome keepalive workaround for long utterances
      keepAliveTimerRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(keepAliveTimerRef.current);
          keepAliveTimerRef.current = null;
        }
      }, 8000);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Failed to speak text:', err);
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      if (speechCadenceIntervalRef.current) {
        clearInterval(speechCadenceIntervalRef.current);
        speechCadenceIntervalRef.current = null;
      }
      setAudioLevel(0.08);
      setCurrentState((curr) => (curr === 'speaking' ? 'idle' : curr));
    }
  };

  const handleStopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
    if (speechCadenceIntervalRef.current) {
      clearInterval(speechCadenceIntervalRef.current);
      speechCadenceIntervalRef.current = null;
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
    setAudioLevel(0.08);
    setCurrentState((curr) => (curr === 'speaking' ? 'idle' : curr));
  };

  const handleToggleMute = () => {
    setIsVoiceMuted((prev) => {
      const next = !prev;
      if (next) {
        handleStopSpeaking();
      }
      return next;
    });
  };

  // Handle user sending a prompt / message to the secure backend
  const handleSendMessage = async ({ text, image, actMode = false }) => {
    if (isLoading) return; // Prevent duplicate submissions
    const trimmedText = text?.trim() || '';
    const activeImage = image !== undefined ? image : activeImageRef.current;
    if (!trimmedText && !activeImage) return;

    // Interrupt any active voice synthesis when a new prompt is sent
    handleStopSpeaking();

    // Reset input fields immediately to prevent double submissions
    setInputText('');
    setVoiceTranscript('');
    setSelectedImage(null);
    activeImageRef.current = null;

    const userMsgId = 'user-' + Date.now();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newUserMsg = {
      id: userMsgId,
      sender: 'user',
      text: trimmedText || (activeImage ? "Please analyze this uploaded image and explain what you see in detail." : ""),
      image: activeImage || null,
      timestamp: currentTime
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);
    setCurrentState('thinking');

    try {
      const payload = {
        message: trimmedText || "Please analyze this uploaded image and explain what you see in detail.",
        actMode: Boolean(actMode),
        language: selectedLanguage
      };

      const rawImageData = activeImage?.url || activeImage?.data;
      if (rawImageData) {
        payload.image = {
          data: rawImageData,
          mimeType: activeImage.mimeType || 'image/png'
        };
      }

      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch (_) { }

        let errorMessage = 'AI request failed. Please try again.';
        if (response.status === 429) {
          errorMessage = errorData?.error || 'AI quota reached. Please try again when your quota resets.';
        } else if (response.status === 413) {
          errorMessage = errorData?.error || 'Image size exceeds the 5MB limit. Please upload a smaller image.';
        } else if (response.status === 415) {
          errorMessage = errorData?.error || 'Unsupported image format. Allowed formats: PNG, JPEG, WEBP, GIF.';
        } else if (response.status === 503) {
          errorMessage = errorData?.error || 'AI API key is not configured on the backend.';
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }

        const errorMsg = {
          id: 'genesis-' + Date.now(),
          sender: 'genesis',
          text: errorMessage,
          isError: true,
          timestamp: responseTime,
          modalities: [`ERROR (HTTP ${response.status})`]
        };

        setMessages((prev) => [...prev, errorMsg]);
        setCurrentState('idle');
        return;
      }

      const data = await response.json();
      const aiReply = data?.reply || 'No response content returned from Gemini API.';

      const modalities = image
        ? ['SEE (Vision)', 'THINK (Gemini API)', 'SPEAK (Web Speech)']
        : ['THINK (Gemini API)', 'SPEAK (Web Speech)'];

      if (data.actionProposal || (data.agentPlan && Array.isArray(data.agentPlan.steps) && data.agentPlan.steps.length > 0)) {
        modalities.push('ACT (Computer Action)');
      }

      const aiMsg = {
        id: 'genesis-' + Date.now(),
        sender: 'genesis',
        text: aiReply,
        timestamp: responseTime,
        language: data.language || selectedLanguage,
        modalities,
        agentPlan: data.agentPlan || null,
        intentCategory: data.intentCategory || 'GENERAL',
        actionProposal: data.actionProposal ? {
          command: data.actionProposal.command,
          tool: data.actionProposal.tool || data.actionProposal.command,
          parameters: data.actionProposal.parameters || {},
          targetPath: data.actionProposal.targetPath || data.actionProposal.parameters?.filePath || data.actionProposal.parameters?.path || (data.actionProposal.parameters?.appId ? `App: ${data.actionProposal.parameters.appId}` : null),
          proposedContent: data.actionProposal.proposedContent !== undefined ? data.actionProposal.proposedContent : (data.actionProposal.parameters?.content !== undefined ? data.actionProposal.parameters.content : null),
          description: data.actionProposal.description,
          riskLevel: data.actionProposal.riskLevel || 'READ-ONLY SAFE',
          expectedResult: data.actionProposal.expectedResult,
          isReal: data.actionProposal.isReal,
          status: 'pending',
          stepId: data.actionProposal.stepId
        } : null
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Record proposed safe actions & verified executed plan steps in audit ledger
      const newAuditEvents = [];

      if (data.agentPlan && Array.isArray(data.agentPlan.steps)) {
        data.agentPlan.steps.forEach((s) => {
          newAuditEvents.push({
            id: 'step-' + s.stepId + '-' + Date.now(),
            command: s.tool,
            status: s.status === 'completed' ? 'authorized' : s.status,
            riskLevel: s.requiresAuthorization ? 'CONSEQUENTIAL SAFE' : 'READ-ONLY SAFE',
            timestamp: responseTime,
            executionTimeMs: s.executionTimeMs,
            outputSummary: s.result?.message || s.result?.operation || s.title
          });
        });
      } else if (data.actionProposal) {
        newAuditEvents.push({
          id: 'act-' + Date.now(),
          command: data.actionProposal.command,
          status: 'pending',
          riskLevel: data.actionProposal.riskLevel || 'READ-ONLY SAFE',
          timestamp: responseTime,
          outputSummary: data.actionProposal.description
        });
      }

      if (newAuditEvents.length > 0) {
        setActionHistory((prev) => [...newAuditEvents, ...prev]);
      }

      // Automatically open completed YouTube or website URLs in browser tab
      if (data.agentPlan && Array.isArray(data.agentPlan.steps)) {
        const completedBrowserStep = data.agentPlan.steps.find(
          (s) => (s.tool === 'media.search_and_play_youtube' || s.tool === 'browser.open_url') && s.status === 'completed' && s.result?.url
        );
        if (completedBrowserStep && completedBrowserStep.result?.url) {
          try {
            window.open(completedBrowserStep.result.url, '_blank', 'noopener,noreferrer');
          } catch (_) { }
        }
      }

      // Automatically speak the actual AI response if voice is not muted
      if (!isVoiceMuted) {
        speakText(aiReply, aiMsg.id, data.language || selectedLanguage);
      } else {
        setCurrentState('idle');
      }
    } catch (err) {
      console.error('GENESIS AI backend connection error:', err);
      const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const errorMsg = {
        id: 'genesis-' + Date.now(),
        sender: 'genesis',
        text: 'Unable to connect to GENESIS AI backend on http://localhost:3001. Please verify that the backend server is running (cd server && npm start).',
        isError: true,
        timestamp: responseTime,
        modalities: ['BACKEND OFFLINE']
      };

      setMessages((prev) => [...prev, errorMsg]);
      setCurrentState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  // Real Web Speech API Recognition workflow with Web Audio analysis
  const handleStartListening = async () => {
    // Interrupt any active voice synthesis readout
    handleStopSpeaking();
    setSpeechError(null);
    setVoiceTranscript('');
    finalTranscriptRef.current = '';
    currentTranscriptRef.current = '';
    hasSubmittedVoiceRef.current = false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError({
        type: 'unsupported',
        message: 'Web Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge for voice interaction, or type your prompt in the box below.'
      });
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) { }
      }

      // Connect real microphone stream to Web Audio API for living orb frequency & RMS reaction
      await startWebAudioMicAnalysis();

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setCurrentState('listening');
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            final += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }
        if (final) {
          finalTranscriptRef.current = (finalTranscriptRef.current ? finalTranscriptRef.current + ' ' : '') + final;
        }
        const fullDisplay = (finalTranscriptRef.current ? finalTranscriptRef.current + ' ' : '') + interim;
        currentTranscriptRef.current = fullDisplay.trim();
        setVoiceTranscript(fullDisplay);
      };

      recognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        setIsListening(false);
        stopWebAudioMicAnalysis();
        setAudioLevel(0.08);
        setCurrentState((curr) => (curr === 'listening' ? 'idle' : curr));

        const activeLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
        const langDisplayName = activeLangObj ? activeLangObj.name : selectedLanguage;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError({
            type: 'permission-denied',
            message: 'Microphone permission was denied. Please allow microphone access in your browser address bar/settings to speak to GENESIS.'
          });
        } else if (event.error === 'language-not-supported') {
          setSpeechError({
            type: 'language-unsupported',
            message: `Speech recognition for ${langDisplayName} is not supported in this browser version. You can type in ${langDisplayName} directly or switch to English.`
          });
        } else if (event.error === 'no-speech') {
          setSpeechError({
            type: 'no-speech',
            message: 'No speech was detected. Click the microphone again and speak clearly, or type your prompt.'
          });
        } else if (event.error === 'network') {
          setSpeechError({
            type: 'network',
            message: 'Speech recognition network error. Please verify your connection or type your prompt.'
          });
        } else if (event.error !== 'aborted') {
          setSpeechError({
            type: 'general',
            message: `Speech recognition notice (${event.error}). You can continue using text input as a fallback.`
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        stopWebAudioMicAnalysis();
        setAudioLevel(0.08);
        if (hasSubmittedVoiceRef.current) return;
        const recognized = (finalTranscriptRef.current || currentTranscriptRef.current || '').trim();
        if (recognized) {
          hasSubmittedVoiceRef.current = true;
          handleSendMessage({
            text: recognized,
            image: activeImageRef.current,
            actMode: isActMode
          });
          setVoiceTranscript('');
          finalTranscriptRef.current = '';
          currentTranscriptRef.current = '';
        } else {
          setCurrentState((curr) => (curr === 'listening' ? 'idle' : curr));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start SpeechRecognition:', err);
      setIsListening(false);
      stopWebAudioMicAnalysis();
      setAudioLevel(0.08);
      setCurrentState('idle');
      setSpeechError({
        type: 'init-failed',
        message: 'Could not access the microphone. Please check your browser microphone settings or use text chat.'
      });
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) { }
    }
    stopWebAudioMicAnalysis();
    setIsListening(false);
    setAudioLevel(0.08);
    setCurrentState((curr) => (curr === 'listening' ? 'idle' : curr));
  };

  const handleLanguageChange = (newLang) => {
    setSelectedLanguage(newLang);
    handleStopSpeaking();
    if (isListening) {
      handleStopListening();
    }
  };

  // Authorize Safe Computer Action
  const handleAuthorizeAction = async (messageId, actionProposal) => {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setCurrentState('thinking');

    try {
      let execData;
      let executedStep = null;

      // If action proposal corresponds to a registry tool or has stepId, route through secure execute-step endpoint
      const isToolStep = Boolean(
        actionProposal.stepId ||
        (actionProposal.tool && actionProposal.tool.includes('.')) ||
        (actionProposal.command && actionProposal.command.includes('.'))
      );

      if (isToolStep) {
        const stepPayload = {
          stepId: actionProposal.stepId || 'step-1',
          tool: actionProposal.tool || actionProposal.command,
          title: actionProposal.description || actionProposal.command,
          parameters: actionProposal.parameters || {}
        };
        const response = await fetch('http://localhost:3001/api/agent/execute-step', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            step: stepPayload,
            isAuthorized: true,
            authorized: true
          })
        });
        execData = await response.json();
        if (!response.ok) {
          throw new Error(execData.error || 'Failed to execute step.');
        }
        executedStep = execData.step;
      } else {
        const response = await fetch('http://localhost:3001/api/action/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            command: actionProposal.command,
            parameters: actionProposal.parameters || {},
            isAuthorized: true,
            authorized: true
          })
        });
        execData = await response.json();
        if (!response.ok) {
          throw new Error(execData.error || 'Failed to execute safe action.');
        }
      }

      const resultOutput = executedStep ? executedStep.result : execData.output;
      const executionTime = executedStep ? executedStep.executionTimeMs : execData.executionTimeMs;
      const isSuccess = executedStep ? executedStep.status === 'completed' : execData.success;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            let updatedMsg = { ...msg };
            if (updatedMsg.actionProposal) {
              updatedMsg.actionProposal = {
                ...updatedMsg.actionProposal,
                status: isSuccess ? 'authorized' : 'declined',
                executedAt: currentTime,
                result: resultOutput,
                executionTimeMs: executionTime
              };
            }
            if (updatedMsg.agentPlan && executedStep) {
              updatedMsg.agentPlan = {
                ...updatedMsg.agentPlan,
                steps: updatedMsg.agentPlan.steps.map((s) =>
                  s.stepId === (actionProposal.stepId || executedStep.stepId) || s.tool === executedStep.tool
                    ? executedStep
                    : s
                )
              };
            }
            return updatedMsg;
          }
          return msg;
        })
      );

      // Add authorized record to HUD Audit history
      setActionHistory((prev) => [
        {
          id: 'act-' + Date.now(),
          command: actionProposal.command,
          status: isSuccess ? 'authorized' : 'failed',
          riskLevel: actionProposal.riskLevel || 'CONSEQUENTIAL SAFE',
          timestamp: currentTime,
          executionTimeMs: executionTime,
          outputSummary: resultOutput?.message || (resultOutput?.operation ? `${resultOutput.operation} (verified)` : 'Safe execution confirmed')
        },
        ...prev
      ]);

      if (isSuccess && resultOutput?.url) {
        try {
          window.open(resultOutput.url, '_blank', 'noopener,noreferrer');
        } catch (_) { }
      }

      if (!isVoiceMuted) {
        if (actionProposal.command === 'open_calculator' || actionProposal.tool === 'system.launch_app') {
          speakText("Windows Calculator opened successfully via verified safe allowlist.");
        } else {
          speakText(`Action ${actionProposal.command || actionProposal.tool} authorized and executed safely in workspace.`);
        }
      }
    } catch (err) {
      console.error('Safe action authorization error:', err);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.actionProposal) {
            return {
              ...msg,
              actionProposal: {
                ...msg.actionProposal,
                status: 'declined',
                executedAt: currentTime,
                result: { error: err.message || 'Execution failed' }
              }
            };
          }
          return msg;
        })
      );
    } finally {
      setCurrentState('idle');
    }
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
              status: 'declined',
              executedAt: currentTime
            }
          };
        }
        return msg;
      })
    );

    setActionHistory((prev) => [
      {
        id: 'act-' + Date.now(),
        command: 'Action declined by user',
        status: 'declined',
        riskLevel: 'BLOCKED BY POLICY',
        timestamp: currentTime,
        outputSummary: 'Execution prevented by safety gate'
      },
      ...prev
    ]);

    if (!isVoiceMuted) {
      speakText("Action declined. Execution prevented by permission gate.");
    }
  };

  // Authorize a single step from an autonomous agent plan
  const handleAuthorizePlanStep = async (messageId, step) => {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setCurrentState('thinking');

    try {
      const response = await fetch('http://localhost:3001/api/agent/execute-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, authorized: true, isAuthorized: true })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute step.');
      }

      const executedStep = data.step;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.agentPlan) {
            const updatedSteps = msg.agentPlan.steps.map((s) =>
              s.stepId === step.stepId ? executedStep : s
            );
            return {
              ...msg,
              agentPlan: {
                ...msg.agentPlan,
                steps: updatedSteps
              },
              actionProposal: msg.actionProposal && (msg.actionProposal.stepId === step.stepId || msg.actionProposal.command === step.tool)
                ? {
                  ...msg.actionProposal,
                  status: executedStep.status === 'completed' ? 'authorized' : 'declined',
                  executedAt: currentTime,
                  result: executedStep.result
                }
                : msg.actionProposal
            };
          }
          return msg;
        })
      );

      setActionHistory((prev) => [
        {
          id: 'step-' + Date.now(),
          command: step.tool,
          status: executedStep.status === 'completed' ? 'authorized' : 'failed',
          riskLevel: 'CONSEQUENTIAL SAFE',
          timestamp: currentTime,
          executionTimeMs: executedStep.executionTimeMs,
          outputSummary: executedStep.result?.message || executedStep.result?.status || executedStep.title
        },
        ...prev
      ]);

      if (executedStep.status === 'completed' && executedStep.result?.url) {
        try {
          window.open(executedStep.result.url, '_blank', 'noopener,noreferrer');
        } catch (_) { }
      }

      if (!isVoiceMuted) {
        if (step.tool === 'system.launch_app') {
          speakText(`${step.title} executed successfully.`);
        } else {
          speakText(`Step ${step.title} completed and verified.`);
        }
      }

      // Automatically execute subsequent safe steps (e.g. read_file verification) in sequence
      if (executedStep.status === 'completed') {
        const targetMsg = messages.find((m) => m.id === messageId);
        if (targetMsg && targetMsg.agentPlan && Array.isArray(targetMsg.agentPlan.steps)) {
          const currentIdx = targetMsg.agentPlan.steps.findIndex((s) => s.stepId === step.stepId);
          if (currentIdx !== -1) {
            for (let i = currentIdx + 1; i < targetMsg.agentPlan.steps.length; i++) {
              const nextStep = targetMsg.agentPlan.steps[i];
              // If next step requires authorization (e.g. overwriting an existing file), pause for user confirmation
              if (nextStep.requiresAuthorization) {
                break;
              }
              if (nextStep.status === 'pending') {
                try {
                  const autoRes = await fetch('http://localhost:3001/api/agent/execute-step', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ step: nextStep, authorized: true, isAuthorized: true })
                  });
                  const autoData = await autoRes.json();
                  if (autoRes.ok && autoData.step) {
                    const autoExecutedStep = autoData.step;
                    setMessages((prev) =>
                      prev.map((msg) => {
                        if (msg.id === messageId && msg.agentPlan) {
                          return {
                            ...msg,
                            agentPlan: {
                              ...msg.agentPlan,
                              steps: msg.agentPlan.steps.map((s) =>
                                s.stepId === nextStep.stepId ? autoExecutedStep : s
                              )
                            }
                          };
                        }
                        return msg;
                      })
                    );
                    setActionHistory((prev) => [
                      {
                        id: 'step-' + Date.now(),
                        command: nextStep.tool,
                        status: autoExecutedStep.status === 'completed' ? 'authorized' : 'failed',
                        riskLevel: 'READ-ONLY SAFE',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        executionTimeMs: autoExecutedStep.executionTimeMs,
                        outputSummary: autoExecutedStep.result?.message || autoExecutedStep.result?.status || autoExecutedStep.title
                      },
                      ...prev
                    ]);
                  }
                } catch (autoErr) {
                  console.warn('Auto step progression note:', autoErr);
                  break;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Plan step authorization error:', err);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.agentPlan) {
            const updatedSteps = msg.agentPlan.steps.map((s) =>
              s.stepId === step.stepId ? { ...s, status: 'failed', error: err.message } : s
            );
            return {
              ...msg,
              agentPlan: {
                ...msg.agentPlan,
                steps: updatedSteps
              }
            };
          }
          return msg;
        })
      );
    } finally {
      setCurrentState('idle');
    }
  };

  // Decline a single step from an autonomous agent plan
  const handleDeclinePlanStep = (messageId, stepId) => {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.agentPlan) {
          const updatedSteps = msg.agentPlan.steps.map((s) =>
            s.stepId === stepId ? { ...s, status: 'declined' } : s
          );
          return {
            ...msg,
            agentPlan: {
              ...msg.agentPlan,
              steps: updatedSteps
            },
            actionProposal: msg.actionProposal && msg.actionProposal.stepId === stepId
              ? { ...msg.actionProposal, status: 'declined' }
              : msg.actionProposal
          };
        }
        return msg;
      })
    );

    setActionHistory((prev) => [
      {
        id: 'step-declined-' + Date.now(),
        command: 'Step authorization declined by user',
        status: 'declined',
        riskLevel: 'BLOCKED BY POLICY',
        timestamp: currentTime,
        outputSummary: 'Execution prevented by safety gate'
      },
      ...prev
    ]);

    if (!isVoiceMuted) {
      speakText('Step declined. Execution prevented by permission gate.');
    }
  };

  // Prompt confirmation before resetting session
  const handlePromptResetConversation = () => {
    setIsConfirmResetOpen(true);
  };

  // Confirmed reset: cleanly reset conversation, Pitch Mode step 1, stop speech and mic streams
  const handleExecuteConfirmedReset = () => {
    handleStopSpeaking();
    handleStopListening();
    stopWebAudioMicAnalysis();
    setIsLiveVisionActive(false);
    setMessages([]);
    setCurrentState('idle');
    setSpeechError(null);
    setVoiceTranscript('');
    setPitchDemoStep(1);
  };

  // Global Keyboard Shortcuts: P (Pitch Mode), Escape (Close Modals), M (Mute Voice), ? (Help)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable);

      // Escape: Close active modal safely
      if (e.key === 'Escape') {
        if (isConfirmResetOpen) {
          setIsConfirmResetOpen(false);
          e.preventDefault();
          return;
        }
        if (isKeyboardShortcutsOpen) {
          setIsKeyboardShortcutsOpen(false);
          e.preventDefault();
          return;
        }
        if (isPitchModeOpen) {
          setIsPitchModeOpen(false);
          e.preventDefault();
          return;
        }
        if (isLiveVisionActive) {
          setIsLiveVisionActive(false);
          e.preventDefault();
          return;
        }
      }

      // If user is focused inside input, textarea, or select, do NOT trigger hotkeys
      if (isInput) return;

      // P: Toggle Pitch Mode
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setIsPitchModeOpen((prev) => !prev);
        return;
      }

      // M: Mute or unmute voice output without interrupting mic permissions or other controls
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      // ?: Toggle keyboard shortcuts help panel
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsKeyboardShortcutsOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPitchModeOpen, isLiveVisionActive, isKeyboardShortcutsOpen, isConfirmResetOpen, isVoiceMuted]);

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
        onResetConversation={handlePromptResetConversation}
        isVoiceMuted={isVoiceMuted}
        onToggleMute={handleToggleMute}
        onStopSpeaking={handleStopSpeaking}
        isSpeaking={isSpeaking}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        onOpenPitchMode={() => setIsPitchModeOpen(true)}
        onOpenShortcuts={() => setIsKeyboardShortcutsOpen(true)}
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
                  {currentState === 'listening' && `— Live mic frequency stream via Web Audio & Recognition (${selectedLanguage})`}
                  {currentState === 'thinking' && '— Google Gemini 3.8 Flash neural reasoning in progress'}
                  {currentState === 'speaking' && `— Reading response aloud via ${selectedLanguage} Speech Synthesis`}
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
            isLoading={isLoading}
            voiceTranscript={voiceTranscript}
            speechError={speechError}
            onClearSpeechError={() => setSpeechError(null)}
            onLiveVisionChange={setIsLiveVisionActive}
            selectedLanguage={selectedLanguage}
            isLiveVisionOpen={isLiveVisionActive}
            setIsLiveVisionOpen={setIsLiveVisionActive}
            selectedImage={selectedImage}
            onSelectedImageChange={setSelectedImage}
            inputText={inputText}
            onInputTextChange={setInputText}
            isActMode={isActMode}
            onActModeChange={setIsActMode}
          />

          {/* Conversation & Action Audit Stream */}
          <TranscriptArea
            messages={messages}
            onAuthorizeAction={handleAuthorizeAction}
            onDeclineAction={handleDeclineAction}
            onAuthorizePlanStep={handleAuthorizePlanStep}
            onDeclinePlanStep={handleDeclinePlanStep}
            speakingMessageId={speakingMessageId}
            onSpeakMessage={(text, id) => speakText(text, id, selectedLanguage)}
            onStopSpeaking={handleStopSpeaking}
            isSpeaking={isSpeaking}
            isVoiceMuted={isVoiceMuted}
            selectedLanguage={selectedLanguage}
          />
        </div>

        {/* Right Column: System Telemetry, HUD, and Permission Audit Log */}
        <ActivityStatusPanel
          currentState={currentState}
          audioLevel={audioLevel}
          actionHistory={actionHistory}
          isVoiceMuted={isVoiceMuted}
          isListening={isListening}
          isSpeaking={isSpeaking}
          isLiveVisionActive={isLiveVisionActive}
          selectedLanguage={selectedLanguage}
        />
      </main>

      {/* Hackathon Pitch Mode Overlay / Guided Demo Storyboard */}
      <PitchModeModal
        isOpen={isPitchModeOpen}
        onClose={() => setIsPitchModeOpen(false)}
        onOpenLiveVision={() => setIsLiveVisionActive(true)}
        onSendMessage={handleSendMessage}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        messages={messages}
        actionHistory={actionHistory}
        onResetConversation={handlePromptResetConversation}
        currentStep={pitchDemoStep}
        onStepChange={setPitchDemoStep}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
      />

      {/* Explicit Reset Confirmation Modal */}
      <ResetConfirmModal
        isOpen={isConfirmResetOpen}
        onClose={() => setIsConfirmResetOpen(false)}
        onConfirm={handleExecuteConfirmedReset}
      />
    </div>
  );
}

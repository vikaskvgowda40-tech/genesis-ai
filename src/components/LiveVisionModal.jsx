import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Monitor,
  X,
  Scan,
  RefreshCw,
  AlertCircle,
  Eye,
  Check,
  Sparkles,
  Maximize2,
  VideoOff,
  ShieldAlert
} from 'lucide-react';
import './LiveVisionModal.css';

export default function LiveVisionModal({
  isOpen,
  onClose,
  onCapture,
  isActMode = false
}) {
  const [sourceMode, setSourceMode] = useState('webcam'); // 'webcam' | 'screen'
  const [stream, setStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [promptText, setPromptText] = useState('Examine this visual frame carefully. Identify all key elements, text, architecture, and noteworthy details.');
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [videoResolution, setVideoResolution] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Helper to safely stop all media tracks
  const stopCurrentStream = useCallback(() => {
    if (stream) {
      try {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (err) {
        console.warn('Error stopping media tracks:', err);
      }
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setVideoResolution(null);
  }, [stream]);

  // Request media stream based on selected source mode
  const startStream = useCallback(async (modeToStart = sourceMode) => {
    // First stop any active stream
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }

    setStreamError(null);
    setIsStreaming(false);

    // Verify browser support
    if (!navigator.mediaDevices) {
      setStreamError({
        type: 'unsupported',
        title: 'Media Devices Unsupported',
        message: 'Your browser environment does not support mediaDevices API. Please use a modern browser (Chrome, Edge, Firefox).'
      });
      return;
    }

    try {
      let mediaStream = null;

      if (modeToStart === 'webcam') {
        if (!navigator.mediaDevices.getUserMedia) {
          throw new Error('Webcam getUserMedia is not supported in this browser.');
        }

        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });
      } else if (modeToStart === 'screen') {
        if (!navigator.mediaDevices.getDisplayMedia) {
          throw new Error('Screen capture getDisplayMedia is not supported in this browser.');
        }

        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: false
        });

        // Listen for user stopping screen share via native browser bar
        const screenTrack = mediaStream.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.onended = () => {
            stopCurrentStream();
          };
        }
      }

      setStream(mediaStream);
      setIsStreaming(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch((e) => console.warn('Video play warning:', e));
            setVideoResolution({
              width: videoRef.current.videoWidth || 1280,
              height: videoRef.current.videoHeight || 720
            });
          }
        };
      }
    } catch (err) {
      console.warn(`Failed to access ${modeToStart}:`, err);
      let errorTitle = 'Media Access Error';
      let errorMsg = err.message || 'Unable to access media stream.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorTitle = 'Permission Denied';
        errorMsg = `Access to your ${modeToStart === 'webcam' ? 'camera' : 'screen'} was blocked. Please grant browser permissions in your address bar to enable Live Vision.`;
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorTitle = 'No Camera Device Detected';
        errorMsg = 'No camera hardware found on this system. You can switch to Screen Capture or use the simulated demo frame.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorTitle = 'Device Busy / In Use';
        errorMsg = 'Your camera is already in use by another application. Please close other camera apps and retry.';
      }

      setStreamError({
        type: err.name || 'generic',
        title: errorTitle,
        message: errorMsg
      });
      setIsStreaming(false);
    }
  }, [sourceMode, stream, stopCurrentStream]);

  // Handle source mode toggle
  const handleSwitchMode = (newMode) => {
    if (newMode === sourceMode && isStreaming) return;
    setSourceMode(newMode);
    startStream(newMode);
  };

  // Launch stream on open, stop on close or unmount
  useEffect(() => {
    if (isOpen) {
      startStream(sourceMode);
    } else {
      stopCurrentStream();
    }

    return () => {
      stopCurrentStream();
    };
  }, [isOpen]);

  // Close handler with full track termination
  const handleClose = () => {
    stopCurrentStream();
    onClose();
  };

  // Capture current video frame to base64 image
  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || !isStreaming) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Trigger visual capture flash
    setIsFlashActive(true);

    // Draw the active video frame
    ctx.drawImage(video, 0, 0, width, height);

    // Generate high quality JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const approxBytes = Math.ceil((dataUrl.length * 3) / 4);

    setTimeout(() => {
      setIsFlashActive(false);
      stopCurrentStream();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(11, 19);
      const filename = sourceMode === 'webcam'
        ? `webcam_frame_${timestamp}.jpg`
        : `screen_capture_${timestamp}.jpg`;

      onCapture({
        image: {
          name: filename,
          url: dataUrl,
          mimeType: 'image/jpeg',
          size: `${(approxBytes / 1024).toFixed(1)} KB (Live Capture)`,
          sizeBytes: approxBytes
        },
        prompt: promptText.trim() || 'Please examine this visual capture in detail.',
        actMode: isActMode
      });

      onClose();
    }, 280);
  };

  // Fallback demo frame generator when no physical camera is accessible
  const handleGenerateSimulatedDemoFrame = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-tech dark backdrop
    ctx.fillStyle = '#030914';
    ctx.fillRect(0, 0, 1280, 720);

    // Grid pattern
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1280; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke();
    }
    for (let y = 0; y < 720; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke();
    }

    // Telemetry HUD overlay
    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('GENESIS AI // LIVE MULTIMODAL VISION INGEST', 50, 70);

    ctx.fillStyle = '#70d6ff';
    ctx.font = '16px monospace';
    ctx.fillText(`CAPTURE SOURCE: SIMULATED HARDWARE FRAME • ${new Date().toLocaleTimeString()}`, 50, 105);
    ctx.fillText('PIPELINE: GEMINI 3.8 FLASH VISION ENGINE (ACTIVE)', 50, 130);

    // Neural Nodes diagram
    const drawBox = (x, y, w, h, label, sub) => {
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(0, 242, 254, 0.12)';
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(label, x + 20, y + 40);
      ctx.fillStyle = '#00e5c9';
      ctx.font = '13px monospace';
      ctx.fillText(sub, x + 20, y + 68);
    };

    drawBox(100, 220, 260, 100, 'LIVE SENSORY INTAKE', 'Camera / Screen Stream');
    drawBox(510, 220, 260, 100, 'GEMINI 3.8 REASONING', 'Multimodal Understanding');
    drawBox(920, 220, 260, 100, 'SAFE COMPUTER ACTIONS', 'Permission-Gated Sandbox');

    // Connecting arrows
    ctx.strokeStyle = '#00e5c9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(360, 270); ctx.lineTo(510, 270);
    ctx.moveTo(770, 270); ctx.lineTo(920, 270);
    ctx.stroke();

    // Diagnostics panel
    ctx.fillStyle = 'rgba(8, 26, 44, 0.85)';
    ctx.fillRect(100, 400, 1080, 220);
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
    ctx.strokeRect(100, 400, 1080, 220);

    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('LIVE DIAGNOSTIC TELEMETRY MATRIX', 130, 440);

    ctx.fillStyle = '#edf5fa';
    ctx.font = '14px monospace';
    ctx.fillText('[OK] Optical Waveform Analysis: 100% Signal Integrity', 130, 480);
    ctx.fillText('[OK] Visual Latency: 12ms Target Pipeline', 130, 510);
    ctx.fillText('[OK] Security Guardrails: Zero-Trust Safe Execution Armed', 130, 540);
    ctx.fillText('[OK] Hack Day Bengaluru 2026 Core Live Test Frame', 130, 570);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const approxBytes = Math.ceil((dataUrl.length * 3) / 4);

    stopCurrentStream();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(11, 19);
    onCapture({
      image: {
        name: `simulated_live_frame_${timestamp}.jpg`,
        url: dataUrl,
        mimeType: 'image/jpeg',
        size: `${(approxBytes / 1024).toFixed(1)} KB (Simulated Live Frame)`,
        sizeBytes: approxBytes
      },
      prompt: promptText.trim() || 'Please examine this live architecture telemetry frame in detail.',
      actMode: isActMode
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="live-vision-overlay" onClick={handleClose}>
      <div
        className="live-vision-modal glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-vision-title"
      >
        {/* Flash animation layer when capture button is clicked */}
        <div className={`capture-flash-layer ${isFlashActive ? 'flashing' : ''}`} />

        {/* Modal Header */}
        <div className="live-vision-header">
          <div className="live-vision-title-group">
            <div className="live-icon-halo">
              <Eye size={20} className="live-eye-icon" />
            </div>
            <div>
              <h2 id="live-vision-title" className="live-vision-title">
                LIVE MULTIMODAL VISION INGEST
              </h2>
              <span className="live-vision-sub">
                Real-Time Optical Perception • Powered by Gemini 3.8 Flash Vision
              </span>
            </div>
          </div>

          <div className="header-status-and-close">
            {isStreaming && (
              <div className="live-status-pill">
                <span className="live-pulsing-dot" />
                <span className="live-pill-text">
                  LIVE STREAM ACTIVE • {videoResolution ? `${videoResolution.width}x${videoResolution.height}` : 'INITIALIZING'}
                </span>
              </div>
            )}
            <button
              type="button"
              className="modal-close-btn"
              onClick={handleClose}
              title="Close Live Vision"
              id="btn-close-live-vision"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="source-switcher-bar">
          <button
            type="button"
            className={`source-btn ${sourceMode === 'webcam' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('webcam')}
            id="btn-source-webcam"
          >
            <Camera size={16} />
            <span>📷 Webcam Camera</span>
          </button>

          <button
            type="button"
            className={`source-btn ${sourceMode === 'screen' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('screen')}
            id="btn-source-screen"
          >
            <Monitor size={16} />
            <span>🖥️ Screen Capture</span>
          </button>

          <button
            type="button"
            className="source-retry-btn"
            onClick={() => startStream(sourceMode)}
            title="Restart or refresh stream"
            id="btn-restart-stream"
          >
            <RefreshCw size={14} />
            <span>Reconnect</span>
          </button>
        </div>

        {/* Live Viewport Area */}
        <div className="viewport-container">
          {/* Cybernetic Corner Reticles */}
          <span className="reticle reticle-tl" />
          <span className="reticle reticle-tr" />
          <span className="reticle reticle-bl" />
          <span className="reticle reticle-br" />

          {/* Cyan Scanline Animation */}
          {isStreaming && <div className="cyber-scanline" />}

          {/* Live Video Element */}
          <video
            ref={videoRef}
            className={`live-video-feed ${isStreaming ? 'visible' : 'hidden'}`}
            autoPlay
            playsInline
            muted
          />

          {/* Fallback & Error State Display */}
          {streamError && (
            <div className="stream-error-view">
              <div className="error-icon-box">
                <VideoOff size={36} className="text-cyan" />
              </div>
              <h3 className="error-view-title">{streamError.title}</h3>
              <p className="error-view-desc">{streamError.message}</p>
              <div className="error-view-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => startStream(sourceMode)}
                  id="btn-retry-permission"
                >
                  <RefreshCw size={14} />
                  <span>Retry Permission</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleGenerateSimulatedDemoFrame}
                  id="btn-use-simulated-frame"
                >
                  <Sparkles size={14} />
                  <span>Use Simulated Live Frame</span>
                </button>
              </div>
            </div>
          )}

          {/* Initial Loading State */}
          {!isStreaming && !streamError && (
            <div className="stream-loading-view">
              <div className="loader-orbit">
                <span className="orbit-ring" />
                <Camera size={26} className="orbit-icon" />
              </div>
              <h4 className="loading-view-title">Requesting Optical Stream...</h4>
              <p className="loading-view-desc">
                Please allow {sourceMode === 'webcam' ? 'camera' : 'screen'} permission in your browser prompt.
              </p>
              <button
                type="button"
                className="btn btn-secondary-ghost btn-sm"
                onClick={handleGenerateSimulatedDemoFrame}
                style={{ marginTop: '14px' }}
              >
                <span>Or Click Here to Use Simulated Demo Frame</span>
              </button>
            </div>
          )}

          {/* Stream Overlay HUD Metrics */}
          {isStreaming && (
            <div className="viewport-hud-overlay">
              <span className="hud-metric">
                SOURCE: {sourceMode.toUpperCase()}
              </span>
              <span className="hud-metric-dot">•</span>
              <span className="hud-metric">
                OPTICAL SENSOR: OK
              </span>
              <span className="hud-metric-dot">•</span>
              <span className="hud-metric">
                AUTO-CALIBRATION: ACTIVE
              </span>
            </div>
          )}
        </div>

        {/* Prompt Input & Presets */}
        <div className="live-prompt-area">
          <label className="prompt-label" htmlFor="live-vision-prompt-input">
            <span className="label-text">VISION REASONING INSTRUCTION:</span>
            {isActMode && (
              <span className="badge badge-teal act-pill">
                <ShieldAlert size={11} /> ACT MODE ON
              </span>
            )}
          </label>
          <input
            id="live-vision-prompt-input"
            type="text"
            className="live-prompt-input"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="What should GENESIS analyze in this capture?"
          />

          <div className="live-prompt-presets">
            <button
              type="button"
              className="preset-chip"
              onClick={() => setPromptText('Examine this visual frame carefully. Identify all key elements, text, architecture, and noteworthy details.')}
            >
              🔍 Detailed Inspection
            </button>
            <button
              type="button"
              className="preset-chip"
              onClick={() => setPromptText('Extract and transcribe all code, text, diagrams, and tables visible in this image.')}
            >
              📝 Extract Text & Code
            </button>
            <button
              type="button"
              className="preset-chip"
              onClick={() => setPromptText('Diagnose any errors, visual glitches, or performance bottlenecks shown here.')}
            >
              ⚠️ Diagnose Anomalies
            </button>
            <button
              type="button"
              className="preset-chip"
              onClick={() => setPromptText('Inspect the system depicted here and propose a safe, read-only computer action to verify it.')}
            >
              🛡️ Propose Safe Action
            </button>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="live-vision-footer">
          <div className="footer-left">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              id="btn-cancel-live-vision"
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary-ghost"
              onClick={handleGenerateSimulatedDemoFrame}
              title="Generate a high-tech synthetic test frame for demoing without hardware"
              id="btn-demo-frame-footer"
            >
              <Sparkles size={14} />
              <span>Simulated Demo Frame</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-capture-large"
            disabled={!isStreaming}
            onClick={handleCaptureFrame}
            id="btn-capture-frame"
          >
            <Scan size={18} />
            <span>Capture Frame & Analyze</span>
          </button>
        </div>
      </div>
    </div>
  );
}

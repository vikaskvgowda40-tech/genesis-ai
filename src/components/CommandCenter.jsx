import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Image as ImageIcon, X, CornerDownLeft, Volume2, ShieldAlert, Loader2, AlertCircle, Camera } from 'lucide-react';
import LiveVisionModal from './LiveVisionModal';
import './CommandCenter.css';

export default function CommandCenter({
  currentState,
  onSendMessage,
  onStartListening,
  onStopListening,
  isListening,
  isLoading = false,
  voiceTranscript = '',
  speechError = null,
  onClearSpeechError = () => {},
  onLiveVisionChange = () => {},
  selectedLanguage = 'en-IN',
  isLiveVisionOpen: externalLiveVisionOpen,
  setIsLiveVisionOpen: setExternalLiveVisionOpen,
  selectedImage: externalSelectedImage,
  onSelectedImageChange: setExternalSelectedImage,
  inputText: externalInputText,
  onInputTextChange: setExternalInputText,
  isActMode: externalActMode,
  onActModeChange: setExternalActMode
}) {
  const [internalInputText, setInternalInputText] = useState('');
  const [internalSelectedImage, setInternalSelectedImage] = useState(null);
  const [internalActMode, setInternalActMode] = useState(false);

  const inputText = externalInputText !== undefined ? externalInputText : internalInputText;
  const setInputText = (val) => {
    if (setExternalInputText) setExternalInputText(val);
    else setInternalInputText(val);
  };

  const selectedImage = externalSelectedImage !== undefined ? externalSelectedImage : internalSelectedImage;
  const setSelectedImage = (val) => {
    if (setExternalSelectedImage) setExternalSelectedImage(val);
    else setInternalSelectedImage(val);
  };

  const isActMode = externalActMode !== undefined ? externalActMode : internalActMode;
  const setIsActMode = (val) => {
    if (setExternalActMode) {
      if (typeof val === 'function') {
        setExternalActMode((prev) => val(prev));
      } else {
        setExternalActMode(val);
      }
    } else {
      setInternalActMode(val);
    }
  };

  const [internalLiveVisionOpen, setInternalLiveVisionOpen] = useState(false);
  const isLiveVisionOpen = externalLiveVisionOpen !== undefined ? externalLiveVisionOpen : internalLiveVisionOpen;
  const setIsLiveVisionOpen = setExternalLiveVisionOpen || setInternalLiveVisionOpen;
  const fileInputRef = useRef(null);

  // Notify parent component of live vision status for HUD telemetry
  useEffect(() => {
    onLiveVisionChange(isLiveVisionOpen);
  }, [isLiveVisionOpen, onLiveVisionChange]);

  // Sync recognized voice speech into input field live
  useEffect(() => {
    if (isListening && voiceTranscript) {
      setInputText(voiceTranscript);
    }
  }, [voiceTranscript, isListening]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    onSendMessage({
      text: inputText.trim(),
      image: selectedImage,
      actMode: isActMode
    });

    setInputText('');
    setSelectedImage(null);
  };

  const handleLiveCapture = ({ image, prompt, actMode }) => {
    onSendMessage({
      text: prompt,
      image: image,
      actMode: actMode ?? isActMode
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowed.includes(file.type.toLowerCase())) {
        alert("Please select a valid image format (PNG, JPEG, WEBP, or GIF).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Selected image is larger than 5MB. Please choose a smaller image.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage({
          name: file.name,
          url: event.target.result,
          mimeType: file.type || 'image/png',
          size: (file.size / 1024).toFixed(1) + ' KB',
          sizeBytes: file.size
        });
      };
      reader.readAsDataURL(file);
    }
    // reset input value so re-uploading same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createSampleArchitecturePng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#040b16';
    ctx.fillRect(0, 0, 400, 200);

    // Node 1: Vision Ingest
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 40, 100, 60);
    ctx.fillStyle = '#00f2fe';
    ctx.font = '12px monospace';
    ctx.fillText('SEE INGEST', 32, 75);

    // Node 2: Gemini Core
    ctx.strokeStyle = '#00e5c9';
    ctx.strokeRect(150, 40, 100, 60);
    ctx.fillStyle = '#00e5c9';
    ctx.fillText('GEMINI CORE', 158, 75);

    // Node 3: Safe Actions
    ctx.strokeStyle = '#70d6ff';
    ctx.strokeRect(280, 40, 100, 60);
    ctx.fillStyle = '#70d6ff';
    ctx.fillText('SAFE ACTION', 288, 75);

    // Connections
    ctx.strokeStyle = '#edf5fa';
    ctx.beginPath();
    ctx.moveTo(120, 70); ctx.lineTo(150, 70);
    ctx.moveTo(250, 70); ctx.lineTo(280, 70);
    ctx.stroke();

    return canvas.toDataURL('image/png');
  };

  const triggerSamplePrompt = (promptText, sampleImage = null) => {
    setInputText(promptText);
    if (sampleImage) {
      setSelectedImage(sampleImage);
    }
  };

  return (
    <div className="command-center-container">
      {/* Quick Prompt Suggestions */}
      <div className="quick-prompts-row">
        <button
          className="prompt-chip live-vision-chip"
          disabled={isLoading}
          onClick={() => setIsLiveVisionOpen(true)}
          id="chip-live-vision"
          title="Launch Live Vision: Webcam or Screen Ingest"
        >
          <Camera size={13} className="text-cyan" />
          <span>📷 Live Vision: Camera / Screen</span>
        </button>

        <button
          className="prompt-chip"
          disabled={isLoading}
          onClick={() => triggerSamplePrompt(
            "Analyze this system architecture diagram and explain each subsystem block.",
            {
              name: "genesis_architecture.png",
              url: createSampleArchitecturePng(),
              mimeType: "image/png",
              size: "16.8 KB (Generated PNG)"
            }
          )}
        >
          <span>👁️ See: Diagram Analysis</span>
        </button>

        <button
          className={`prompt-chip ${isActMode ? 'active' : ''}`}
          onClick={() => {
            setIsActMode(true);
            triggerSamplePrompt("Inspect the project workspace files and report structural hierarchy.");
          }}
        >
          <span>📁 Act: Inspect Workspace Files</span>
        </button>

        <button
          className={`prompt-chip ${isActMode ? 'active' : ''}`}
          onClick={() => {
            setIsActMode(true);
            triggerSamplePrompt("Analyze code metrics and count source lines across the codebase.");
          }}
        >
          <span>📊 Act: Analyze Code Metrics</span>
        </button>

        <button
          className={`prompt-chip ${isActMode ? 'active' : ''}`}
          onClick={() => {
            setIsActMode(true);
            triggerSamplePrompt("Inspect the runtime development environment parameters and specs.");
          }}
        >
          <span>⚙️ Act: Inspect Dev Environment</span>
        </button>

        <button
          className={`prompt-chip ${isActMode ? 'active' : ''}`}
          onClick={() => {
            setIsActMode(true);
            triggerSamplePrompt("Read package.json to inspect dependencies and runtime versions.");
          }}
        >
          <span>📦 Act: Inspect Dependencies</span>
        </button>

        <button
          className={`prompt-chip ${isActMode ? 'active' : ''}`}
          onClick={() => {
            setIsActMode(true);
            triggerSamplePrompt("Verify simulated isolated sandbox integrity and host security policies.");
          }}
        >
          <span>🧪 Act: Verify Sandbox</span>
        </button>
      </div>

      {/* Selected Image Preview Bar */}
      {selectedImage && (
        <div className="image-preview-bar">
          <div className="preview-thumbnail-wrap">
            <img src={selectedImage.url} alt="Uploaded preview" className="preview-thumbnail" />
          </div>
          <div className="preview-meta">
            <span className="preview-filename">{selectedImage.name}</span>
            <span className="preview-size">{selectedImage.size} • [Multimodal Ingest Ready]</span>
          </div>
          <button
            className="preview-close-btn"
            onClick={() => setSelectedImage(null)}
            title="Remove image"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Speech Error / Permission / Unsupported Notification Banner */}
      {speechError && (
        <div className="speech-notice-banner" role="alert">
          <AlertCircle size={16} className="notice-icon" />
          <span className="notice-text">{speechError.message}</span>
          <button
            type="button"
            className="notice-dismiss-btn"
            onClick={onClearSpeechError}
            title="Dismiss notice"
            id="btn-dismiss-speech-error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Live Voice Audio Ingest Wave Banner */}
      {isListening && (
        <div className="voice-listening-banner" role="status">
          <div className="listening-wave-anim">
            <span className="wave-line w1" />
            <span className="wave-line w2" />
            <span className="wave-line w3" />
            <span className="wave-line w4" />
          </div>
          <span className="listening-banner-text">
            {voiceTranscript ? `"${voiceTranscript}"` : "Listening... Speak your prompt now (or click mic to finish)"}
          </span>
          <button
            type="button"
            className="cancel-voice-btn"
            onClick={onStopListening}
            title="Stop listening"
            id="btn-stop-listening-banner"
          >
            Finish Speaking
          </button>
        </div>
      )}

      {/* ACT Mode Active Banner */}
      {isActMode && (
        <div className="act-mode-banner" role="status">
          <div className="act-mode-banner-left">
            <ShieldAlert size={16} className="act-banner-icon" />
            <div>
              <span className="act-banner-title">ACT MODE ACTIVE</span>
              <span className="act-banner-desc"> — Safe computer actions enabled with strict permission gating.</span>
            </div>
          </div>
          <span className="act-banner-badge">READ-ONLY ALLOWLIST</span>
        </div>
      )}

      {/* Main Input Form */}
      <form onSubmit={handleSend} className="input-bar-form">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          style={{ display: 'none' }}
          id="image-file-input"
        />

        {/* Image Upload Button */}
        <button
          type="button"
          className={`input-action-btn ${selectedImage ? 'active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          title="Upload or attach an image for multimodal vision analysis"
          id="btn-upload-image"
          disabled={isLoading}
        >
          <ImageIcon size={19} />
        </button>

        {/* Live Vision (Webcam / Screen) Button */}
        <button
          type="button"
          className={`input-action-btn live-vision-btn ${isLiveVisionOpen ? 'active' : ''}`}
          onClick={() => setIsLiveVisionOpen(true)}
          title="Open Live Vision: Camera or Screen Capture"
          id="btn-open-live-vision"
          disabled={isLoading}
        >
          <Camera size={19} />
        </button>

        {/* Microphone Voice Button */}
        <button
          type="button"
          className={`input-action-btn mic-btn ${isListening ? 'listening' : ''}`}
          onClick={isListening ? onStopListening : onStartListening}
          title={isListening ? "Listening... Click to stop" : "Speak to GENESIS (Toggle voice interaction)"}
          id="btn-toggle-mic"
          disabled={isLoading}
        >
          {isListening ? (
            <div className="mic-listening-indicator">
              <span className="pulse-wave" />
              <MicOff size={19} />
            </div>
          ) : (
            <Mic size={19} />
          )}
        </button>

        {/* ACT Mode Toggle Button */}
        <button
          type="button"
          className={`input-action-btn act-mode-btn ${isActMode ? 'active' : ''}`}
          onClick={() => setIsActMode((prev) => !prev)}
          title={isActMode ? "ACT Mode Active: Safe computer actions enabled (Click to disable)" : "Toggle ACT Mode: Propose safe computer tasks"}
          id="btn-toggle-act-mode"
          disabled={isLoading}
        >
          <ShieldAlert size={19} />
          <span className="act-mode-indicator-dot" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          className="main-text-input"
          placeholder={
            isLoading
              ? "GENESIS is computing (awaiting Gemini API response)..."
              : isListening
              ? `Listening in ${selectedLanguage}... Speak now or type...`
              : isActMode
              ? "ACT Mode Active: Ask to inspect files, analyze code, or check specs (Strictly permission-gated)..."
              : selectedLanguage === 'hi-IN'
              ? "GENESIS से कुछ भी पूछें (हिन्दी), बोलें, या सुरक्षित ACT टास्क चलाएं..."
              : selectedLanguage === 'kn-IN'
              ? "GENESIS ನೊಂದಿಗೆ ಕನ್ನಡದಲ್ಲಿ ಸಂಭಾಷಿಸಿ, ಮಾತನಾಡಿ ಅಥವಾ ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ..."
              : selectedLanguage === 'ta-IN'
              ? "GENESIS-டம் தமிழில் கேளுங்கள், பேசுங்கள் அல்லது படங்களை பதிவேற்றுங்கள்..."
              : selectedLanguage === 'te-IN'
              ? "GENESIS తో తెలుగులో మాట్లాడండి లేదా ప్రశ్నలు అడగండి..."
              : "Ask GENESIS anything, upload an image, or toggle ACT mode for safe computer tasks..."
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          id="main-user-input"
          autoComplete="off"
          disabled={isLoading}
        />

        {/* Send Button */}
        <button
          type="submit"
          className="send-btn"
          disabled={(!inputText.trim() && !selectedImage) || isLoading}
          title={isLoading ? "Awaiting Gemini AI response..." : "Send command to GENESIS"}
          id="btn-send-message"
        >
          {isLoading ? (
            <Loader2 size={18} className="spinner-icon" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>

      {/* Live Vision Modal (Webcam & Screen Capture) */}
      <LiveVisionModal
        isOpen={isLiveVisionOpen}
        onClose={() => setIsLiveVisionOpen(false)}
        onCapture={handleLiveCapture}
        isActMode={isActMode}
      />
    </div>
  );
}

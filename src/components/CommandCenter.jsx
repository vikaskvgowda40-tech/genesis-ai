import React, { useState, useRef } from 'react';
import { Mic, MicOff, Send, Image as ImageIcon, X, CornerDownLeft, Volume2, ShieldAlert } from 'lucide-react';
import './CommandCenter.css';

export default function CommandCenter({
  currentState,
  onSendMessage,
  onStartListening,
  onStopListening,
  isListening
}) {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    onSendMessage({
      text: inputText.trim(),
      image: selectedImage
    });

    setInputText('');
    setSelectedImage(null);
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
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage({
          name: file.name,
          url: event.target.result,
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
      };
      reader.readAsDataURL(file);
    }
    // reset input value so re-uploading same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          className="prompt-chip"
          onClick={() => triggerSamplePrompt(
            "Analyze this system architecture and verify if all safety guardrails are satisfied.",
            {
              name: "system_architecture_diagram.png",
              url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='160' viewBox='0 0 300 160'><rect width='300' height='160' fill='%23061423'/><rect x='20' y='20' width='80' height='50' rx='8' fill='%2300f2fe' opacity='0.2' stroke='%2300f2fe' stroke-width='2'/><text x='35' y='50' fill='%2300f2fe' font-family='sans-serif' font-size='12'>See Engine</text><rect x='130' y='20' width='80' height='50' rx='8' fill='%2300e5c9' opacity='0.2' stroke='%2300e5c9' stroke-width='2'/><text x='142' y='50' fill='%2300e5c9' font-family='sans-serif' font-size='12'>Gemma 2</text><rect x='20' y='90' width='190' height='50' rx='8' fill='%2370d6ff' opacity='0.2' stroke='%2370d6ff' stroke-width='2'/><text x='35' y='120' fill='%2370d6ff' font-family='sans-serif' font-size='12'>Sarvam Multilingual TTS</text><line x1='100' y1='45' x2='130' y2='45' stroke='%23ffffff' stroke-width='2'/></svg>",
              size: "18.4 KB (Simulated SVG)"
            }
          )}
        >
          <span>👁️ See: Diagram Analysis</span>
        </button>

        <button
          className="prompt-chip"
          onClick={() => triggerSamplePrompt("Explain quantum superposition and synthesize the explanation using Sarvam AI Indian English voice.")}
        >
          <span>🗣️ Speak: Sarvam AI Voice</span>
        </button>

        <button
          className="prompt-chip"
          onClick={() => triggerSamplePrompt("Autonomous Act Request: Create a clean workspace snapshot and run secure security audit script.")}
        >
          <span>🛡️ Act: Permissioned Action</span>
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
        >
          <ImageIcon size={19} />
        </button>

        {/* Microphone Voice Button */}
        <button
          type="button"
          className={`input-action-btn mic-btn ${isListening ? 'listening' : ''}`}
          onClick={isListening ? onStopListening : onStartListening}
          title={isListening ? "Listening... Click to stop" : "Speak to GENESIS (Toggle voice interaction)"}
          id="btn-toggle-mic"
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

        {/* Text Input */}
        <input
          type="text"
          className="main-text-input"
          placeholder={
            isListening
              ? "Listening to your voice... Speak now or type..."
              : "Ask GENESIS anything, upload an image, or request a computer action..."
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          id="main-user-input"
          autoComplete="off"
        />

        {/* Send Button */}
        <button
          type="submit"
          className="send-btn"
          disabled={!inputText.trim() && !selectedImage}
          title="Send command to GENESIS"
          id="btn-send-message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

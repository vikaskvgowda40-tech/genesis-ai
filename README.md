# GENESIS AI 🌐

> **Futuristic Multimodal Autonomous Assistant**  
> *Developed for Hack Day Bengaluru 2026*

---

## 🌟 Vision & Core Concept

**GENESIS AI** is a next-generation multimodal AI companion engineered for high-agency human-AI collaboration. Designed with safety, speed, and expressive sensory intelligence at its core, GENESIS seamlessly bridges the physical, auditory, visual, and computational worlds.

```
                  ┌───────────────┐
                  │   GENESIS AI  │
                  └───────┬───────┘
         ┌────────────┬───┴───────────┬────────────┐
         ▼            ▼               ▼            ▼
      [ SEE ]      [ HEAR ]       [ THINK ]    [ SPEAK ]
      Vision       Voice          Gemma 2      Sarvam AI
   Understanding  Ingest          Reasoning    Indian TTS
         │            │               │            │
         └────────────┴───────┬───────┴────────────┘
                              ▼
                           [ ACT ]
                 Permission-Gated Sandbox
```

### The Five Multimodal Pillars:
1. **👁️ See (Understand Images)**: Direct visual perception of diagrams, schematics, documents, and UI captures.
2. **👂 Hear (Voice Interaction)**: Fluid real-time auditory intake with dynamic frequency reaction.
3. **🧠 Think (AI Reasoning via Gemma)**: High-transparency reasoning chains, multi-step planning, and token telemetry using Google's Gemma models.
4. **🗣️ Speak (Voice Synthesis via Sarvam AI)**: Natural, culturally attuned speech synthesis across Indian languages (English, Hindi, Kannada, Tamil, Telugu).
5. **🛡️ Act (Safe Computer Actions)**: Permission-first execution sandbox. GENESIS cannot execute OS scripts or file mutations without explicit operator authorization.

---

## 🎨 Visual Identity & Energy Orb

- **Living AI Energy Orb**: Procedural HTML5 Canvas rendering of flowing organic plasma, multi-frequency waveform rings, and orbiting neural particles.
- **Strict Curated Palette**: Cybernetic Cyan (`#00f2fe`), Electric Teal (`#00e5c9`), Ice Blue (`#70d6ff`), and Frosted White (`#ffffff`). *Strictly free of pink or purple gradients.*
- **Four Dynamic States**:
  - `Idle`: Serene, deep breathing cycle (0.8 Hz) with drifting cyan filaments.
  - `Listening`: Active acoustic ripple expansion responding to microphone levels.
  - `Thinking`: Counter-rotating gyroscopic rings and high-density neural bursts.
  - `Speaking`: Resonant acoustic harmonic waves synchronized with Sarvam AI cadence.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
```bash
# 1. Clone or navigate to the repository
cd Genisis-AI

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

The app will launch at `http://localhost:3000` (or the port specified in terminal).

---

## 🧪 Hackathon Demo Features

1. **State Demo Switcher**: Click the state pills in the top header (`Idle`, `Listening`, `Thinking`, `Speaking`) to immediately preview the living orb's reactive visual states.
2. **Interactive Microphone**: Toggle the mic button to initiate simulated voice intake; GENESIS transitions into voice capture and processes your query.
3. **Multimodal Image Ingest**: Click the image button or use the quick prompt *"👁️ See: Diagram Analysis"* to upload a schematic and watch the vision analysis pipeline activate.
4. **Gemma Reasoning Accordion**: Expand the *"Gemma 2 Reasoning Trace"* dropdown on any response to see the step-by-step logic breakdown, tokens, and latency.
5. **Sarvam AI Audio Player**: Tap the play button on synthesized voice responses to inspect simulated waveform playback and language indicators.
6. **Safe Computer Action Authorization**: When an action is proposed, test both the **"Authorize Action"** and **"Decline"** buttons. Authorized actions are immediately registered into the live **HUD Audit Log**.

---

## 📁 Project Architecture

```
Genisis-AI/
├── index.html                   # HTML entry point with fonts & metadata
├── package.json                 # Dependencies (React 18, Vite 5, Lucide)
├── vite.config.js               # Vite build and dev server configuration
├── .gitignore                   # Git exclusion rules
├── .env.example                 # Environment variable templates
├── README.md                    # Project documentation & pitch
└── src/
    ├── main.jsx                 # React root mount
    ├── index.css                # Global design system & theme variables
    ├── App.jsx                  # Master multimodal state orchestration
    ├── App.css                  # Hero layout & stage styling
    └── components/
        ├── EnergyOrb.jsx        # Living Canvas procedural AI energy orb
        ├── EnergyOrb.css        # Orb gyroscopic rings & glow animations
        ├── Header.jsx           # Top HUD bar & demo state switcher
        ├── Header.css           # Header styling
        ├── CommandCenter.jsx    # Input bar, mic, file upload, quick prompts
        ├── CommandCenter.css    # Command center styling
        ├── TranscriptArea.jsx   # Multimodal chat & action cards
        ├── TranscriptArea.css   # Chat bubble & waveform styles
        ├── ActivityStatusPanel.jsx # System HUD telemetry & audit log
        └── ActivityStatusPanel.css # Telemetry styling
```

---

## 🔒 Security & Safe Operation

GENESIS AI enforces strict zero-trust sandbox boundaries:
- Actions require explicit user confirmation.
- Destructive commands are blocked by default.
- Cryptographic execution tokens track all actions in the audit ledger.
- For this initial frontend hackathon milestone, all AI and TTS pipelines run in **simulation mode** without needing secret API keys.

---

## 👥 Hack Day Bengaluru 2026

Built with passion for the next era of ambient computing and safe multimodal intelligence.

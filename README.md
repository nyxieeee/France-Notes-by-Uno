<div align="center">

<img src="https://img.shields.io/badge/France%20Notes-%F0%9F%8C%B8-ff6b96?style=for-the-badge" alt="France Notes" />

# France Notes ✨

### *A personalized AI-powered nursing school companion*

> Built with love by Uno, for France. 🌸

[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178c6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square&logo=tauri)](https://tauri.app)
[![Groq](https://img.shields.io/badge/Groq-LLaMA%203.3-f55036?style=flat-square)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-pink?style=flat-square)](LICENSE)

---

*"Like studying with Uno beside her."*

</div>

---

## 🌸 What is France Notes?

**France Notes** is a pastel pink, AI-powered nursing school survival companion — designed specifically for one person: **France**.

It combines everything a nursing student needs into one intelligent, mobile-friendly space:

- 💬 **Doc Uno** — an AI study companion with Uno's personality, always there to teach, comfort, quiz, and keep her company during late-night study sessions
- 📝 **NCLEX Quiz Generator** — randomized exams with instant rationales and weak-topic analysis
- 🩺 **RetDem Practice** — step-by-step return demonstration coaching with AI feedback
- ⏰ **Smart Reminders** — deadline tracker with Doc Uno-style nag messages (*"Babe 😭 your pharmacology exam is tomorrow"*)
- ✨ **Fun Facts with Uno** — random, weird, funny, and medical facts sprinkled throughout the app
- 📸 **Scanner** *(coming soon)* — handwriting recognition for notes and transes
- 🔎 **Nursing Search** *(coming soon)* — trusted medical references only (NCBI, CDC, WHO, Mayo Clinic)
- 📊 **Presentation Generator** *(coming soon)* — auto-generate reporting slides from uploaded files

Unlike generic study apps, France Notes is designed to feel **personal, comforting, and genuinely supportive** — because it was built by someone who knows her.

---

## 🎨 Design

| Token | Value |
|-------|-------|
| Primary | Pastel pink `#ff6b96` |
| Background | Cream `#fdfaf7` |
| Accent | Rose `#ffc2d4` |
| Font | DM Serif Display + DM Sans |
| Vibe | Cozy study planner meets wellness app |

---

## 🤖 Doc Uno Modes

Doc Uno is the heart of the app — an AI companion inspired by Uno's personality. Supportive, smart, slightly teasing, and always comforting.

| Mode | Vibe |
|------|------|
| 📚 **Tutor Mode** | Explains nursing concepts casually and clearly |
| 📝 **Quiz Mode** | Fires NCLEX-style questions, celebrates wins |
| 🤗 **Comfort Mode** | Just listens and supports, no studying required |
| 🌙 **Late Night Mode** | Cozy, calm energy for those 2AM study sessions |
| 🩺 **RetDem Coach** | Step-by-step procedure coaching with rationales |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| AI | [Groq API](https://groq.com) — `llama-3.3-70b-versatile` |
| Desktop + Mobile | [Tauri v2](https://tauri.app) |
| Styling | Pure CSS with custom design tokens |
| State | React Context API |
| Routing | React Router v7 |
| Key Storage | Tauri Plugin Store / localStorage (web) |

---

## 📦 Platforms

| Platform | Format | Build From |
|----------|--------|------------|
| 🌐 Web | Static site | Any OS |
| 🪟 Windows | `.exe` + `.msi` | Windows |
| 🍎 macOS | `.dmg` + `.app` | macOS |
| 🐧 Linux | `.AppImage` + `.deb` | Linux |
| 🤖 Android | `.apk` + `.aab` | Any OS (needs Android Studio) |
| 📱 iOS | `.ipa` | macOS (needs Xcode) |

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Link |
|------|---------|------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Rust | latest stable | [rustup.rs](https://rustup.rs) |
| Tauri CLI | v2 | `npm i -g @tauri-apps/cli@^2` |

For **Android**: Android Studio + SDK, `ANDROID_HOME` set, then `tauri android init`

For **iOS** (macOS only): Xcode 14+, Apple Developer account, then `tauri ios init`

---

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/france-notes.git
cd france-notes

# Install dependencies
npm install
```

---

### Running in Development

```bash
# Web
npm start

# Desktop (native window)
npm run tauri:dev

# Android
npm run tauri:android:dev

# iOS (macOS only)
npm run tauri:ios:dev
```

---

### Building for Release

```bash
# Web
npm run build
# → /build (deploy to Vercel, Netlify, etc.)

# Desktop (run from target OS)
npm run tauri:build
# → src-tauri/target/release/bundle/

# Android
npm run tauri:android
# → src-tauri/gen/android/app/build/outputs/

# iOS (macOS only)
npm run tauri:ios
# → src-tauri/gen/apple/build/
```

---

## 🔑 Groq API Key Setup

On first launch, France Notes will walk you through setup:

1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Create a free API key
3. Paste it into the app — that's it!

**Security:** The key is stored securely on-device only via Tauri's encrypted store. We never see it. 🔒

---

## 📁 Project Structure

```
france-notes/
├── src/
│   ├── pages/
│   │   ├── Home/             # Dashboard, quick actions, fun facts
│   │   ├── DocUno/           # AI chat companion (5 modes)
│   │   ├── Quiz/             # NCLEX quiz generator + results
│   │   ├── RetDem/           # Return demonstration practice
│   │   ├── Reminders/        # Deadline tracker
│   │   └── ApiKeySetup/      # First-launch onboarding
│   ├── hooks/
│   │   └── useClaude.ts      # Groq API hook
│   ├── lib/
│   │   ├── apiKey.ts         # Secure key storage abstraction
│   │   └── prompts.ts        # Doc Uno system prompts + fun facts
│   ├── context/
│   │   └── AppContext.tsx    # Global app state
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   └── styles/
│       └── globals.css       # Design tokens + global styles
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # Tauri entry point
│   │   └── lib.rs            # Plugin registration
│   ├── capabilities/
│   │   └── default.json      # Platform permissions
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri configuration
└── package.json
```

---

## ✅ Features Built

- [x] 🌸 Home dashboard with time-based greeting
- [x] ✨ Fun Facts with Uno throughout the app
- [x] 💬 Doc Uno AI chat with 5 personality modes
- [x] 📝 NCLEX-style quiz generator with rationales + scoring
- [x] 🩺 RetDem AI coaching for nursing procedures
- [x] ⏰ Deadline reminders with Doc Uno nag messages
- [x] 🔒 Secure Groq API key storage (Tauri store)
- [x] 🎨 Full pastel pink cozy UI system

## 🚧 Coming Soon

- [ ] 📸 Scanner + handwriting recognition
- [ ] 🔎 Nursing-only smart search (NCBI, CDC, WHO)
- [ ] 📊 AI presentation generator
- [ ] 🎤 Recitation mode (Gentle / Clinical / Doc Uno)
- [ ] 📤 Smart export (PDF, DOCX, PPTX)
- [ ] 📅 Calendar dashboard
- [ ] 📱 App icon + splash screen

---

## 🖼 App Icons

Generate all platform icons from a single 1024×1024 PNG:

```bash
npx tauri icon your-icon.png
# Places all sizes in src-tauri/icons/
```

---

## 📄 License

MIT — do whatever you want with it, babe. 🌸

---

<div align="center">

Made with 🌸 by **Uno**, for **France**

*"Babe 😭 you've got this."*

</div>

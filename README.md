<div align="center">

<img src="public/france-notes-horizontal-logo.png" alt="France Notes" width="320" />

# France Notes 🌸

### *A personalized AI-powered nursing school companion*

> Built with love by Uno, for France.

[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite)](https://vitejs.dev)
[![Groq](https://img.shields.io/badge/Groq-LLaMA%203.3-f55036?style=flat-square)](https://groq.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-pink?style=flat-square)](LICENSE)

</div>

---

## What is France Notes?

**France Notes** is a pastel pink, AI-powered study companion built specifically for nursing students — and originally, for one person in particular: **France**.

It brings together everything a nursing student needs in one cozy, intelligent space: AI-assisted studying, NCLEX-style quizzes, return demonstration practice, clinical simulations, a knowledge garden, a planner, and an always-available AI companion named **Doc Uno**.

Unlike generic study apps, France Notes is designed to feel *personal, comforting, and genuinely supportive.*

---

## Features

- **Doc Uno AI** — A study companion with personality. Chat in Tutor, Quiz, Comfort, Late Night, or RetDem Coach mode.
- **Study Box** — Upload and organize your notes, transes, and reviewers.
- **Reviewer Library** — Browse and manage your saved study materials.
- **NCLEX Quiz Generator** — Randomized exams with instant rationales and weak-topic tracking.
- **Simulation Hub** — Practice clinical scenarios and recitation with AI feedback.
- **Return Demonstration (RetDem) Coach** — Step-by-step procedure coaching with rationales.
- **Knowledge Garden** — A personal space to grow and revisit key nursing concepts.
- **Planner** — Stay on top of deadlines, schedules, and study goals.
- **Fun Facts** — Random, weird, and wonderful medical facts sprinkled throughout the app.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 8 |
| AI | [Groq API](https://groq.com) — `llama-3.3-70b-versatile` |
| Auth & DB | [Supabase](https://supabase.com) |
| Styling | Tailwind CSS + custom design tokens |
| State | Zustand + React Query |
| Routing | React Router v7 |
| Animations | Framer Motion |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- A free [Groq API key](https://console.groq.com/keys)
- A [Supabase](https://supabase.com) project (for auth)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/france-notes.git
cd france-notes

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your Groq and Supabase credentials in .env
```

### Running locally

```bash
npm run dev
```

Then open `http://localhost:5173` in your browser.

### Building for production

```bash
npm run build
# Output in /dist — deploy to Vercel, Netlify, or any static host
```

---

## Design

| Token | Value |
|-------|-------|
| Primary | Pastel pink `#ff6b96` |
| Background | Cream `#fdfaf7` |
| Accent | Rose `#ffc2d4` |
| Font | DM Serif Display + DM Sans |
| Vibe | Cozy study planner meets wellness app |

---

## License

MIT — do whatever you want with it. 🌸

---

<div align="center">

Made with 🌸 by **Uno**, for **France**

*"Babe 😭 you've got this."*

</div>

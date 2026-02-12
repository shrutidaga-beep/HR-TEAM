# TalentPulse AI 🚀

TalentPulse AI is an intelligent, high-performance recruitment engine designed to streamline the hiring process. Built for modern hiring teams, it automates the most time-consuming parts of recruitment: CV screening and initial candidate interviewing.

## ✨ Features

- **Multi-Role Pipeline Management**: Create and manage separate recruitment pipelines for different job roles.
- **Intelligent CV Screening**: Uses **Gemini 3 Flash** to analyze candidate CVs against specific Job Descriptions, extracting key strengths, gaps, and providing an initial "Match Score".
- **Automated Screening Calls**: Features a live voice-based interview interface powered by the **Gemini 2.5 Flash Live API**. It conducts real-time, context-aware screening calls, evaluating candidates on experience, technical fit, and soft skills.
- **Holistic Decision Engine**: Separately tracks Resume and Interview scores. The final selection/rejection decision is driven by the AI's deep assessment during the screening call.
- **Live Recruitment Dashboard**: A tabbed interface to track "Selects", "Rejects", and the complete candidate pool with detailed reasoning for every decision.
- **Data Export**: Export comprehensive selection reports in CSV format for internal stakeholders.

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/) (Functional Components, Hooks, Context-like state management).
- **AI Engine**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`).
  - **Text Generation**: `gemini-3-flash-preview` for high-speed CV parsing and analysis.
  - **Live Audio**: `gemini-2.5-flash-native-audio-preview-12-2025` for real-time voice interaction.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a focus on modern, glassmorphic UI aesthetics.
- **Icons**: [Lucide React](https://lucide.dev/).
- **Audio Processing**: Web Audio API for real-time PCM encoding/decoding and gapless playback.

## 🚀 Getting Started

### Prerequisites
- An API Key from [Google AI Studio](https://aistudio.google.com/).
- A modern web browser with Microphone permissions enabled.

### Installation
The project uses `esm.sh` for dependency management, so no local `npm install` is strictly required for the web version. 

1. Ensure your environment has `process.env.API_KEY` configured.
2. Open `index.html` in a local server or host on a platform like Vercel/Netlify.

## 📁 Project Structure

- `App.tsx`: Orchestrates the main view states (Role Setup & Dashboard).
- `services/gemini.ts`: Contains the logic for the initial CV analysis using structured JSON output.
- `components/CallInterface.tsx`: The core of the Live API interaction, handling real-time audio streaming and transcription.
- `components/ResultCard.tsx`: Detailed visualization of a candidate's journey from screening to final verdict.
- `utils/audio.ts`: Essential helpers for Base64 encoding/decoding and PCM audio buffer management.

## 🛡️ Security & Permissions
TalentPulse AI requires **Microphone** access to facilitate the automated screening calls. All processing is done via secure API calls to Google's Gemini models.

---
*Built with ❤️ for Talent Acquisition Teams.*
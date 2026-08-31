# 🦩 Flamingo e Fundit — Flock The System

[![Deploy to GitHub Pages](https://github.com/Flamingo-Revolution/flock-the-system/actions/workflows/deploy.yml/badge.svg)](https://github.com/Flamingo-Revolution/flock-the-system/actions/workflows/deploy.yml)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Phaser](https://img.shields.io/badge/Phaser-3.90-E54825?style=flat&logo=phaser&logoColor=white)](https://phaser.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Flamingo e Fundit** (*Flock The System*) is a satirical, mobile-first 2D arcade runner set in a propaganda-soaked Tirana. Players take control of a fearless pink flamingo, jumping over bureaucratic traps, shredding empty political slogans in mid-air, slamming corruption caricatures into iron cages, and exposing real-world Albanian political dossiers.

---

## 🎮 Live Demo & Gameplay

Play directly in your mobile or desktop browser:
👉 **[Play Flamingo e Fundit](https://Flamingo-Revolution.github.io/flock-the-system/)**

---

## ✨ Features & Gameplay Mechanics

### 🕹️ Chrome Dino-Style Arcade Precision
* **Juicy Jump Physics:** Tuned jump arc with jump buffering, coyote time, and dynamic obstacle pacing so every jump feels responsive, fair, and fun.
* **Double Obstacle Bundles:** Synchronized obstacle clustering engineered for clean single-jump clearance.
* **First-Hit Grace:** Near-miss stumbling recovery before game over.

### 🎭 Real-World Albanian Political Satire & Scandals
* **Antagonist Iron Cage Captures:** Slam political caricatures (*Edi*, *Sali*, *Erion*) into heavy iron bars with custom comic rubber stamps (*"SPAK ALERT"*, *"NON GRATA"*, *"DOSJA 5D"*).
* **Dossier & Scandal Reveals:** Exposes authentic Albanian political dossiers:
  * *Afera e Inceneratorëve* ("Plehrat imagjinare, paratë reale")
  * *Dosja 5D & Drejtorët* ("Tenderat e bashkisë ia japim vetes")
  * *Koncesioni i Sterilizimit* ("Gërshërët e florinjta kirurgjikale")
  * *Porti i Jahteve në Durrës* ("Apartamente luksi me zero taksa")
  * *Baza e Patronazhistëve* ("Partia di çfarë ke ngrënë në mëngjes")
  * *Koncesioni i Check-Up* ("Analiza fiktive për njerëz të vdekur")
  * *Tigri i Arratisur* ("Arben Ahmetaj shijon Zvicrën")
  * *Fatura e Steak-ut në New York* ("Nusret për delegacionin qeveritar")
* **Custom Slogans:** Authentic protest chants shredded in mid-air:
  * *"RNBBNB (Rama n'Burg, Berisha n'Burg)"*
  * *"Rama ku? Burg! Berisha ku? Burg! Të gjithë ku? Burg!"*
  * *"Zeqine zeqine 3 milioni jemi ne, ti nuk di të numërosh, shko n'shkollë të mësosh"*
* **Breaking News Ticker & Glitch Billboards:** Real-time satire headlines flashing across the screen with rooftop neon signs alternating between regime spin and uncovered truths.

### 🔊 Procedural Web Audio Synth
* **Zero External MP3 Latency:** 100% generated via procedural Web Audio API oscillators.
* Retro chiptune sound effects: jump swoosh, slogan shred, heavy metal iron cage slam, and dynamic upbeat protest synth soundtrack.
* Full audio mute & volume toggle with persistent state.

### 📳 Tactile Haptic Micro-Vibrations (Mobile)
* **Jump Launch:** 15ms light tap.
* **Slogan Shred / Cage Slam:** 30ms crisp double-tap.
* **First-Hit Stumble:** 80ms heavy pulse.
* **Game Over Crash:** Deep crash rumble.

---

## 🕹️ Controls

| Platform | Action | Key / Gesture |
| :--- | :--- | :--- |
| **Mobile / Tablet** | **Jump** | Tap anywhere on screen |
| **Desktop Keyboard** | **Jump** | `Space`, `Up Arrow`, or `Enter` |
| **Desktop Keyboard** | **Pause / Resume** | `P` |
| **Desktop Keyboard** | **Restart Run** | `R` |
| **Desktop Keyboard** | **Mute / Unmute** | `M` |

---

## 🏗️ Architecture & Project Structure

The project is built as a pure frontend, zero-backend single-page web app:

```text
flock-the-system/
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages CI/CD automated deployment
├── public/
│   └── assets/             # Vector SVGs, sprites, silhouettes, characters, icons
├── src/
│   ├── game/
│   │   ├── audio.ts        # Procedural Web Audio synthesizer sound FX & soundtrack
│   │   ├── createGame.ts   # Phaser 3 runner engine, physics, Director, ticker & cage logic
│   │   ├── events.ts       # Type-safe EventBus bridging Phaser & React
│   │   ├── obstacles.ts    # Dossiers, custom slogans, caricatures & satire headlines
│   │   └── types.ts        # Core TypeScript interfaces & game models
│   ├── App.tsx             # React UI overlay, phase select, combo tracker & modal screens
│   ├── main.tsx            # Application entrypoint
│   └── styles.css          # Cyber-arcade responsive CSS, animations, glassmorphism UI
├── index.html              # HTML5 template with mobile viewport optimizations
├── vite.config.ts          # Vite build config with automatic GitHub Pages base routing
└── package.json            # Project dependencies & scripts
```

---

## 💻 Local Development

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or v22 recommended)
* npm (v9+)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/Flamingo-Revolution/flock-the-system.git
cd flock-the-system

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build & Preview

```bash
npm run build
npm run preview
```

---

## 🚀 GitHub Pages Deployment

The repository includes a ready-to-use GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### To Enable Automated Deployment:
1. Go to your GitHub repository: `https://github.com/Flamingo-Revolution/flock-the-system`.
2. Navigate to **Settings** ➡️ **Pages** (under *Code and automation*).
3. Under **Build and deployment** ➡️ **Source**, select **`GitHub Actions`**.
4. Push to `main` branch — the deployment workflow will build and publish automatically.

---

## 📜 License & Satirical Disclaimer

This project is an interactive political satire and parody. All caricatures, dossiers, and slogans are created for humorous, educational, and artistic commentary on public governance, propaganda, and transparency.

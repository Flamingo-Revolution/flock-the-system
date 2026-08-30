# Flamingoja e Fundit

**Flamingoja e Fundit** is a frontend-only 2D satirical platformer about a rebellious flamingo flying over a propaganda-soaked version of Albania and exposing the machinery behind public deception.

The game is planned as a modular beta first: one playable experience, built in a way that makes it easy to add new stages, Albanian ministries, buildings, political caricatures, objectives, and satire targets later.

## Local Development

The project skeleton uses Vite, React, TypeScript, and Phaser.

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

The GitHub Pages workflow is in `.github/workflows/deploy.yml`. In GitHub repository settings, enable Pages and choose **GitHub Actions** as the source.

Current gameplay rules are documented in [`RULES.md`](RULES.md).

## Core Idea

A pink flamingo flies across an exaggerated Albanian city where propaganda is everywhere: billboards, ministries, media towers, fake construction sites, loudspeakers, surveillance drones, and staged public ceremonies.

The current prototype is a fullscreen mobile T-Rex-style runner: the scene scrolls, the player taps to jump, avoids ground and air hazards, and collects slogans, people, and documents that reveal the contradiction underneath: broken promises, fake progress, inflated numbers, empty reforms, unfinished projects, or absurd slogans.

The goal is not to attack real people. The goal is to make a playable satire about propaganda, corruption, media manipulation, public spectacle, and institutional absurdity.

## Tone

The tone should be:

- Satirical
- Playful
- Chaotic
- Political, but not preachy
- Albanian in setting and references
- Understandable to international players

The game should feel like an arcade platformer first. The political message should come through the world, objectives, characters, signs, reveals, and boss behaviors.

## Beta Scope

The first beta should stay small but expandable.

The beta should include:

- A playable flamingo character
- T-Rex-style tap-to-jump movement tuned for mobile screens
- At least one complete level
- A basic level select screen
- Collectible propaganda reveals
- Albanian ministry-themed buildings
- At least one politician-style caricature as a mini-boss or hazard
- Score, combos, objectives, and level completion
- Local progress using browser storage
- No backend

The beta should not try to include every idea at once. The priority is to prove the core loop is fun and that adding new content is simple.

## Gameplay Loop

1. Choose a stage.
2. Fly through the level as the flamingo.
3. Avoid hazards such as drones, microphones, cameras, ministries, papers, podiums, and bureaucratic traps.
4. Jump into slogans, people, and documents when they are safely reachable.
5. Reveal what is hidden underneath each polished public message.
6. Build score through combos, precision hits, and objective completion.
7. Complete the stage by exposing enough propaganda or defeating the stage boss.

## World Structure

The game should be organized into phases. Each phase represents a different part of the propaganda machine.

Each phase can contain multiple levels. Each level can define its own buildings, targets, hazards, characters, objectives, and reveal messages.

## Development Phases

### Phase 1: City of Slogans

Purpose: Establish the core gameplay.

Setting: A public square in Albania covered with slogans, banners, campaign posters, billboards, and loudspeakers.

Possible targets:

- Propaganda billboards
- Public announcement screens
- Campaign posters
- Loudspeaker poles
- Fake progress banners
- Decorative ribbon-cutting stages

Possible hazards:

- Small surveillance drones
- Moving spotlights
- Megaphone sound waves
- Falling poster frames

Primary objective examples:

- Destroy a required number of billboards.
- Expose three hidden contradictions.
- Reach the end of the square before the propaganda meter fills.

This phase should work as the tutorial and first playable proof of concept.

### Phase 2: Broadcast District

Purpose: Introduce media manipulation as a gameplay theme.

Setting: A district with TV buildings, broadcast towers, giant screens, antennas, and mobile camera crews.

Possible targets:

- TV towers
- Studio buildings
- Giant news screens
- Signal antennas
- Camera drones
- Fake poll machines

Possible hazards:

- Signal beams
- Camera flashes
- Flying news tickers
- Drone swarms
- Rotating broadcast dishes

Primary objective examples:

- Interrupt the propaganda broadcast.
- Break all signal towers.
- Hit screens in the correct order to reveal the real message.

This phase should make the world feel more reactive and noisy.

### Phase 3: Ministry of Promises

Purpose: Bring Albanian ministry satire into the game.

Setting: A fictional government area in Albania with ministry buildings, ceremonial entrances, paperwork traps, and public service windows.

Important note: Ministry names should be fictional or parody names unless there is a deliberate legal/editorial decision to use real institution names.

Possible ministries:

- Ministry of Endless Promises
- Ministry of Delayed Reforms
- Ministry of Public Smiles
- Ministry of Strategic Excuses
- Ministry of Decorative Transparency
- Ministry of Unfinished Projects

Possible targets:

- Ministry signs
- Promise archives
- Reform folders
- Queue machines
- Stamp machines
- Public service kiosks
- Locked transparency boxes

Possible hazards:

- Paper shields
- Stamp traps
- Endless queue barriers
- Bureaucracy walls
- Falling folders
- Red tape lasers

Primary objective examples:

- Expose hidden files inside the ministry.
- Break enough promise archives.
- Defeat a bureaucrat mini-boss who hides behind paperwork.

This phase should support multiple Albanian ministry-style buildings through configuration.

### Phase 4: Tender Yard

Purpose: Satirize fake development, inflated projects, and unfinished infrastructure.

Setting: A construction zone with cranes, half-built roads, empty project signs, concrete machines, and ribbon-cutting platforms.

Possible targets:

- Tender boards
- Unfinished road segments
- Construction cranes
- Concrete mixers
- Inflated invoice machines
- Decorative project render signs
- VIP ribbon platforms

Possible hazards:

- Swinging crane hooks
- Cement splashes
- Falling bricks
- Moving bulldozers
- Invoice printers
- Barriers that appear after fake approvals

Primary objective examples:

- Destroy invoice machines.
- Reveal the real cost behind fake project signs.
- Stop the ribbon-cutting ceremony before the timer ends.

This phase should feel more mechanical and timing-based.

### Phase 5: Palace of Spin

Purpose: Combine the previous systems into a larger final beta challenge.

Setting: A large propaganda headquarters in Albania where ministries, media, tenders, slogans, and staged ceremonies connect into one machine.

Possible targets:

- Central propaganda engine
- Giant slogan screen
- Spin control towers
- Public applause machines
- Fake statistic generators
- Ministry relay devices

Possible hazards:

- Stronger drones
- Rotating slogans
- Signal storms
- Paper shields
- Moving platforms
- Boss attacks from political caricatures

Primary objective examples:

- Disable the propaganda engine.
- Defeat multiple mini-bosses.
- Reveal the final contradiction behind the central slogan.

This phase can become the final stage of the first full beta.

## Characters

### Player Character

The main character is the flamingo.

Possible abilities:

- Fly
- Glide
- Dash
- Drop projectiles
- Collect food to reload
- Chain hits for combos
- Trigger reveal effects when targets break

The flamingo should feel funny, fast, and expressive.

### Political Caricatures

Political figures should be fictional caricatures, not direct copies of real people in the first beta.

They can represent behaviors instead of specific individuals:

- The Slogan Minister
- The Promise Collector
- The Ribbon Cutter
- The Broadcast Baron
- The Tender Magician
- The Minister of Excuses

Each caricature should have:

- A simple visual identity
- A gameplay role
- A weakness
- A few short satirical lines or behaviors
- A connection to the phase theme

## Content System

The game should be built so new content can be added without rewriting core gameplay code.

Recommended content types:

- Levels
- Buildings
- Targets
- Hazards
- Politician caricatures
- Reveal messages
- Objectives
- Backgrounds
- Collectibles

Example level configuration:

```json
{
  "id": "city-of-slogans-01",
  "phase": "city-of-slogans",
  "title": "The Square of Big Promises",
  "setting": "Albania",
  "objectives": [
    "destroy_5_billboards",
    "expose_3_contradictions"
  ],
  "buildings": [
    "municipal_slogan_hall",
    "public_smiles_office"
  ],
  "hazards": [
    "camera_drone",
    "megaphone_wave"
  ],
  "boss": null
}
```

Example building configuration:

```json
{
  "id": "ministry_of_endless_promises",
  "name": "Ministry of Endless Promises",
  "type": "ministry",
  "country": "Albania",
  "health": 120,
  "score": 500,
  "surfaceText": "Every promise delivered.",
  "revealedText": "Delivery postponed to the next campaign."
}
```

Example politician caricature configuration:

```json
{
  "id": "the_slogan_minister",
  "name": "The Slogan Minister",
  "role": "mini_boss",
  "phase": "ministry-of-promises",
  "health": 300,
  "attacks": [
    "megaphone_wave",
    "paper_shield"
  ],
  "weakness": "hit_billboards_first"
}
```

## Suggested Project Structure

```text
src/
  game/
    scenes/
      BootScene.js
      MenuScene.js
      LevelSelectScene.js
      GameScene.js
      ResultsScene.js
    systems/
      levelLoader.js
      scoring.js
      objectives.js
      collisions.js
      storage.js
    data/
      phases.json
      levels.json
      buildings.json
      politicians.json
      hazards.json
      revealMessages.json
  assets/
    sprites/
    backgrounds/
    audio/
    ui/
```

This structure can change once the framework is chosen, but the project should keep the same principle: gameplay systems in code, game content in data.

## Frontend-Only Architecture

This game should run without a backend.

Planned frontend responsibilities:

- Render the game
- Load local JSON content
- Store progress in `localStorage`
- Store high scores locally
- Handle menus and level selection
- Package as a static website

Possible frontend stack:

- Vite
- TypeScript
- Phaser

Static deployment options:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

## Contribution Notes

When adding new content:

- Keep visible names and text in Albanian.
- Keep the setting and institutional satire rooted in Albania.
- Prefer fictional ministry and politician names unless the project explicitly decides otherwise.
- Add content through data files when possible.
- Keep levels readable and easy to modify.
- Make satire specific, but avoid unnecessary personal attacks.
- Make gameplay fun before adding more political text.

When adding a new phase, define:

- Phase name
- Setting
- Main theme
- New mechanics
- New targets
- New hazards
- Objective examples
- Expected boss or mini-boss behavior

## Current Goal

Build a small playable beta that proves the central idea:

**A flamingo flies across Albania-themed propaganda environments, damages propaganda objects, reveals hidden contradictions, scores points, and completes staged objectives.**

The first milestone should be **Phase 1: City of Slogans** with enough modular structure to add ministries, politicians, buildings, and future phases without rebuilding the game from scratch.

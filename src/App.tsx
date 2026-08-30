import { useEffect, useRef, useState } from "react";
import { soundManager } from "./game/audio";
import { createGame } from "./game/createGame";
import { GAME_COMMAND_EVENT, type GameCommand, type GameStats } from "./game/events";
import { getLevel, levels } from "./game/levels";
import "./styles.css";

const BEST_SCORE_KEY = "flamingoja-e-fundit-best-score";
const COMPLETED_LEVELS_KEY = "flamingoja-e-fundit-completed-levels";
const DEFAULT_LEVEL_ID = levels[0].id;

function readCompletedLevels() {
  try {
    const saved = window.localStorage.getItem(COMPLETED_LEVELS_KEY);
    return new Set<string>(saved ? (JSON.parse(saved) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

export default function App() {
  const gameHost = useRef<HTMLDivElement | null>(null);
  const bestScoreRef = useRef(0);
  const [selectedLevelId, setSelectedLevelId] = useState(DEFAULT_LEVEL_ID);
  const selectedLevel = getLevel(selectedLevelId);
  const [completedLevels, setCompletedLevels] = useState(readCompletedLevels);
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());
  const [stats, setStats] = useState<GameStats>({
    levelId: selectedLevel.id,
    levelName: selectedLevel.name,
    score: 0,
    exposure: 0,
    lives: 1,
    combo: 1,
    status: "ready",
    message: selectedLevel.intro,
  });
  const [bestScore, setBestScore] = useState(() => {
    const storedBestScore = Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0);
    bestScoreRef.current = storedBestScore;
    return storedBestScore;
  });

  function sendCommand(command: GameCommand) {
    window.dispatchEvent(new CustomEvent<GameCommand>(GAME_COMMAND_EVENT, { detail: command }));
    gameHost.current?.focus();
  }

  function startGame() {
    setIsStageMenuOpen(false);
    sendCommand("start");
  }

  function toggleSound(event: React.MouseEvent) {
    event.stopPropagation();
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  }

  function goToNextLevel(event: React.MouseEvent) {
    event.stopPropagation();
    const currentIndex = levels.findIndex((lvl) => lvl.id === selectedLevelId);
    if (currentIndex < levels.length - 1) {
      setSelectedLevelId(levels[currentIndex + 1].id);
      sendCommand("restart");
    }
  }

  useEffect(() => {
    if (!gameHost.current) return;

    const game = createGame(gameHost.current, selectedLevelId, {
      onStatsChange(nextStats) {
        setStats(nextStats);
        if (nextStats.score > bestScoreRef.current) {
          bestScoreRef.current = nextStats.score;
          setBestScore(nextStats.score);
          window.localStorage.setItem(BEST_SCORE_KEY, String(nextStats.score));
        }
      },
      onLevelComplete(levelId) {
        setCompletedLevels((currentCompletedLevels) => {
          const nextCompletedLevels = new Set(currentCompletedLevels);
          nextCompletedLevels.add(levelId);
          window.localStorage.setItem(
            COMPLETED_LEVELS_KEY,
            JSON.stringify([...nextCompletedLevels]),
          );
          return nextCompletedLevels;
        });
      },
    });

    return () => {
      game.destroy(true);
    };
  }, [selectedLevelId]);

  const showStartScreen =
    stats.status === "ready" || stats.status === "won" || stats.status === "lost";
  const isPlaying = stats.status === "playing";
  const currentIndex = levels.findIndex((lvl) => lvl.id === selectedLevelId);
  const hasNextLevel = stats.status === "won" && currentIndex < levels.length - 1;

  return (
    <main className="app-shell">
      <section className="game-layout" aria-label="Loja">
        <div ref={gameHost} className="game-host" tabIndex={-1} />
      </section>

      {/* Modern Sleek Mobile HUD Bar */}
      <header className="mobile-hud" aria-label="Statistikat e lojës">
        <div className="hud-pill">
          <div className="stat-item stat-score">
            <span className="stat-icon">⭐</span>
            <div className="stat-content">
              <span className="stat-label">PIKË</span>
              <span className="stat-val">{stats.score}</span>
            </div>
          </div>

          <div className="stat-divider" />

          <div className="stat-item stat-record">
            <span className="stat-icon">🏆</span>
            <div className="stat-content">
              <span className="stat-label">REKORD</span>
              <span className="stat-val">{bestScore}</span>
            </div>
          </div>

          <div className="stat-divider" />

          <div className="stat-item stat-reveal">
            <span className="stat-icon">🎯</span>
            <div className="stat-content">
              <span className="stat-label">ZBULIME</span>
              <span className="stat-val">
                {stats.exposure}/{selectedLevel.targetExposure}
              </span>
            </div>
          </div>

          {stats.combo > 1 ? (
            <>
              <div className="stat-divider" />
              <div className="stat-item stat-combo">
                <span className="combo-badge">x{stats.combo}</span>
              </div>
            </>
          ) : null}
        </div>

        <div className="hud-actions">
          <button
            type="button"
            className="hud-action-btn"
            onClick={toggleSound}
            title={isMuted ? "Aktivizo Zërin" : "Çaktivizo Zërin"}
            aria-label="Audio"
          >
            {isMuted ? "🔇" : "🔊"}
          </button>

          {isPlaying || stats.status === "paused" ? (
            <button
              type="button"
              className="hud-action-btn"
              onClick={() => sendCommand(stats.status === "paused" ? "start" : "pause")}
              title={stats.status === "paused" ? "Vazhdo" : "Pauzë"}
              aria-label="Pauze"
            >
              {stats.status === "paused" ? "▶" : "⏸"}
            </button>
          ) : null}
        </div>
      </header>

      {/* Start / Game Over / Victory Modal */}
      {showStartScreen ? (
        <section className="start-screen" aria-label="Nisja" onClick={startGame}>
          <div className="start-card">
            <p className="phase-label">{selectedLevel.phase}</p>
            <h2>
              {stats.status === "won"
                ? "Faza u Kalua!"
                : stats.status === "lost"
                  ? "Fund Loje!"
                  : selectedLevel.name}
            </h2>
            <p className="status-subtext">{stats.message}</p>

            <div className="start-actions">
              {hasNextLevel ? (
                <button
                  type="button"
                  className="primary-start next-stage-btn"
                  onClick={goToNextLevel}
                >
                  Faza Tjetër →
                </button>
              ) : (
                <button type="button" className="primary-start" onClick={startGame}>
                  {stats.status === "lost" ? "Rinis menjëherë" : "Prek për të nisur"}
                </button>
              )}

              <div className="secondary-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsStageMenuOpen((isOpen) => !isOpen);
                  }}
                >
                  Zgjidh Fazat
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Stage Drawer */}
      {isStageMenuOpen ? (
        <aside className="stage-drawer" aria-label="Fazat">
          <div className="stage-drawer-header">
            <h2>Fazat e Propagandës</h2>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => setIsStageMenuOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="level-list">
            {levels.map((level, index) => {
              const previousLevel = levels[index - 1];
              const isUnlocked = index === 0 || completedLevels.has(previousLevel.id);
              const isSelected = selectedLevelId === level.id;

              return (
                <button
                  key={level.id}
                  type="button"
                  className={isSelected ? "level-button selected" : "level-button"}
                  disabled={!isUnlocked}
                  onClick={() => {
                    setSelectedLevelId(level.id);
                    setIsStageMenuOpen(false);
                  }}
                >
                  <span>{level.phase}</span>
                  <strong>{level.name}</strong>
                  {completedLevels.has(level.id) ? <em className="badge-done">✓ Kaluar</em> : null}
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}
    </main>
  );
}

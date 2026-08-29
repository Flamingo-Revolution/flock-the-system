import { useEffect, useRef, useState } from "react";
import { createGame } from "./game/createGame";
import { GAME_COMMAND_EVENT, type GameCommand, type GameStats } from "./game/events";
import { getLevel, levels } from "./game/levels";
import "./styles.css";

const BEST_SCORE_KEY = "flock-the-system-best-score";
const COMPLETED_LEVELS_KEY = "flock-the-system-completed-levels";
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
  const [stats, setStats] = useState<GameStats>({
    levelId: selectedLevel.id,
    levelName: selectedLevel.name,
    score: 0,
    exposure: 0,
    lives: 3,
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

  return (
    <main className="app-shell">
      <section className="game-layout" aria-label="Loja">
        <div ref={gameHost} className="game-host" tabIndex={-1} />
      </section>

      <header className={stats.status === "playing" ? "hud compact" : "hud"}>
        <div className="brand">
          <p className="eyebrow">Tufa kunder Sistemit</p>
          <h1>{stats.levelName}</h1>
        </div>
        <dl className="stats">
          <div>
            <dt>Pike</dt>
            <dd>{stats.score}</dd>
          </div>
          <div>
            <dt>Rekord</dt>
            <dd>{bestScore}</dd>
          </div>
          <div>
            <dt>Zbulime</dt>
            <dd>
              {stats.exposure}/{selectedLevel.targetExposure}
            </dd>
          </div>
          <div>
            <dt>Seri</dt>
            <dd>x{stats.combo}</dd>
          </div>
          <div>
            <dt>Jete</dt>
            <dd>{stats.lives}</dd>
          </div>
        </dl>
      </header>

      {showStartScreen ? (
        <section className="start-screen" aria-label="Nisja" onClick={startGame}>
          <div className="start-copy">
            <p className="phase-label">{selectedLevel.phase}</p>
            <h2>{selectedLevel.name}</h2>
            <p>{stats.message}</p>
          </div>
          <button type="button" className="primary-start" onClick={startGame}>
            Prek per te nisur
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={(event) => {
              event.stopPropagation();
              setIsStageMenuOpen((isOpen) => !isOpen);
            }}
          >
            Fazat
          </button>
        </section>
      ) : (
        <div className="play-controls">
          <button type="button" onClick={() => sendCommand("pause")}>
            {stats.status === "paused" ? "Vazhdo" : "Pauze"}
          </button>
          <button type="button" onClick={() => sendCommand("restart")}>
            Rinis
          </button>
        </div>
      )}

      {isStageMenuOpen ? (
        <aside className="stage-drawer" aria-label="Fazat">
          <h2>Fazat</h2>
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
                  {level.name}
                  {completedLevels.has(level.id) ? <strong>Kaluar</strong> : null}
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}
    </main>
  );
}

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
  const [stats, setStats] = useState<GameStats>({
    levelId: selectedLevel.id,
    levelName: selectedLevel.name,
    score: 0,
    exposure: 0,
    lives: 3,
    combo: 1,
    status: "ready",
    message: "Press Enter to start",
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

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Flock the System</p>
          <h1>{stats.levelName}</h1>
        </div>
        <dl className="stats">
          <div>
            <dt>Score</dt>
            <dd>{stats.score}</dd>
          </div>
          <div>
            <dt>Best</dt>
            <dd>{bestScore}</dd>
          </div>
          <div>
            <dt>Exposure</dt>
            <dd>{stats.exposure}%</dd>
          </div>
          <div>
            <dt>Combo</dt>
            <dd>x{stats.combo}</dd>
          </div>
          <div>
            <dt>Lives</dt>
            <dd>{stats.lives}</dd>
          </div>
        </dl>
      </header>

      <section className="game-layout" aria-label="Game">
        <div ref={gameHost} className="game-host" tabIndex={-1} />
        <aside className="side-panel">
          <p className="stage-state">{stats.message}</p>
          <div className="command-row">
            <button
              type="button"
              disabled={stats.status === "playing" || stats.status === "paused"}
              onClick={() => sendCommand("start")}
            >
              Start
            </button>
            <button
              type="button"
              disabled={stats.status === "ready" || stats.status === "won" || stats.status === "lost"}
              onClick={() => sendCommand("pause")}
            >
              {stats.status === "paused" ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={() => sendCommand("restart")}>
              Restart
            </button>
          </div>
          <h2>Stages</h2>
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
                  onClick={() => setSelectedLevelId(level.id)}
                >
                  <span>{level.phase}</span>
                  {level.name}
                  {completedLevels.has(level.id) ? <strong>Cleared</strong> : null}
                </button>
              );
            })}
          </div>
          <h2>Controls</h2>
          <p>
            Use WASD or arrow keys to fly. Press space to drop truth bombs. P pauses, R restarts,
            and Enter can start the selected stage.
          </p>
        </aside>
      </section>
    </main>
  );
}

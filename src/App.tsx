import { useEffect, useRef, useState } from "react";
import { soundManager } from "./game/audio";
import { createGame } from "./game/createGame";
import { GAME_COMMAND_EVENT, type GameCommand, type GameStats } from "./game/events";
import { getLevel, levels } from "./game/levels";
import "./styles.css";

const BEST_SCORE_KEY = "flamingoja-e-fundit-best-score";
const DEFAULT_LEVEL_ID = levels[0].id;

export default function App() {
  const gameHost = useRef<HTMLDivElement | null>(null);
  const bestScoreRef = useRef(0);
  const selectedLevel = getLevel(DEFAULT_LEVEL_ID);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());
  const [stats, setStats] = useState<GameStats>({
    levelId: selectedLevel.id,
    levelName: selectedLevel.name,
    score: 0,
    exposure: 0,
    lives: 2,
    combo: 1,
    status: "ready",
    message: selectedLevel.intro,
  });
  const [bestScore, setBestScore] = useState(() => {
    const storedBestScore = Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0);
    bestScoreRef.current = storedBestScore;
    return storedBestScore;
  });

  const [shareToast, setShareToast] = useState<string | null>(null);

  const handleShare = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const isAntagonistWin = stats.score >= 1000;
    const shareText = isAntagonistWin
      ? `🦩🏛️ Futa Ramën & Berishën në burg te "Flamingoja e Fundit"! Zbulova ${stats.exposure} skandale me ${stats.score} pikë! RNBNB! A më mund dot në Shesh? #FlockTheSystem`
      : `🦩 Arrita ${stats.score} pikë dhe zbulova ${stats.exposure} të vërteta te "Flamingoja e Fundit"! RNBNB! #FlockTheSystem`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Flamingoja e Fundit - Flock The System",
          text: shareText,
          url: window.location.href,
        });
        setShareToast("✅ Rezultati u nda!");
        setTimeout(() => setShareToast(null), 2500);
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        setShareToast("📋 Teksti u kopjua! Gati për Story / WhatsApp!");
        setTimeout(() => setShareToast(null), 2500);
      } catch (err) {
        setShareToast("⚠️ Nuk mund të kopjohej teksti.");
        setTimeout(() => setShareToast(null), 2000);
      }
    }
  };

  function sendCommand(command: GameCommand) {
    window.dispatchEvent(new CustomEvent<GameCommand>(GAME_COMMAND_EVENT, { detail: command }));
    gameHost.current?.focus();
  }

  function startGame() {
    setIsRulesModalOpen(false);
    sendCommand("start");
  }

  function toggleSound(event: React.MouseEvent) {
    event.stopPropagation();
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  }

  useEffect(() => {
    if (!gameHost.current) return;

    const game = createGame(gameHost.current, selectedLevel.id, {
      onStatsChange(nextStats) {
        setStats(nextStats);
        if (nextStats.score > bestScoreRef.current) {
          bestScoreRef.current = nextStats.score;
          setBestScore(nextStats.score);
          window.localStorage.setItem(BEST_SCORE_KEY, String(nextStats.score));
        }
      },
      onLevelComplete() {
        // level complete callback
      },
    });

    return () => {
      game.destroy(true);
    };
  }, [selectedLevel.id]);

  const showStartScreen =
    stats.status === "ready" || stats.status === "won" || stats.status === "lost";
  const isPlaying = stats.status === "playing";

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
              <span className="stat-val">{stats.exposure}</span>
            </div>
          </div>

          <div className="stat-divider" />

          <div className="stat-item stat-lives" title={`${stats.lives} jetë të mbetura`}>
            <span className="stat-icon">{stats.lives > 1 ? "🪶🪶" : "🪶"}</span>
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
            {stats.status === "ready" ? (
              <div className="brand-logo-container">
                <img
                  src={`${import.meta.env.BASE_URL}assets/logo-final-eu.svg`}
                  alt="Flamingo e Fundit"
                  className="brand-logo-hero"
                />
              </div>
            ) : null}
            <p className="phase-label">{selectedLevel.phase}</p>
            <h2>
              {stats.status === "won"
                ? "Sheshi u Çlirua!"
                : stats.status === "lost"
                  ? "Fund Marshimi!"
                  : "Flamingo e Fundit"}
            </h2>
            <p className="status-subtext">{stats.message}</p>

            {stats.status === "lost" ? (
              <div className="antagonist-cameo">
                <img
                  src={
                    stats.lastHitAntagonist === "sali"
                      ? `${import.meta.env.BASE_URL}assets/characters/sali_fullbody.svg`
                      : `${import.meta.env.BASE_URL}assets/characters/edi_fullbody.svg`
                  }
                  alt="Antagonist"
                  className="antagonist-thumb"
                />
                <div className="antagonist-speech">
                  <span className="antagonist-name">
                    {stats.lastHitAntagonist === "sali" ? "Sali Berisha" : "Edi Rama"}
                  </span>
                  <p className="antagonist-quote">
                    {stats.lastHitAntagonist === "sali"
                      ? "«Ky regjim ra, po re edhe ti o mik!»"
                      : "«Ju thashë që ishin vetëm 12 veta në shesh...»"}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="start-actions">
              <button type="button" className="primary-start" onClick={startGame}>
                {stats.status === "lost"
                  ? "Rinis Marshimin"
                  : stats.status === "won"
                    ? "Vazhdo Marshimin"
                    : "Nis Marshimin"}
              </button>

              {stats.status === "lost" || stats.status === "won" ? (
                <button
                  type="button"
                  className="share-button"
                  onClick={handleShare}
                >
                  📢 Shpërndaj në Story / WhatsApp
                </button>
              ) : null}

              {shareToast ? (
                <div className="share-toast" role="status">
                  {shareToast}
                </div>
              ) : null}

              <div className="secondary-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsRulesModalOpen(true);
                  }}
                >
                  📜 Rregullat e Protestës
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Protest Rules Modal */}
      {isRulesModalOpen ? (
        <aside className="stage-drawer" aria-label="Rregullat">
          <div className="stage-drawer-header">
            <h2>Rregullat e Revolucionit</h2>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => setIsRulesModalOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="rules-content">
            <p>🦩 <strong>Flamingoja nuk ndalet:</strong> Prek ekranin ose shtyp <code>Space</code> / <code>W</code> / <code>↑</code> për të kërcyer.</p>
            <p>💥 <strong>Gris Propagandën:</strong> Kërce në sloganet fluturuese dhe kap deputetët arrogantë për të zbuluar të vërtetat e fshehura.</p>
            <p>🪶 <strong>Shpëto për një qime:</strong> Flamingoja ka 2 jetë – përplasja e parë të jep imunitet të përkohshëm!</p>
            <p>☀️ <strong>Cikli i Ditës:</strong> Mëngjesi kthehet në Perëndim, pastaj në Natë me drone, dhe agimi rinis sërish!</p>
          </div>
        </aside>
      ) : null}
    </main>
  );
}

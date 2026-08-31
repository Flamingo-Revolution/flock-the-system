import { useEffect, useRef, useState } from "react";
import { trackEvent } from "./game/analytics";
import { soundManager } from "./game/audio";
import { createGame } from "./game/createGame";
import { GAME_COMMAND_EVENT, type GameCommand, type GameStats } from "./game/events";
import { getLevel, levels } from "./game/levels";
import { generateCertificateCode, getProtestRank } from "./game/ranks";
import "./styles.css";

const BEST_SCORE_KEY = "flamingoja-e-fundit-best-score";
const GOLDEN_SKIN_UNLOCKED_KEY = "flamingoja-golden-skin-unlocked";
const DEFAULT_LEVEL_ID = levels[0].id;

export default function App() {
  const gameHost = useRef<HTMLDivElement | null>(null);
  const bestScoreRef = useRef(0);
  const selectedLevel = getLevel(DEFAULT_LEVEL_ID);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());
  const [goldenSkin, setGoldenSkin] = useState(false);
  const [isGoldenSkinUnlocked, setIsGoldenSkinUnlocked] = useState(() => {
    try {
      return window.localStorage.getItem(GOLDEN_SKIN_UNLOCKED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [stats, setStats] = useState<GameStats>({
    levelId: selectedLevel.id,
    levelName: selectedLevel.name,
    score: 0,
    exposure: 0,
    targetExposure: selectedLevel.targetExposure,
    progress: 0,
    lives: 2,
    combo: 1,
    status: "ready",
    message: selectedLevel.intro,
    isEndless: false,
  });
  const [bestScore, setBestScore] = useState(() => {
    try {
      const stored = Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0);
      const val = Number.isFinite(stored) ? stored : 0;
      bestScoreRef.current = val;
      return val;
    } catch {
      bestScoreRef.current = 0;
      return 0;
    }
  });

  const [shareToast, setShareToast] = useState<string | null>(null);
  const rank = getProtestRank(stats.score);
  const certCode = generateCertificateCode(stats.score);

  const handleShare = async (event: React.MouseEvent) => {
    event.stopPropagation();
    trackEvent("share_score", { score: stats.score, exposure: stats.exposure });
    const isAntagonistWin = stats.score >= 1000;
    const shareText = stats.status === "won"
      ? `🦩🏆 ÇLirova Sheshin te "Flamingoja e Fundit"! Certifikata ${certCode} | Grada ${rank.rank} "${rank.title}" me ${stats.score} pikë dhe ${stats.exposure} skandale! A më mund dot në Shesh? #FlockTheSystem`
      : isAntagonistWin
        ? `🦩🏛️ Futa Ramën & Berishën në burg! Grada ${rank.rank} "${rank.title}" me ${stats.score} pikë dhe ${stats.exposure} skandale te "Flamingoja e Fundit"! RNBNB! #FlockTheSystem`
        : `🦩 Arrita Gradën ${rank.rank} "${rank.title}" me ${stats.score} pikë te "Flamingoja e Fundit"! RNBNB! #FlockTheSystem`;

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
    trackEvent("game_start", { level_id: selectedLevel.id });
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
        if (nextStats.status === "won") {
          setIsGoldenSkinUnlocked(true);
          try {
            window.localStorage.setItem(GOLDEN_SKIN_UNLOCKED_KEY, "true");
          } catch {
            // Ignore restricted storage errors
          }
        }
        if (nextStats.score > bestScoreRef.current) {
          bestScoreRef.current = nextStats.score;
          setBestScore(nextStats.score);
          try {
            window.localStorage.setItem(BEST_SCORE_KEY, String(nextStats.score));
          } catch {
            // Ignore restricted storage errors
          }
        }
      },
      onLevelComplete(levelId, finalScore) {
        trackEvent("level_complete", { level_id: levelId, score: finalScore });
      },
      onMuteToggle(muted) {
        setIsMuted(muted);
      },
    });

    return () => {
      game.destroy(true);
    };
  }, [selectedLevel.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") {
        soundManager.toggleMute();
        setIsMuted(soundManager.getMuted());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
              <span className="stat-val">
                {stats.isEndless ? `${stats.exposure}` : `${stats.exposure}/${stats.targetExposure}`}
              </span>
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

      {/* Dynamic Campaign Progress Loading Bar */}
      <div className="campaign-progress-container" aria-label="Progresi drejt Çlirimit">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, Math.round((stats.progress || 0) * 100))}%` }}
          />
          <div className="progress-nodes">
            <span className={`node ${(stats.progress || 0) >= 0.25 ? "active" : ""}`} title="25% - Makiato Zone (15 Zbulime)">☕</span>
            <span className={`node ${(stats.progress || 0) >= 0.50 ? "active" : ""}`} title="50% - Dronët & Alarmi (30 Zbulime)">🚨</span>
            <span className={`node ${(stats.progress || 0) >= 0.75 ? "active" : ""}`} title="75% - Furgoni & Gazi (45 Zbulime)">💨</span>
            <span className={`node ${(stats.progress || 0) >= 1.0 ? "active" : ""}`} title="100% - Çlirimi i Sheshit (60 Zbulime)">🏁</span>
          </div>
        </div>
        <div className="progress-meta">
          <span className="progress-title">
            {stats.isEndless ? "MARSHIM PA FUND" : "ÇLIRIMI I SHESHIT"}
          </span>
          <span className="progress-percent">
            {stats.isEndless ? "♾️" : `${Math.min(100, Math.round((stats.progress || 0) * 100))}%`}
          </span>
        </div>
      </div>

      {/* Active Power-Up Banner */}
      {stats.activePowerUp ? (
        <div className={`powerup-pill powerup-${stats.activePowerUp.type}`}>
          <span className="powerup-icon">
            {stats.activePowerUp.type === "makiato" ? "☕" : stats.activePowerUp.type === "shield" ? "🛡️" : "🧲"}
          </span>
          <div className="powerup-info">
            <span className="powerup-name">
              {stats.activePowerUp.type === "makiato"
                ? "MAKIATO TURBO DASH"
                : stats.activePowerUp.type === "shield"
                  ? "SUFLLAQE MBUROJË"
                  : "MAGNET SLOGANESH"}
            </span>
            <div className="powerup-bar-track">
              <div
                className="powerup-bar-fill"
                style={{
                  width: `${Math.max(0, (stats.activePowerUp.remainingMs / stats.activePowerUp.totalMs) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

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

            {stats.status === "ready" && isGoldenSkinUnlocked ? (
              <div className="ready-skin-box" onClick={(e) => e.stopPropagation()}>
                <span className="ready-skin-label">✨ Lëkura e Artë e Zhbllokuar:</span>
                <button
                  type="button"
                  className={`skin-toggle-btn ${goldenSkin ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setGoldenSkin(!goldenSkin);
                    sendCommand("toggle_golden_skin");
                  }}
                >
                  {goldenSkin ? "✨ Aktive" : "Aktivizo"}
                </button>
              </div>
            ) : null}

            {/* Satirical Protest Rank Badge on Finished Runs */}
            {stats.status === "lost" || stats.status === "won" ? (
              <div className="rank-badge-card" style={{ borderColor: rank.color }}>
                <div className="rank-letter-badge" style={{ backgroundColor: rank.color }}>
                  <span className="rank-symbol">{rank.badge}</span>
                  <span className="rank-name">{rank.rank}</span>
                </div>
                <div className="rank-text-block">
                  <span className="rank-title" style={{ color: rank.color }}>{rank.title}</span>
                  <p className="rank-desc">{rank.description}</p>
                </div>
              </div>
            ) : null}

            {/* Official Golden Revolutionary Certificate on Victory */}
            {stats.status === "won" ? (
              <div className="victory-certificate">
                <div className="cert-header">
                  <span className="cert-seal">🇦🇱 ⚖️</span>
                  <span className="cert-org">REPUBLIKA E REVOLUCIONIT TË FLAMINGOVE</span>
                </div>
                <h3 className="cert-title">DËSHMI ÇLIRIMI & DEKORATË NDERI</h3>
                <p className="cert-text">
                  Kjo dëshmi vërteton zyrtarisht se mbajtësi arriti të rrëzojë fasadën e regjimit dhe zbardhi të gjitha dosjet!
                </p>
                <div className="cert-meta-grid">
                  <div className="cert-meta-item">
                    <span className="cert-meta-label">KODI ZYRTAR</span>
                    <span className="cert-meta-val">{certCode}</span>
                  </div>
                  <div className="cert-meta-item">
                    <span className="cert-meta-label">GRADA</span>
                    <span className="cert-meta-val" style={{ color: rank.color }}>{rank.rank} — {rank.title}</span>
                  </div>
                  <div className="cert-meta-item">
                    <span className="cert-meta-label">PIKË TOTAL</span>
                    <span className="cert-meta-val">{stats.score}</span>
                  </div>
                  <div className="cert-meta-item">
                    <span className="cert-meta-label">SPAK VERIFIED</span>
                    <span className="cert-meta-val" style={{ color: "#06d6a0" }}>✅ DOSJA U MBYLL</span>
                  </div>
                </div>

                <div className="cert-reward-box">
                  <span className="reward-icon">✨ 🦩</span>
                  <div className="reward-info">
                    <span className="reward-label">SHPËRBLIMI I FITORES:</span>
                    <strong className="reward-name">Lëkura e Flamingos së Artë</strong>
                  </div>
                  <button
                    type="button"
                    className={`skin-toggle-btn ${goldenSkin ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setGoldenSkin(!goldenSkin);
                      sendCommand("toggle_golden_skin");
                    }}
                  >
                    {goldenSkin ? "✨ Çaktivizo" : "✨ Aktivizo"}
                  </button>
                </div>
              </div>
            ) : null}

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
              {stats.status === "won" ? (
                <>
                  <button
                    type="button"
                    className="primary-start endless-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendCommand("continue_endless");
                    }}
                  >
                    ♾️ Vazhdo Marshimin pa Fund
                  </button>
                  <button
                    type="button"
                    className="share-button"
                    onClick={handleShare}
                  >
                    📢 Shpërndaj Fitoren (WhatsApp / Story)
                  </button>
                  <button
                    type="button"
                    className="secondary-restart-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      startGame();
                    }}
                  >
                    🔄 Fillo nga e Para
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="primary-start"
                    onClick={(e) => {
                      e.stopPropagation();
                      startGame();
                    }}
                  >
                    {stats.status === "lost" ? "Rinis Marshimin" : "Nis Marshimin"}
                  </button>

                  {stats.status === "lost" ? (
                    <button
                      type="button"
                      className="share-button"
                      onClick={handleShare}
                    >
                      📢 Shpërndaj në Story / WhatsApp
                    </button>
                  ) : null}
                </>
              )}

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
                  📜 Rregullat e Sheshit
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
            <p>🦩 <strong>Flamingoja nuk ndalet:</strong> Kliko ekranin ose shtyp <code>Space</code> / <code>W</code> / <code>↑</code> për të kërcyer.</p>
            <p>💥 <strong>Gris Propagandën:</strong> Kërce në sloganet fluturuese dhe kap deputetët arrogantë për të zbuluar të vërtetat e fshehura.</p>
            <p>🪶 <strong>Shpëto për një qime:</strong> Flamingoja ka 2 jetë – përplasja e parë të jep imunitet të përkohshëm!</p>
            <p>☀️ <strong>Cikli i Ditës:</strong> Mëngjesi kthehet në Perëndim, pastaj në Natë me drone, dhe agimi rinis sërish!</p>
          </div>
        </aside>
      ) : null}
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "./game/analytics";
import { soundManager } from "./game/audio";
import { createGame } from "./game/createGame";
import { GAME_COMMAND_EVENT, type GameCommand, type GameStats } from "./game/events";
import { getLevel, levels } from "./game/levels";
import { generateCertificateCode, getProtestRank } from "./game/ranks";
import { renderShareImage } from "./game/shareImage";
import "./styles.css";

const BEST_SCORE_KEY = "flamingoja-e-fundit-best-score";
const GOLDEN_SKIN_UNLOCKED_KEY = "flamingoja-golden-skin-unlocked";
const DEFAULT_LEVEL_ID = levels[0].id;
const OFFICIAL_URL = "https://www.flamingorevolution.eu/lojerat/flamingoja-e-fundit/";

export default function App() {
  const gameHost = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<any>(null);
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
  const [shareModalData, setShareModalData] = useState<{ url: string; text: string; file: File } | null>(null);
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

    if (gameRef.current && gameRef.current.canvas) {
      try {
        const blob = await renderShareImage({
          gameCanvas: gameRef.current.canvas,
          score: stats.score,
          exposure: stats.exposure,
          rank,
          certCode,
          won: stats.status === "won",
        });
        if (blob) {
          const url = URL.createObjectURL(blob);
          const file = new File([blob], "flamingo-score.png", { type: "image/png" });
          setShareModalData({ url, text: shareText, file });
          return;
        }
      } catch (err) {
        // Ignore canvas capture errors
      }
    }

    // Fallback if image generation fails
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${OFFICIAL_URL}`);
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

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
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
        <aside className="stage-drawer" aria-label="Rregullat e Lojës">
          <div className="stage-drawer-header">
            <h2>📜 Rregullat e Revolucionit</h2>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => setIsRulesModalOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="rules-content">
            <div className="rule-card">
              <span className="rule-badge">🦩 KËRCIMI & DOUBLE JUMP</span>
              <p>
                Kliko ekranin ose shtyp <code>Space</code> / <code>W</code> / <code>↑</code> për të kërcyer.
                <strong> Kliko sërish në ajër</strong> për të kryer kërcimin e dytë me hapje krahësh (*Double Jump*)!
              </p>
            </div>

            <div className="rule-card">
              <span className="rule-badge">🌯 SUPER-FUQITË (POWER-UPS)</span>
              <ul className="rule-list">
                <li>☕ <strong>Makiato Turbo:</strong> Shpejtësi e lartë që shpartallon çdo pengesë me konfeti (+100 pikë).</li>
                <li>🛡️ <strong>Sufllaqe Mburojë:</strong> Kthen 2 jetët e plota (🪶🪶) dhe absorbon 100% goditjen e parë pa humbur jetë.</li>
                <li>🧲 <strong>Koncesioni Magnetik:</strong> Thith automatikisht të gjitha dosjet dhe sloganet nga largësia.</li>
              </ul>
            </div>

            <div className="rule-card">
              <span className="rule-badge">⭐ DOSJET E ARTA NË LARTËSI</span>
              <p>
                Kap dosjet sekrete të arta që fluturojnë lart në qiell duke përdorur <strong>Double Jump</strong> për të fituar <strong>+300 Pikë Bonus</strong>!
              </p>
            </div>

            <div className="rule-card">
              <span className="rule-badge">🏛️ SPAK: RAMA & BERISHA N'BURG</span>
              <p>
                Kap Ramën ose Berishën kur shfaqen për t'i futur në kafaz me vulën <em>RNBNB!</em> Nëse i fut të dy në burg brenda një marshimi, fiton <strong>+1000 Pikë</strong>!
              </p>
            </div>

            <div className="rule-card">
              <span className="rule-badge">⚠️ RREZIQET E SHESHIT</span>
              <p>
                Kujdes nga 🚓 <strong>Furgoni i Propagandës</strong> që vërshon me shpejtësi pas shenjës <code>⚠️</code>, dhe 💨 <strong>Gazi Lotësjellës</strong> që bie nga qielli!
              </p>
            </div>

            <div className="rule-card">
              <span className="rule-badge">⌨️ TASTET E SHPEJTA</span>
              <p>
                <code>Space</code> / <code>W</code> / <code>↑</code>: Kërce & Double Jump &nbsp;|&nbsp; <code>P</code>: Pauzë &nbsp;|&nbsp; <code>R</code>: Rinisje &nbsp;|&nbsp; <code>M</code>: Zëri
              </p>
            </div>
          </div>
        </aside>
      ) : null}

      {/* Share Image Modal */}
      {shareModalData ? (
        <aside className="stage-drawer share-modal" aria-label="Ndaj Rezultatin">
          <div className="stage-drawer-header">
            <h2>📢 Ndaj ose Ruaj</h2>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => {
                URL.revokeObjectURL(shareModalData.url);
                setShareModalData(null);
              }}
            >
              ✕
            </button>
          </div>
          <div className="rules-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem', overflowY: 'auto' }}>
            <img 
              src={shareModalData.url} 
              alt="Score Preview" 
              style={{ maxHeight: '45vh', borderRadius: '8px', border: '3px solid #151515', boxShadow: '6px 6px 0 #151515', objectFit: 'contain' }} 
            />
            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#fff', margin: 0 }}>
              Imazhi u gjenerua! Mund ta ruash në pajisje ose ta ndash direkt.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '300px' }}>
              {navigator.share && navigator.canShare && navigator.canShare({ files: [shareModalData.file] }) ? (
                <button
                  type="button"
                  className="primary-start"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: "Flamingoja e Fundit - Flock The System",
                        text: shareModalData.text,
                        url: OFFICIAL_URL,
                        files: [shareModalData.file]
                      });
                    } catch (e) {}
                  }}
                >
                  📲 Ndaj në App (Story / WhatsApp)
                </button>
              ) : null}

              <a
                href={shareModalData.url}
                download="flamingo-score.png"
                className="share-button"
                style={{ textAlign: 'center', textDecoration: 'none', display: 'block', width: '100%', boxSizing: 'border-box' }}
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(`${shareModalData.text}\n${OFFICIAL_URL}`).catch(() => {});
                  }
                  setShareToast("🖼️ Imazhi u shkarkua! Teksti u kopjua!");
                  setTimeout(() => setShareToast(null), 3000);
                }}
              >
                ⬇️ Shkarko & Kopjo Tekstin
              </a>
            </div>
          </div>
        </aside>
      ) : null}
    </main>
  );
}

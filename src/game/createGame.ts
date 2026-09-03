import Phaser from "phaser";
import { trackEvent } from "./analytics";
import { soundManager } from "./audio";
import {
  GAME_COMMAND_EVENT,
  type GameCallbacks,
  type GameCommand,
  type GameStats,
} from "./events";
import {
  getLevel,
  type DokumentDefinition,
  type LevelDefinition,
  type PolitikanDefinition,
  type ZbulimDefinition,
} from "./levels";
import type { PersonObstacle } from "./obstacles";

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;
const PLAYER_X_RATIO = 0.18;
const PLAYER_DISPLAY_WIDTH = 46;
const PLAYER_DISPLAY_HEIGHT = 66;
const GROUND_HEIGHT = 72;
const INVULNERABLE_MS = 650;
const SPEED_RAMP_RATE = 0.013;
const SPEED_RAMP_MAX = 2.2;
const DISTANCE_TICK_MS = 120;
const RUN_FRAME_MS = 120;
const JUMP_BUFFER_MS = 140;
const COYOTE_TIME_MS = 100;
const JUMP_RELEASE_MIN_MS = 75;
const JUMP_CUT_MULTIPLIER = 0.54;

const DEPTH_BACKGROUND_BACK = -40;
const DEPTH_BACKGROUND_FRONT = -30;
const DEPTH_SHADOW = 4;
const DEPTH_GROUND = 5;
const DEPTH_REWARD_FX = 15;
const DEPTH_COLLECTIBLE = 20;
const DEPTH_PARTICLES = 25;
const DEPTH_PLAYER = 35;
const DEPTH_OBSTACLE = 45;
const DEPTH_LABEL = 50;
const DEPTH_BANNER = 60;

type MovingSprite = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
type CollectibleTarget = ZbulimDefinition | PolitikanDefinition | DokumentDefinition;

type LabelBinding = {
  label: Phaser.GameObjects.Text;
  offsetY: number;
};

type ObstacleCategory = "ground_low" | "ground_med" | "ground_tall" | "air";

function triggerHaptic(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignored if browser permissions don't allow
    }
  }
}

function createInitialStats(level: LevelDefinition): GameStats {
  return {
    levelId: level.id,
    levelName: level.name,
    score: 0,
    exposure: 0,
    targetExposure: level.targetExposure,
    progress: 0,
    lives: 2, // 2 lives: 1 stumble grace + 1 fatal hit
    combo: 1,
    status: "ready",
    message: level.intro,
    isEndless: false,
  };
}

class RunnerScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private playerShadow!: Phaser.GameObjects.Image;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private upKey!: Phaser.Input.Keyboard.Key;
  private wKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private muteKey!: Phaser.Input.Keyboard.Key;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private cityBack!: Phaser.GameObjects.TileSprite;
  private cityFront!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private scoreTimer?: Phaser.Time.TimerEvent;
  private labels = new Map<MovingSprite, LabelBinding>();

  private zbulimIndex = 0;
  private politikanIndex = 0;
  private groundIndex = 0;
  private airIndex = 0;
  private documentIndex = 0;

  private invulnerableUntil = 0;
  private roundStartAt = 0;
  private nextRunFrameAt = 0;
  private jumpBufferedUntil = 0;
  private lastGroundedAt = 0;
  private jumpStartedAt = 0;
  private runFrame = 0;
  private groundTop = 0;
  private wasGrounded = true;
  private isFrozen = false;
  private lastSpawnCategory: ObstacleCategory = "ground_low";
  private timePhase: "morning" | "sunset" | "night" = "morning";
  private cagedEdi = false;
  private cagedSali = false;
  private bothAntagonistsBonusAwarded = false;
  private finishSpawned = false;
  private isEndless = false;
  private jumpsRemaining = 2;
  private powerups!: Phaser.Physics.Arcade.Group;
  private nextPowerupAt = 10000;
  private activePowerUpType?: "makiato" | "shield" | "magnet";
  private powerUpExpiresAt = 0;
  private powerUpDurationMs = 0;
  private shieldBubble?: Phaser.GameObjects.Image;
  private goldenSkinEnabled = false;
  private flockSprites: Phaser.GameObjects.Image[] = [];
  private bossChaseSprite?: Phaser.GameObjects.Image;
  private bossChaseBubble?: Phaser.GameObjects.Text;
  private bossChaseActive = false;
  private sceneryGroup!: Phaser.GameObjects.Group;
  private nextSceneryAt = 0;
  private nextGraffitiAt = 0;
  private nextNewsTickerAt = 10000;
  private stats!: GameStats;

  private readonly handleCommand = (event: Event) => {
    const command = (event as CustomEvent<GameCommand>).detail;

    if (command === "start") {
      if (this.stats.status === "ready") {
        this.startRound();
      } else if (this.stats.status === "lost" || this.stats.status === "won") {
        this.resetRound("playing");
      }
    }
    if (command === "pause") this.togglePause();
    if (command === "restart") this.resetRound("playing");
    if (command === "continue_endless") this.continueEndlessMode();
    if (command === "toggle_golden_skin") this.toggleGoldenSkin();
  };

  constructor(
    private readonly levelId: string,
    private readonly callbacks: GameCallbacks,
  ) {
    super("runner");
  }

  init() {
    this.level = getLevel(this.levelId);
    this.stats = createInitialStats(this.level);
  }

  preload() {
    this.load.svg("tirana-larg", `${ASSET_BASE}background/tirana-back.svg`, {
      width: 920,
      height: 208,
    });
    this.load.svg("tirana-afer", `${ASSET_BASE}background/tirana-front.svg`, {
      width: 920,
      height: 208,
    });
    this.load.svg("flamingo-a", `${ASSET_BASE}characters/flamingo-a.svg`, {
      width: PLAYER_DISPLAY_WIDTH,
      height: PLAYER_DISPLAY_HEIGHT,
    });
    this.load.svg("flamingo-b", `${ASSET_BASE}characters/flamingo-b.svg`, {
      width: PLAYER_DISPLAY_WIDTH,
      height: PLAYER_DISPLAY_HEIGHT,
    });
    this.load.svg("edi-character", `${ASSET_BASE}characters/edi_fullbody.svg`, {
      width: 52,
      height: 78,
    });
    this.load.svg("sali-character", `${ASSET_BASE}characters/sali_fullbody.svg`, {
      width: 52,
      height: 78,
    });
    this.load.svg("toke", `${ASSET_BASE}ground/ground.svg`, { width: 240, height: 72 });
    this.load.svg("ministri", `${ASSET_BASE}ground/ministry.svg`, { width: 64, height: 92 });
    this.load.svg("leter-1", `${ASSET_BASE}ground/papers-1.svg`, { width: 72, height: 42 });
    this.load.svg("leter-2", `${ASSET_BASE}ground/papers-2.svg`, { width: 72, height: 42 });
    this.load.svg("leter-3", `${ASSET_BASE}ground/papers-3.svg`, { width: 72, height: 42 });
    this.load.svg("podium", `${ASSET_BASE}ground/podium.svg`, { width: 70, height: 82 });
    this.load.svg("dron", `${ASSET_BASE}hazards/drone.svg`, { width: 58, height: 34 });
    this.load.svg("mikrofon", `${ASSET_BASE}hazards/microphone.svg`, { width: 42, height: 56 });
    this.load.svg("kamera", `${ASSET_BASE}hazards/camera.svg`, { width: 58, height: 42 });
    this.load.svg("shenje", `${ASSET_BASE}collectibles/sign.svg`, { width: 126, height: 44 });
    this.load.svg("shenje-zbuluar", `${ASSET_BASE}collectibles/sign-revealed.svg`, {
      width: 126,
      height: 44,
    });
    this.load.svg("dokument", `${ASSET_BASE}collectibles/document.svg`, { width: 54, height: 64 });
    this.load.svg("person", `${ASSET_BASE}collectibles/person.svg`, { width: 54, height: 64 });
  }

  create() {
    this.createProceduralTextures();

    this.physics.world.gravity.y = this.level.gravityY;
    this.cameras.main.setBackgroundColor(this.level.skyColor);
    this.groundTop = this.scale.height - GROUND_HEIGHT;

    this.drawWorld();
    this.sceneryGroup = this.add.group();
    this.obstacles = this.physics.add.group();
    this.collectibles = this.physics.add.group();
    this.powerups = this.physics.add.group();

    // Ground shadow for player
    this.playerShadow = this.add.image(this.playerX(), this.groundTop + 2, "ground-shadow");
    this.playerShadow.setDepth(DEPTH_SHADOW).setOrigin(0.5, 0.5);

    // Player with forgiving inner hitbox
    this.player = this.physics.add.sprite(this.playerX(), this.playerGroundY(), "flamingo-a");
    this.player.setDepth(DEPTH_PLAYER);
    this.player.setDisplaySize(PLAYER_DISPLAY_WIDTH, PLAYER_DISPLAY_HEIGHT);
    // Forgiving hitbox: 18x30 offset inwards from the 46x66 display size
    this.player.setSize(18, 30).setOffset(14, 28);
    this.player.body.allowGravity = false;

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.wKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.muteKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
    ]);

    this.input.on("pointerdown", () => {
      soundManager.resumeIfSuspended();
      this.requestJump();
    });
    this.input.on("pointerup", () => this.releaseJump());
    window.addEventListener(GAME_COMMAND_EVENT, this.handleCommand);
    const onResize = () => this.handleResize();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);

    const cleanup = () => {
      window.removeEventListener(GAME_COMMAND_EVENT, this.handleCommand);
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    this.physics.add.overlap(this.player, this.obstacles, (_, obstacle) => {
      this.takeHit(obstacle as MovingSprite);
    });
    this.physics.add.overlap(this.player, this.collectibles, (_, collectible) => {
      this.collectTarget(collectible as MovingSprite);
    });
    this.physics.add.overlap(this.player, this.powerups, (_, powerup) => {
      this.collectPowerUp(powerup as MovingSprite);
    });

    this.addBanner(this.level.intro);
    this.callbacks.onStatsChange(this.stats);
  }

  private createProceduralTextures() {
    if (!this.textures.exists("dust-particle")) {
      const dustGfx = this.make.graphics({ x: 0, y: 0 }, false);
      dustGfx.fillStyle(0xffffff, 0.85);
      dustGfx.fillCircle(4, 4, 4);
      dustGfx.generateTexture("dust-particle", 8, 8);
      dustGfx.destroy();
    }

    if (!this.textures.exists("feather-particle")) {
      const featherGfx = this.make.graphics({ x: 0, y: 0 }, false);
      featherGfx.fillStyle(0xff4f8b, 0.95);
      featherGfx.fillEllipse(5, 3, 5, 2.5);
      featherGfx.generateTexture("feather-particle", 10, 6);
      featherGfx.destroy();
    }

    if (!this.textures.exists("sparkle-particle")) {
      const sparkGfx = this.make.graphics({ x: 0, y: 0 }, false);
      sparkGfx.fillStyle(0xffd23f, 1);
      sparkGfx.fillRect(0, 0, 5, 5);
      sparkGfx.generateTexture("sparkle-particle", 5, 5);
      sparkGfx.destroy();
    }

    if (!this.textures.exists("ground-shadow")) {
      const shadowGfx = this.make.graphics({ x: 0, y: 0 }, false);
      shadowGfx.fillStyle(0x10131d, 0.28);
      shadowGfx.fillEllipse(18, 5, 18, 5);
      shadowGfx.generateTexture("ground-shadow", 36, 10);
      shadowGfx.destroy();
    }

    if (!this.textures.exists("shred-white")) {
      const p1 = this.make.graphics({ x: 0, y: 0 }, false);
      p1.fillStyle(0xffffff, 0.95);
      p1.fillRect(0, 0, 7, 4);
      p1.generateTexture("shred-white", 7, 4);
      p1.destroy();
    }

    if (!this.textures.exists("shred-manila")) {
      const p2 = this.make.graphics({ x: 0, y: 0 }, false);
      p2.fillStyle(0xfde047, 0.95);
      p2.fillRect(0, 0, 6, 5);
      p2.generateTexture("shred-manila", 6, 5);
      p2.destroy();
    }

    if (!this.textures.exists("shred-red")) {
      const p3 = this.make.graphics({ x: 0, y: 0 }, false);
      p3.fillStyle(0xef4444, 0.95);
      p3.fillRect(0, 0, 8, 3);
      p3.generateTexture("shred-red", 8, 3);
      p3.destroy();
    }

    if (!this.textures.exists("prison-cage")) {
      const cageGfx = this.make.graphics({ x: 0, y: 0 }, false);
      // Dark semi-transparent cell background
      cageGfx.fillStyle(0x10131d, 0.45);
      cageGfx.fillRoundedRect(0, 0, 56, 78, 4);
      // Outer steel frame
      cageGfx.lineStyle(4, 0x1f2937, 1);
      cageGfx.strokeRoundedRect(0, 0, 56, 78, 4);
      // Top and bottom crossbars
      cageGfx.lineStyle(3, 0x374151, 1);
      cageGfx.lineBetween(0, 16, 56, 16);
      cageGfx.lineBetween(0, 62, 56, 62);
      // Vertical iron bars
      cageGfx.lineStyle(3, 0x4b5563, 1);
      for (let x = 10; x <= 48; x += 9) {
        cageGfx.lineBetween(x, 0, x, 78);
      }
      cageGfx.generateTexture("prison-cage", 56, 78);
      cageGfx.destroy();
    }

    if (!this.textures.exists("graffiti-rnbnb")) {
      const canvasTex = this.textures.createCanvas("graffiti-rnbnb", 68, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#ff2a4b";
        ctx.font = "900 13px 'Outfit', sans-serif";
        ctx.fillText("RNBNB", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("graffiti-3m")) {
      const canvasTex = this.textures.createCanvas("graffiti-3m", 80, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#ffd23f";
        ctx.font = "900 12px 'Outfit', sans-serif";
        ctx.fillText("3 MILIONË", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("graffiti-burg")) {
      const canvasTex = this.textures.createCanvas("graffiti-burg", 60, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#06d6a0";
        ctx.font = "900 13px 'Outfit', sans-serif";
        ctx.fillText("BURG!", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("graffiti-5d")) {
      const canvasTex = this.textures.createCanvas("graffiti-5d", 54, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#ec4899";
        ctx.font = "900 13px 'Outfit', sans-serif";
        ctx.fillText("5D!", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("graffiti-spak")) {
      const canvasTex = this.textures.createCanvas("graffiti-spak", 60, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#38bdf8";
        ctx.font = "900 13px 'Outfit', sans-serif";
        ctx.fillText("SPAK", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("graffiti-sufllaqe")) {
      const canvasTex = this.textures.createCanvas("graffiti-sufllaqe", 84, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#f59e0b";
        ctx.font = "900 12px 'Outfit', sans-serif";
        ctx.fillText("SUFLLAQE!", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("graffiti-bido")) {
      const canvasTex = this.textures.createCanvas("graffiti-bido", 76, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#a855f7";
        ctx.font = "900 12px 'Outfit', sans-serif";
        ctx.fillText("BIDOOO!", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("graffiti-kafja")) {
      const canvasTex = this.textures.createCanvas("graffiti-kafja", 112, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#06b6d4";
        ctx.font = "900 11px 'Outfit', sans-serif";
        ctx.fillText("ÇOHU NGA KAFJA!", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("graffiti-taotao")) {
      const canvasTex = this.textures.createCanvas("graffiti-taotao", 78, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#84cc16";
        ctx.font = "900 12px 'Outfit', sans-serif";
        ctx.fillText("TAO TAO", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("graffiti-piktori")) {
      const canvasTex = this.textures.createCanvas("graffiti-piktori", 96, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#f43f5e";
        ctx.font = "900 11px 'Outfit', sans-serif";
        ctx.fillText("PIKTORI PLAK", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("graffiti-gusha")) {
      const canvasTex = this.textures.createCanvas("graffiti-gusha", 88, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#eab308";
        ctx.font = "900 11px 'Outfit', sans-serif";
        ctx.fillText("GONXHJA!", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("graffiti-ikbela")) {
      const canvasTex = this.textures.createCanvas("graffiti-ikbela", 98, 20);
      if (canvasTex) {
        const ctx = canvasTex.context;
        ctx.fillStyle = "#f97316";
        ctx.font = "900 11px 'Outfit', sans-serif";
        ctx.fillText("IKBELA 20M€", 4, 15);
        canvasTex.refresh();
      }
    }

    if (!this.textures.exists("ertv-van")) {
      const v = this.make.graphics({ x: 0, y: 0 }, false);
      v.fillStyle(0x1e293b, 1);
      v.fillRoundedRect(0, 8, 54, 24, 4);
      v.fillStyle(0x38bdf8, 0.9);
      v.fillRect(4, 11, 14, 9);
      v.lineStyle(2, 0xef4444, 1);
      v.lineBetween(32, 8, 32, 2);
      v.fillStyle(0xffd23f, 1);
      v.fillCircle(32, 2, 4);
      v.fillStyle(0x0f172a, 1);
      v.fillCircle(12, 32, 5);
      v.fillCircle(42, 32, 5);
      v.generateTexture("ertv-van", 56, 38);
      v.destroy();
    }

    if (!this.textures.exists("neon-billboard")) {
      const b = this.make.graphics({ x: 0, y: 0 }, false);
      b.lineStyle(2, 0x334155, 1);
      b.lineBetween(14, 28, 14, 42);
      b.lineBetween(66, 28, 66, 42);
      b.fillStyle(0x0f172a, 0.95);
      b.fillRoundedRect(0, 0, 80, 28, 4);
      b.lineStyle(2, 0xec4899, 0.85);
      b.strokeRoundedRect(0, 0, 80, 28, 4);
      b.generateTexture("neon-billboard", 80, 44);
      b.destroy();
    }

    if (!this.textures.exists("finish-gate")) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      // Ministry Victory Arch
      g.fillStyle(0x1e293b, 1);
      g.fillRoundedRect(0, 0, 110, 160, 8);
      // Archway opening
      g.fillStyle(0x93e4ef, 1);
      g.fillRoundedRect(18, 44, 74, 116, 37);
      // Gold Pediment
      g.fillStyle(0xffd23f, 1);
      g.fillRect(8, 0, 94, 16);
      g.fillTriangle(55, -16, 0, 0, 110, 0);
      // Red Banners
      g.fillStyle(0xff2a4b, 1);
      g.fillRect(4, 24, 12, 80);
      g.fillRect(94, 24, 12, 80);
      // Gold Star Emblem
      g.fillStyle(0xffd23f, 1);
      g.fillCircle(55, 12, 6);
      g.generateTexture("finish-gate", 110, 160);
      g.destroy();
    }

    if (!this.textures.exists("finish-ribbon")) {
      const r = this.make.graphics({ x: 0, y: 0 }, false);
      r.fillStyle(0xff2a4b, 1);
      r.fillRoundedRect(0, 4, 96, 24, 4);
      r.fillStyle(0xffd23f, 1);
      r.fillRect(0, 14, 96, 4);
      r.generateTexture("finish-ribbon", 96, 32);
      r.destroy();
    }

    if (!this.textures.exists("gold-confetti")) {
      const c = this.make.graphics({ x: 0, y: 0 }, false);
      c.fillStyle(0xffd23f, 1);
      c.fillRect(0, 0, 8, 5);
      c.generateTexture("gold-confetti", 8, 5);
      c.destroy();
    }

    if (!this.textures.exists("powerup-makiato")) {
      const p = this.make.graphics({ x: 0, y: 0 }, false);
      p.fillStyle(0x0f172a, 0.95);
      p.fillCircle(19, 19, 18);
      p.lineStyle(2, 0xff4f8b, 1);
      p.strokeCircle(19, 19, 18);
      // Cup & Handle
      p.fillStyle(0xffd23f, 1);
      p.fillRoundedRect(10, 14, 16, 14, 3);
      p.lineStyle(2, 0xffd23f, 1);
      p.strokeCircle(27, 20, 4);
      // Steam
      p.lineStyle(2, 0xff4f8b, 1);
      p.lineBetween(13, 11, 15, 6);
      p.lineBetween(19, 11, 21, 5);
      p.lineBetween(23, 11, 25, 7);
      p.generateTexture("powerup-makiato", 38, 38);
      p.destroy();
    }

    if (!this.textures.exists("powerup-sufllaqe")) {
      const p = this.make.graphics({ x: 0, y: 0 }, false);
      p.fillStyle(0x0f172a, 0.95);
      p.fillCircle(19, 19, 18);
      p.lineStyle(2, 0x06d6a0, 1);
      p.strokeCircle(19, 19, 18);
      // Wrap
      p.fillStyle(0xfde047, 1);
      p.fillRoundedRect(10, 10, 18, 18, 4);
      p.fillStyle(0xef4444, 1);
      p.fillRect(14, 10, 10, 5);
      p.generateTexture("powerup-sufllaqe", 38, 38);
      p.destroy();
    }

    if (!this.textures.exists("powerup-magnet")) {
      const p = this.make.graphics({ x: 0, y: 0 }, false);
      p.fillStyle(0x0f172a, 0.95);
      p.fillCircle(19, 19, 18);
      p.lineStyle(2, 0x38bdf8, 1);
      p.strokeCircle(19, 19, 18);
      // Horseshoe Magnet
      p.fillStyle(0xef4444, 1);
      p.fillRect(10, 11, 6, 16);
      p.fillRect(22, 11, 6, 16);
      p.fillRect(10, 23, 18, 5);
      p.fillStyle(0xffffff, 1);
      p.fillRect(10, 11, 6, 4);
      p.fillRect(22, 11, 6, 4);
      p.generateTexture("powerup-magnet", 38, 38);
      p.destroy();
    }

    if (!this.textures.exists("shield-bubble")) {
      const s = this.make.graphics({ x: 0, y: 0 }, false);
      // Outer bright neon ring
      s.lineStyle(3, 0x06d6a0, 0.95);
      s.strokeCircle(38, 38, 36);
      // Inner subtle glow ring
      s.lineStyle(1.5, 0xffffff, 0.85);
      s.strokeCircle(38, 38, 32);
      // Translucent protective field
      s.fillStyle(0x06d6a0, 0.28);
      s.fillCircle(38, 38, 36);
      // Little energetic spark dots
      s.fillStyle(0xffffff, 0.9);
      s.fillCircle(14, 20, 2);
      s.fillCircle(62, 54, 2);
      s.fillCircle(58, 22, 2.5);
      s.generateTexture("shield-bubble", 76, 76);
      s.destroy();
    }

    if (!this.textures.exists("police-van")) {
      const v = this.make.graphics({ x: 0, y: 0 }, false);
      v.fillStyle(0x1e293b, 1);
      v.fillRoundedRect(4, 12, 64, 24, 4);
      v.fillStyle(0x38bdf8, 0.9);
      v.fillRect(40, 15, 16, 10);
      v.fillRect(20, 15, 16, 10);
      v.fillStyle(0xffffff, 1);
      v.fillRect(4, 26, 64, 4);
      v.fillStyle(0xef4444, 1);
      v.fillRect(28, 7, 6, 5);
      v.fillStyle(0x3b82f6, 1);
      v.fillRect(34, 7, 6, 5);
      v.fillStyle(0x0f172a, 1);
      v.fillCircle(18, 36, 6);
      v.fillCircle(54, 36, 6);
      v.fillStyle(0x94a3b8, 1);
      v.fillCircle(18, 36, 3);
      v.fillCircle(54, 36, 3);
      v.generateTexture("police-van", 72, 44);
      v.destroy();
    }

    if (!this.textures.exists("teargas-canister")) {
      const t = this.make.graphics({ x: 0, y: 0 }, false);
      t.fillStyle(0x64748b, 1);
      t.fillRoundedRect(6, 4, 16, 26, 3);
      t.fillStyle(0xef4444, 1);
      t.fillRect(6, 12, 16, 4);
      t.fillStyle(0x334155, 1);
      t.fillRect(9, 1, 10, 4);
      t.fillStyle(0xe2e8f0, 0.8);
      t.fillCircle(14, 34, 4);
      t.fillCircle(11, 38, 5);
      t.fillCircle(17, 39, 4.5);
      t.generateTexture("teargas-canister", 28, 46);
      t.destroy();
    }
  }

  update(time: number, delta: number) {
    if (this.isFrozen) return;

    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.resetRound("playing");
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.togglePause();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      soundManager.toggleMute();
      this.callbacks.onMuteToggle?.(soundManager.getMuted());
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
      Phaser.Input.Keyboard.JustDown(this.enterKey) ||
      Phaser.Input.Keyboard.JustDown(this.upKey) ||
      Phaser.Input.Keyboard.JustDown(this.wKey)
    ) {
      this.requestJump();
    }

    if (
      Phaser.Input.Keyboard.JustUp(this.spaceKey) ||
      Phaser.Input.Keyboard.JustUp(this.enterKey) ||
      Phaser.Input.Keyboard.JustUp(this.upKey) ||
      Phaser.Input.Keyboard.JustUp(this.wKey)
    ) {
      this.releaseJump();
    }

    this.player.x = this.playerX();
    this.snapPlayerToGround();

    const currentlyGrounded = this.isGrounded();

    // Check for landing transition
    if (!this.wasGrounded && currentlyGrounded && this.stats.status === "playing") {
      this.handleLanding();
    }
    this.wasGrounded = currentlyGrounded;

    if (currentlyGrounded) {
      this.lastGroundedAt = this.time.now;
    }

    // Update shadow position and scaling based on height above ground
    this.updatePlayerShadow();

    if (this.stats.status !== "playing") {
      if (this.stats.status !== "lost") {
        this.player.setTexture("flamingo-a");
        this.player.setAngle(0);
      }
      return;
    }

    this.tryBufferedJump();

    const seconds = delta / 1000;
    const speed = this.currentSpeed();
    this.cityBack.tilePositionX += speed * 0.08 * seconds;
    this.cityFront.tilePositionX += speed * 0.22 * seconds;
    this.ground.tilePositionX += speed * seconds;

    // Kinesthetic jump tilt rotation
    if (currentlyGrounded) {
      this.jumpsRemaining = 2; // Reset double-jump counter
      this.animateRun(time);
      this.player.setAngle(0);
    } else {
      this.player.setTexture("flamingo-a");
      const vy = this.player.body.velocity.y;
      // Ascending: tilt upwards (-12°), Descending: tilt forward (+18°)
      const targetAngle = Phaser.Math.Clamp(vy * 0.032, -14, 22);
      this.player.setAngle(targetAngle);
    }

    // Active Power-Up Effects & Countdown
    if (this.activePowerUpType) {
      const remainingMs = Math.max(0, this.powerUpExpiresAt - time);
      if (remainingMs <= 0) {
        this.deactivatePowerUp();
      } else {
        // Makiato flame trail
        if (this.activePowerUpType === "makiato" && Math.random() < 0.45) {
          this.emitSparkles(this.player.x - 14, this.player.y + 6, 2);
        }

        // Magnet: Pull collectibles towards the player
        if (this.activePowerUpType === "magnet") {
          this.collectibles.getChildren().forEach((child) => {
            const c = child as MovingSprite;
            const dx = this.player.x - c.x;
            const dy = this.player.y - c.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 340) {
              c.x += (dx / dist) * 240 * seconds;
              c.y += (dy / dist) * 240 * seconds;
            }
          });
        }
      }
    }

    // Update Shield Bubble position
    if (this.shieldBubble && this.shieldBubble.active) {
      this.shieldBubble.setPosition(this.player.x, this.player.y);
    }

    // Spawn periodic powerups in the safe arc
    if (this.stats.status === "playing" && time >= this.nextPowerupAt) {
      this.nextPowerupAt = time + Phaser.Math.Between(13000, 20000);
      this.spawnPowerup();
    }

    // Gentle hover animation for air hazards
    this.animateAirHazards(time);

    // Update trailing boss chase position and float wobble
    if (this.bossChaseActive && this.bossChaseSprite && this.bossChaseSprite.active) {
      this.bossChaseSprite.x = Phaser.Math.Linear(this.bossChaseSprite.x, this.player.x - 56, 0.08);
      this.bossChaseSprite.y = this.groundTop - 36 + Math.sin(time * 0.008) * 4;
      if (this.bossChaseBubble && this.bossChaseBubble.active) {
        this.bossChaseBubble.x = this.bossChaseSprite.x + 18;
        this.bossChaseBubble.y = this.bossChaseSprite.y - 42;
      }
    }

    // Update growing revolutionary companion flock
    this.updateFlock(time, delta);

    // Dynamic Day-to-Night Satirical Cycle
    this.updateDayNightCycle();

    // Dynamic Tirana Parallax Easter Eggs & Street Graffiti
    this.updateScenery(time, delta);

    // Periodic Real-Time Satirical Breaking News Tickers
    if (this.stats.status === "playing" && time >= this.nextNewsTickerAt) {
      this.nextNewsTickerAt = time + Phaser.Math.Between(16000, 24000);
      const tickers = [
        "📰 SPAK: Dosja 5D zbulon se drejtorët kishin votuar 100% për kompaninë e vet!",
        "📰 LAJM I FUNDIT: Inceneratori nuk u gjet në vendngjarje, u gjet vetëm fatura!",
        "📰 SKANDAL: Koncesioni i Sterilizimit paguan 800€ për çdo hapje gërshërësh!",
        "📰 LIVE NGA ZVICRA: Tigri deklaron se inceneratori funksionon me bluetooth!",
        "📰 RAPORT: Patronazhistët zbuluan se flamingoja po refuzon propagandën!",
        "📰 NJOFTIM: Porti i Durrësit u transformua në parking jahtesh pa taksa!",
        "📰 KUVEND: Deputeti i lokalit porosit kafen e 6-të me dietat e shtetit!",
        "📰 ERTV: Kronika e gatshme u transmetua 2 orë para se të niste ngjarja!",
      ];
      this.showBreakingNews(Phaser.Utils.Array.GetRandom(tickers));
    }

    this.cleanupObjects();
  }

  private updateScenery(time: number, delta: number) {
    const seconds = delta / 1000;
    const speed = this.currentSpeed();

    // Move existing scenery items safely without mutating array during iteration
    const toRemove: Phaser.GameObjects.Image[] = [];
    this.sceneryGroup?.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Image;
      const speedMult = (sprite.getData("speedMult") as number) || 1.0;
      sprite.x -= speed * speedMult * seconds;

      const bindingText = sprite.getData("bindingText") as Phaser.GameObjects.Text | undefined;
      if (bindingText && bindingText.active) {
        bindingText.x = sprite.x;
      }

      if (sprite.x < -140) {
        toRemove.push(sprite);
      }
    });

    toRemove.forEach((sprite) => {
      const bindingText = sprite.getData("bindingText") as Phaser.GameObjects.Text | undefined;
      bindingText?.destroy();
      this.sceneryGroup.remove(sprite, true, true);
    });

    if (this.stats.status !== "playing") return;

    // Spawn Skyline Easter Eggs (Neon Billboards / ERTV Vans)
    if (time >= this.nextSceneryAt) {
      this.nextSceneryAt = time + Phaser.Math.Between(4200, 7800);
      const isBillboard = Math.random() < 0.58;

      if (isBillboard) {
        const billboard = this.add.image(this.scale.width + 60, this.scale.height - 212, "neon-billboard");
        billboard.setDepth(DEPTH_BACKGROUND_FRONT + 1);
        billboard.setData("speedMult", 0.28);

        const sloganPairs = [
          { prop: "FASADA 100%", truth: "GËNJESHTËR!" },
          { prop: "IKBELA HAJDUTI", truth: "20M EURO/KM" },
          { prop: "BLENDI GUSHA", truth: "GONXHJA CASH" },
          { prop: "SUFLLAQE", truth: "PËR 1 VOTË!" },
          { prop: "BIDOOO!", truth: "HALEJA LIVE" },
          { prop: "ÇOHU NGA KAFJA", truth: "SHESHI PO PRET" },
          { prop: "TAO TAO", truth: "RENDI IMAGJINAR" },
          { prop: "PIKTORI PLAK", truth: "SURREL VILLA" },
          { prop: "INCENERATORI", truth: "VETËM FATURA!" },
          { prop: "DOSJA 5D", truth: "TENDERAT VETES" },
          { prop: "STERILIZIMI", truth: "ÇMIM FLORIRI" },
          { prop: "PATRONAZHISTËT", truth: "E DIMË ÇFARË PI" },
          { prop: "PORTI DURRËSIT", truth: "JAHTE JO PORT" },
          { prop: "KONCESION 99V", truth: "SPAK PO VJEN" },
          { prop: "ERTV LIVE", truth: "SALLA BOSH" },
        ];
        const pair = Phaser.Utils.Array.GetRandom(sloganPairs);

        const textObj = this.add
          .text(billboard.x, billboard.y - 8, pair.prop, {
            fontFamily: "Outfit, sans-serif",
            fontSize: "9px",
            fontStyle: "bold",
            color: "#00f5b4",
          })
          .setOrigin(0.5)
          .setDepth(DEPTH_BACKGROUND_FRONT + 2);

        billboard.setData("bindingText", textObj);

        // Glitch flicker tween alternating between propaganda & truth
        this.time.addEvent({
          delay: 1400,
          repeat: 5,
          callback: () => {
            if (!textObj.active) return;
            textObj.setAlpha(0.15);
            this.time.delayedCall(90, () => {
              if (!textObj.active) return;
              textObj.setAlpha(1);
              const isTruth = textObj.text === pair.prop;
              textObj.setText(isTruth ? pair.truth : pair.prop);
              textObj.setColor(isTruth ? "#ff2a4b" : "#00f5b4");
            });
          },
        });

        this.sceneryGroup.add(billboard);
      } else {
        const van = this.add.image(this.scale.width + 50, this.scale.height - 188, "ertv-van");
        van.setDepth(DEPTH_BACKGROUND_FRONT + 1);
        van.setData("speedMult", 0.28);

        const vanLabel = this.add
          .text(van.x, van.y - 2, "ERTV", {
            fontFamily: "Outfit, sans-serif",
            fontSize: "8px",
            fontStyle: "900",
            color: "#ffd23f",
          })
          .setOrigin(0.5)
          .setDepth(DEPTH_BACKGROUND_FRONT + 2);

        van.setData("bindingText", vanLabel);
        this.sceneryGroup.add(van);
      }
    }

    // Spawn Ground Graffiti Tags
    if (time >= this.nextGraffitiAt) {
      this.nextGraffitiAt = time + Phaser.Math.Between(2400, 4800);
      const graffitiKeys = [
        "graffiti-rnbnb",
        "graffiti-3m",
        "graffiti-burg",
        "graffiti-5d",
        "graffiti-spak",
        "graffiti-sufllaqe",
        "graffiti-bido",
        "graffiti-kafja",
        "graffiti-taotao",
        "graffiti-piktori",
        "graffiti-gusha",
        "graffiti-ikbela",
      ];
      const key = Phaser.Utils.Array.GetRandom(graffitiKeys);

      const tag = this.add.image(this.scale.width + 40, this.groundTop + 24, key);
      tag.setDepth(DEPTH_GROUND + 1);
      tag.setAlpha(0.78);
      tag.setAngle(Phaser.Math.Between(-4, 4));
      tag.setData("speedMult", 1.0);
      this.sceneryGroup.add(tag);
    }
  }

  private updateDayNightCycle() {
    if (this.stats.status !== "playing") return;
    const elapsedSeconds = (this.time.now - this.roundStartAt) / 1000;
    const cycleSeconds = elapsedSeconds % 60;

    if (cycleSeconds >= 40 && this.timePhase !== "night") {
      this.timePhase = "night";
      soundManager.playSiren();
      this.showBreakingNews("🚨 ALARM SHTETËROR: Flamingoja mori sheshin, propaganda dështoi!");
      this.transitionSkyColor(0x0f172a, 0x312e81, 0x4338ca);
      this.refreshPlayerTint();
      this.startBossChase();
    } else if (cycleSeconds >= 20 && cycleSeconds < 40 && this.timePhase !== "sunset") {
      this.timePhase = "sunset";
      soundManager.playSiren();
      this.showBreakingNews("🚨 NJOFTIM: Deputetët kërkojnë të mos shikohen çadrat e protestës!");
      this.transitionSkyColor(0xe76f51, 0xff9e00, 0xffb703);
      this.refreshPlayerTint();
      this.endBossChase(false);
    } else if (cycleSeconds < 20 && this.timePhase !== "morning" && elapsedSeconds > 5) {
      this.timePhase = "morning";
      this.showBreakingNews("☀️ AGIMI I PROTESTËS: Sheshi mbushet sërish me qytetarë!");
      this.transitionSkyColor(0x93e4ef, 0xffffff, 0xffffff);
      this.refreshPlayerTint();
      this.endBossChase(false);
    }
  }

  private startBossChase() {
    if (this.bossChaseActive || this.stats.status !== "playing") return;
    this.bossChaseActive = true;

    const antagonistKey = Math.random() < 0.5 ? "edi-character" : "sali-character";
    const name = antagonistKey === "edi-character" ? "Piktori Plak (Edi Rama)" : "Sali Berisha";
    const quote = antagonistKey === "edi-character" ? "PIKTORI PLAK: S'KA PROTESTË!" : "FOLTORE 24/7 DHE DITË E NATË!";

    this.showBreakingNews(`🚨 ALARM: ${name} po ndjek flamingon!`);

    this.bossChaseSprite = this.add.image(-40, this.groundTop - 36, antagonistKey);
    this.bossChaseSprite.setDisplaySize(44, 66);
    this.bossChaseSprite.setDepth(DEPTH_OBSTACLE - 2);

    this.bossChaseBubble = this.add
      .text(10, this.groundTop - 78, `[ ${quote} ]`, {
        color: "#ffd23f",
        backgroundColor: "rgba(16,19,29,0.88)",
        fontFamily: "Outfit, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_LABEL);

    // Auto-end after 15 seconds if not repelled earlier
    this.time.delayedCall(15000, () => {
      this.endBossChase(false);
    });
  }

  private endBossChase(repelled = false) {
    if (!this.bossChaseActive || !this.bossChaseSprite) return;
    this.bossChaseActive = false;

    if (repelled) {
      this.emitSparkles(this.bossChaseSprite.x, this.bossChaseSprite.y, 16);
      this.showBreakingNews("💥 SHOKVALË REVOLUCIONARE: Regjimi u zmbraps!");
    }

    this.tweens.add({
      targets: [this.bossChaseSprite, this.bossChaseBubble],
      x: -140,
      alpha: 0,
      duration: 600,
      ease: "Quad.easeIn",
      onComplete: () => {
        this.bossChaseSprite?.destroy();
        this.bossChaseBubble?.destroy();
        this.bossChaseSprite = undefined;
        this.bossChaseBubble = undefined;
      },
    });
  }

  private transitionSkyColor(targetSky: number, backTint: number, frontTint: number) {
    const currentSky = Phaser.Display.Color.ValueToColor(this.cameras.main.backgroundColor.color);
    const endSky = Phaser.Display.Color.ValueToColor(targetSky);

    this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 2200,
      onUpdate: (tween) => {
        const currentVal = tween.getValue();
        const val = typeof currentVal === "number" ? currentVal / 100 : 0;
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(currentSky, endSky, 100, val * 100);
        this.cameras.main.setBackgroundColor(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      },
    });

    this.cityBack?.setTint(backTint);
    this.cityFront?.setTint(frontTint);
  }

  private handleLanding() {
    soundManager.playLand();
    this.emitDust(this.player.x - 6, this.groundTop - 2, 4);
    this.emitDust(this.player.x + 6, this.groundTop - 2, 4);

    // Subtle landing squash & stretch
    this.tweens.add({
      targets: this.player,
      scaleX: 1.12,
      scaleY: 0.88,
      duration: 60,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  private updatePlayerShadow() {
    if (!this.playerShadow) return;
    this.playerShadow.x = this.player.x;
    this.playerShadow.y = this.groundTop + 2;

    const heightAboveGround = Math.max(0, this.playerGroundY() - this.player.y);
    const scaleRatio = Phaser.Math.Clamp(1 - heightAboveGround * 0.005, 0.4, 1);
    const alphaRatio = Phaser.Math.Clamp(0.35 - heightAboveGround * 0.002, 0.08, 0.35);

    this.playerShadow.setScale(scaleRatio, scaleRatio);
    this.playerShadow.setAlpha(alphaRatio);
  }

  private animateAirHazards(time: number) {
    this.obstacles.getChildren().forEach((child) => {
      const sprite = child as MovingSprite;
      const hazardType = sprite.getData("hazardType");
      if (hazardType === "air") {
        const baseY = sprite.getData("baseY") as number;
        if (baseY) {
          const isSwooper = Boolean(sprite.getData("isSwooper"));
          if (isSwooper) {
            const spawnTime = (sprite.getData("spawnTime") as number) || time;
            const dive = Math.sin((time - spawnTime) * 0.005) * 28;
            sprite.y = Phaser.Math.Clamp(baseY + dive, this.groundTop - 150, this.groundTop - 36);
          } else {
            const hoverOffset = Math.sin((time + sprite.x * 2) * 0.0045) * 7;
            sprite.y = baseY + hoverOffset;
          }
        }
      }
    });
  }

  private startOrJump() {
    if (this.stats.status === "won" || this.stats.status === "lost") {
      this.resetRound("playing");
      return;
    }

    if (this.stats.status === "paused") {
      this.togglePause();
      return;
    }

    if (this.stats.status === "ready") {
      this.startRound();
    }

    if (this.stats.status === "playing") {
      this.tryBufferedJump();
    }
  }

  private startRound() {
    this.roundStartAt = this.time.now;
    this.lastGroundedAt = this.time.now;
    this.lastSpawnCategory = "ground_low";
    this.nextPowerupAt = this.time.now + 6000;
    this.player.body.allowGravity = true;
    this.updateStats({ status: "playing", message: this.level.objective });

    // Director: First obstacle spawns after comfortable warmup runway (1400ms)
    this.scheduleObstacleDirector(1400);

    this.scoreTimer = this.time.addEvent({
      delay: DISTANCE_TICK_MS,
      loop: true,
      callback: () => this.tickDistanceScore(),
    });
  }

  private requestJump() {
    soundManager.resumeIfSuspended();
    this.jumpBufferedUntil = this.time.now + JUMP_BUFFER_MS;
    this.startOrJump();
  }

  private tryBufferedJump() {
    if (this.stats.status !== "playing") return;
    if (this.jumpBufferedUntil < this.time.now) return;

    // 1. FIRST JUMP (Grounded or Coyote Time window)
    if (this.canJump()) {
      this.jumpBufferedUntil = 0;
      this.lastGroundedAt = 0; // Consume coyote time immediately
      this.jumpsRemaining = 1;
      this.jumpStartedAt = this.time.now;
      this.player.body.allowGravity = true;
      this.player.setVelocityY(this.level.jumpVelocity);
      this.player.setTexture("flamingo-a");

      soundManager.playJump();
      triggerHaptic(15);
      this.emitDust(this.player.x, this.groundTop - 2, 5);

      // Jump launch squash and stretch
      this.tweens.add({
        targets: this.player,
        scaleX: 0.88,
        scaleY: 1.14,
        duration: 80,
        yoyo: true,
        ease: "Quad.easeOut",
      });
      return;
    }

    // 2. DOUBLE JUMP (Mid-air wing flap & glide)
    if (this.jumpsRemaining > 0 && !this.isGrounded()) {
      this.jumpBufferedUntil = 0;
      this.jumpsRemaining = 0;
      this.jumpStartedAt = this.time.now;
      this.player.body.allowGravity = true;
      this.player.setVelocityY(this.level.jumpVelocity * 0.88);

      soundManager.playDoubleJump();
      triggerHaptic([15, 20]);
      this.emitFeathers(this.player.x, this.player.y + 12, 6);
      this.emitSparkles(this.player.x, this.player.y, 6);

      // Wing flap tilt animation
      this.tweens.add({
        targets: this.player,
        angle: -18,
        duration: 90,
        yoyo: true,
      });
    }
  }

  private releaseJump() {
    if (this.player.body.velocity.y >= 0) return;
    if (this.time.now - this.jumpStartedAt < JUMP_RELEASE_MIN_MS) return;

    this.player.setVelocityY(this.player.body.velocity.y * JUMP_CUT_MULTIPLIER);
  }

  // --- OBSTACLE DIRECTOR (Fair & Rhythmic Arcade Spacing) ---
  private scheduleObstacleDirector(overrideDelay?: number) {
    if (this.stats.status !== "playing") return;

    // Victory Finish Gate trigger
    if (
      this.stats.exposure >= this.level.targetExposure &&
      !this.finishSpawned &&
      !this.isEndless
    ) {
      this.finishSpawned = true;
      this.spawnFinishGate();
      return;
    }

    const elapsedSeconds = (this.time.now - this.roundStartAt) / 1000;
    const exposure = this.stats.exposure;
    let nextDelay = overrideDelay;

    if (!nextDelay) {
      if (exposure < 12) {
        // 0-12 Scandals: Lively, snappy warmup (950ms - 1300ms)
        nextDelay = Phaser.Math.Between(950, 1300);
      } else if (exposure < 28) {
        // 12-28 Scandals: Fast building cadence (820ms - 1100ms)
        nextDelay = Phaser.Math.Between(820, 1100);
      } else if (exposure < 45) {
        // 28-45 Scandals: Intense pressure & hazard blitzes (680ms - 940ms)
        const baseDelay = 950 / Math.pow(this.currentSpeedMultiplier(), 0.65);
        const jitter = Phaser.Math.Between(-80, 80);
        nextDelay = Phaser.Math.Clamp(baseDelay + jitter, 660, 950);
      } else {
        // 45-60+ Scandals: High adrenaline reflex climax (560ms - 820ms)
        const baseDelay = 820 / Math.pow(this.currentSpeedMultiplier(), 0.7);
        const jitter = Phaser.Math.Between(-60, 60);
        nextDelay = Phaser.Math.Clamp(baseDelay + jitter, 540, 820);
      }
    }

    // Scale delay by mobile viewport width
    const widthScale = Phaser.Math.Clamp(this.scale.width / 420, 0.9, 1.15);
    const adjustedDelay = nextDelay * widthScale;

    this.spawnTimer = this.time.delayedCall(adjustedDelay, () => {
      this.directorSpawnNext();
      this.scheduleObstacleDirector();
    });
  }

  private directorSpawnNext() {
    if (this.stats.status !== "playing") return;

    const exposure = this.stats.exposure;

    if (exposure < 10) {
      // 0-10 Scandals: Low hurdles & occasional podium
      const roll = Math.random();
      if (roll < 0.60) {
        this.spawnGroundObstacle("ground_low");
      } else {
        this.spawnGroundObstacle("ground_med");
      }
    } else if (exposure < 25) {
      // 10-25 Scandals: Double packs, air hazards, and podiums
      const roll = Math.random();
      if (roll < 0.28) {
        this.spawnGroundObstacle("ground_low");
      } else if (roll < 0.52) {
        this.spawnGroundObstacle("ground_med");
      } else if (roll < 0.74) {
        this.spawnDoublePack();
      } else {
        this.spawnAirHazard(Math.random() < 0.35);
      }
    } else if (exposure < 45) {
      // 25-45 Scandals: Fast Police Vans, Falling Tear Gas, Swooping Drones, Triple Staccato
      const roll = Math.random();
      if (roll < 0.18) {
        this.spawnPoliceVan();
      } else if (roll < 0.34) {
        this.spawnFallingTeargas();
      } else if (roll < 0.50) {
        this.spawnAirHazard(true); // Swooping Drone
      } else if (roll < 0.68) {
        this.spawnTripleRhythm();
      } else if (roll < 0.84) {
        this.spawnStaggeredAirGround();
      } else {
        this.spawnGroundObstacle("ground_tall");
      }
    } else {
      // 45-60+ Scandals: Full Speed Revolutionary Climax (All Hazards blitzing)
      const roll = Math.random();
      if (roll < 0.22) {
        this.spawnPoliceVan();
      } else if (roll < 0.40) {
        this.spawnFallingTeargas();
      } else if (roll < 0.56) {
        this.spawnTripleRhythm();
      } else if (roll < 0.72) {
        this.spawnStaggeredAirGround();
      } else if (roll < 0.86) {
        this.spawnAirHazard(true);
      } else {
        this.spawnGroundObstacle("ground_tall");
      }
    }

    // 78% chance to spawn collectibles / high-vault secret golden dossiers
    if (Math.random() < 0.78) {
      const isHighVault = Math.random() < 0.32;
      this.spawnCollectibleSafeArc(isHighVault);
    }
  }

  // Rapid Police / Propaganda Van Hazard with ⚠️ Warning Alert
  private spawnPoliceVan() {
    if (this.stats.status !== "playing") return;

    soundManager.playSiren();
    triggerHaptic([50, 40, 50, 40, 80]);

    // Flash Warning Icon ⚠️ on right screen edge
    const warning = this.add
      .text(this.scale.width - 24, this.groundTop - 28, "⚠️", {
        fontSize: "24px",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_LABEL + 6);

    this.tweens.add({
      targets: warning,
      scale: 1.4,
      alpha: 0.2,
      duration: 140,
      yoyo: true,
      repeat: 3,
      onComplete: () => warning.destroy(),
    });

    this.time.delayedCall(450, () => {
      if (this.stats.status !== "playing") return;

      const speed = this.currentSpeed() * 1.35;
      const x = this.scale.width + 50;
      const height = 44;
      const width = 72;

      const sprite = this.physics.add.image(
        x,
        this.groundTop - height / 2 + 2,
        "police-van",
      ) as MovingSprite;
      this.obstacles.add(sprite);

      sprite.setDisplaySize(width, height);
      sprite.setActive(true).setVisible(true).setAlpha(1);
      sprite.body.allowGravity = false;
      sprite.body.setSize(width * 0.55, height * 0.45).setOffset(width * 0.22, height * 0.48);
      sprite.setVelocityX(-speed);
      sprite.setDepth(DEPTH_OBSTACLE);
      sprite.setData("label", "MAKINA E PROPAGANDËS");
      sprite.setData("hazardType", "police_van");
    });
  }

  // Falling Tear Gas Canister from the sky
  private spawnFallingTeargas() {
    if (this.stats.status !== "playing") return;

    const x = this.scale.width + Phaser.Math.Between(40, 110);
    const sprite = this.physics.add.image(x, -20, "teargas-canister") as MovingSprite;
    this.obstacles.add(sprite);

    sprite.setDisplaySize(24, 38);
    sprite.body.allowGravity = false;
    sprite.body.setSize(18, 28).setOffset(3, 5);
    sprite.setVelocityX(-this.currentSpeed() * 0.9);
    sprite.setVelocityY(280);
    sprite.setDepth(DEPTH_OBSTACLE);
    sprite.setData("label", "GAZ LOTËSJELLËS");
    sprite.setData("hazardType", "falling_teargas");

    // Once it hits near ground, stop dropping and destroy timer
    const landTimer = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!sprite.active) {
          landTimer.destroy();
          return;
        }
        if (sprite.y >= this.groundTop - 18) {
          sprite.y = this.groundTop - 18;
          sprite.setVelocityY(0);
          sprite.setVelocityX(-this.currentSpeed());
          landTimer.destroy();
        }
      },
    });
    sprite.once(Phaser.GameObjects.Events.DESTROY, () => landTimer.destroy());
  }

  // Double pack: 2 small paper stacks spawned side-by-side
  private spawnDoublePack() {
    if (this.stats.status !== "playing") return;
    this.spawnGroundObstacle("ground_low", 0);
    this.spawnGroundObstacle("ground_low", 38);
  }

  // Triple rhythm: 3 small hurdles with snappy spacing
  private spawnTripleRhythm() {
    if (this.stats.status !== "playing") return;
    this.spawnGroundObstacle("ground_low", 0);
    this.spawnGroundObstacle("ground_low", 42);
    this.spawnGroundObstacle("ground_low", 84);
  }

  // Staggered Air & Ground sequence with safe 240px horizontal spacing
  private spawnStaggeredAirGround() {
    if (this.stats.status !== "playing") return;
    this.spawnGroundObstacle("ground_low", 0);
    this.spawnAirHazard(false, 240);
  }

  private spawnGroundObstacle(category: "ground_low" | "ground_med" | "ground_tall", offsetX = 0) {
    if (this.stats.status !== "playing") return;

    const obstacle = this.nextGroundObstacle(category);
    const speed = this.currentSpeed();
    const x = this.scale.width + 40 + offsetX;

    const isMinistry = obstacle.lloj === "ministri";
    const isPodium = obstacle.lloj === "podium";
    const width = isMinistry ? 68 : isPodium ? 70 : 68;
    const height = isMinistry ? 82 : isPodium ? 68 : 36;

    const sprite = this.physics.add.image(
      x,
      this.groundTop - height / 2 + 2,
      obstacle.texture,
    ) as MovingSprite;
    this.obstacles.add(sprite);

    sprite.setDisplaySize(width, height);
    sprite.setActive(true).setVisible(true).setAlpha(1);
    sprite.body.allowGravity = false;

    // Generous, forgiving collision hitboxes
    if (isMinistry) {
      sprite.body.setSize(width * 0.42, height * 0.48).setOffset(width * 0.29, height * 0.46);
    } else if (isPodium) {
      sprite.body.setSize(width * 0.44, height * 0.48).setOffset(width * 0.28, height * 0.46);
    } else {
      sprite.body.setSize(width * 0.44, height * 0.38).setOffset(width * 0.28, height * 0.52);
    }

    sprite.setVelocityX(-speed);
    sprite.setDepth(DEPTH_OBSTACLE);
    sprite.setData("label", obstacle.emri);
    sprite.setData("hazardType", "ground");
    this.lastSpawnCategory = category;
  }

  private spawnAirHazard(isSwooper = false, offsetX = 0) {
    if (this.stats.status !== "playing") return;

    const hazard = this.nextAirHazard();
    const speed = this.currentSpeed();
    const x = this.scale.width + Phaser.Math.Between(50, 90) + offsetX;
    // High air hazards leave 80px+ clear headroom so players easily run underneath on foot
    const y = isSwooper
      ? this.groundTop - 142
      : this.groundTop - Phaser.Math.Between(148, 172);

    const sprite = this.physics.add.image(x, y, hazard.texture) as MovingSprite;
    this.obstacles.add(sprite);

    const isMic = hazard.lloj === "mikrofon";
    const width = isMic ? 38 : 54;
    const height = isMic ? 52 : 36;

    sprite.setDisplaySize(width, height);
    sprite.setActive(true).setVisible(true).setAlpha(1);
    sprite.body.allowGravity = false;

    // Forgiving hitbox for air hazards
    sprite.body.setSize(width * 0.46, height * 0.46).setOffset(width * 0.27, height * 0.27);
    sprite.setVelocityX(-speed * (isSwooper ? 1.12 : 1.04));
    sprite.setDepth(DEPTH_OBSTACLE);
    sprite.setData("label", hazard.emri);
    sprite.setData("hazardType", "air");
    sprite.setData("baseY", y);
    sprite.setData("isSwooper", isSwooper);
    sprite.setData("spawnTime", this.time.now);

    this.lastSpawnCategory = "air";
  }

  private spawnCollectibleSafeArc(isHighVault = false) {
    if (this.stats.status !== "playing") return;

    const target = this.nextCollectibleTarget();
    const texture = this.collectibleTexture(target);
    const speed = this.currentSpeed();
    const x = this.scale.width + Phaser.Math.Between(160, 240);
    // Standard jump arc: 78-114, High double-jump vault: 136-162
    const y = isHighVault
      ? this.groundTop - Phaser.Math.Between(136, 162)
      : this.groundTop - Phaser.Math.Between(78, 114);

    const sprite = this.physics.add.image(x, y, texture) as MovingSprite;
    this.collectibles.add(sprite);

    sprite.body.allowGravity = false;
    sprite.setVelocityX(-speed);
    sprite.setDepth(DEPTH_COLLECTIBLE);
    sprite.setData("target", target);
    sprite.setData("collected", false);
    sprite.setData("collectedTexture", texture === "shenje" ? "shenje-zbuluar" : texture);
    sprite.setData("isHighVault", isHighVault);

    if (texture === "edi-character" || texture === "sali-character") {
      sprite.setDisplaySize(44, 66);
      sprite.body.setSize(32, 48);
      this.addLabel(sprite, this.targetTitle(target), -34, 116);
    } else if (texture === "person") {
      sprite.setDisplaySize(38, 46);
      sprite.body.setSize(28, 38);
      this.addLabel(sprite, this.targetTitle(target), -30, 108);
    } else if (texture === "dokument") {
      sprite.setDisplaySize(38, 48);
      sprite.body.setSize(28, 38);
      this.addLabel(sprite, this.targetTitle(target), -32, 108);
    } else {
      sprite.setDisplaySize(112, 39);
      sprite.body.setSize(88, 24);
      this.addLabel(sprite, this.targetTitle(target), 0, 104, true);
    }

    if (isHighVault) {
      sprite.setTint(0xffd23f);
    }
  }

  private spawnPowerup() {
    if (this.stats.status !== "playing") return;

    const types: Array<"makiato" | "shield" | "magnet"> = ["makiato", "shield", "magnet"];
    const type = Phaser.Utils.Array.GetRandom(types);
    const textureKey = `powerup-${type}`;

    const speed = this.currentSpeed();
    const x = this.scale.width + Phaser.Math.Between(60, 110);
    const y = this.groundTop - Phaser.Math.Between(48, 88);

    const sprite = this.physics.add.image(x, y, textureKey) as MovingSprite;
    this.powerups.add(sprite);

    sprite.setDisplaySize(42, 42);
    sprite.setSize(38, 38);
    sprite.body.allowGravity = false;
    sprite.setVelocityX(-speed);
    sprite.setDepth(DEPTH_COLLECTIBLE + 4);
    sprite.setData("type", type);

    // Gentle float bobbing tween
    this.tweens.add({
      targets: sprite,
      y: y - 8,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private collectPowerUp(powerup: MovingSprite) {
    if (!powerup.active) return;
    const type = powerup.getData("type") as "makiato" | "shield" | "magnet";
    powerup.destroy();

    soundManager.playPowerup();
    triggerHaptic([30, 40, 50]);
    this.emitSparkles(this.player.x, this.player.y, 14);

    if (type === "makiato") {
      this.floatText(this.player.x, this.player.y - 30, "⚡ MAKIATO TURBO!", "#ff4f8b");
      this.activatePowerUp("makiato", 4500);
    } else if (type === "shield") {
      this.floatText(this.player.x, this.player.y - 30, "🛡️ SUFLLAQE MBUROJË (ABSORBIM)!", "#06d6a0");
      this.activatePowerUp("shield", 20000);
    } else if (type === "magnet") {
      this.floatText(this.player.x, this.player.y - 30, "🧲 MAGNET SLOGANESH!", "#38bdf8");
      this.activatePowerUp("magnet", 6000);
    }
  }

  private activatePowerUp(type: "makiato" | "shield" | "magnet", durationMs: number) {
    this.activePowerUpType = type;
    this.powerUpDurationMs = durationMs;
    this.powerUpExpiresAt = this.time.now + durationMs;

    if (type === "makiato") {
      soundManager.playTurbo();
      this.player.setTint(0xff4f8b);
      this.showBreakingNews("☕ MAKIATO E DYFISHTË: TURBO DASH I PATHYESHËM!");
    } else if (type === "shield") {
      this.shieldBubble?.destroy();
      this.shieldBubble = this.add.image(this.player.x, this.player.y, "shield-bubble");
      this.shieldBubble.setDepth(DEPTH_PLAYER + 2);
      this.shieldBubble.setDisplaySize(76, 76);
      this.tweens.add({
        targets: this.shieldBubble,
        scaleX: 1.12,
        scaleY: 1.12,
        alpha: 0.85,
        duration: 450,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.showBreakingNews("🌯 SUFLLAQJA E FUSHATËS: MBUROJË ME 2 JETË!");
    } else if (type === "magnet") {
      this.showBreakingNews("🧲 KONCESIONI MAGNETIK: TË GJITHA DOSJET PO THITHEN!");
    }

    const statsUpdate: Partial<GameStats> = {
      activePowerUp: {
        type,
        remainingMs: durationMs,
        totalMs: durationMs,
      },
    };
    if (type === "shield") {
      statsUpdate.lives = 2; // Only Sufllaqe Mburojë restores full 2 lives
    }

    this.updateStats(statsUpdate);
  }

  private deactivatePowerUp() {
    this.activePowerUpType = undefined;
    this.powerUpExpiresAt = 0;
    this.powerUpDurationMs = 0;
    this.shieldBubble?.destroy();
    this.shieldBubble = undefined;

    this.refreshPlayerTint();
    this.updateStats({ activePowerUp: undefined });
  }

  private updateFlock(time: number, delta: number) {
    const targetCount =
      this.stats.exposure >= 30 ? 6 : this.stats.exposure >= 20 ? 4 : this.stats.exposure >= 10 ? 2 : 0;

    while (this.flockSprites.length < targetCount) {
      const idx = this.flockSprites.length;
      const xOffset = -60 - idx * 32;
      const yOffset = -30 + (idx % 2 === 0 ? -1 : 1) * (12 + idx * 4);
      const sprite = this.add.image(this.player.x + xOffset, this.playerGroundY() + yOffset, "flamingo-a");
      sprite.setDisplaySize(PLAYER_DISPLAY_WIDTH * 0.72, PLAYER_DISPLAY_HEIGHT * 0.72);
      sprite.setDepth(DEPTH_BACKGROUND_FRONT + 2);
      sprite.setAlpha(0.68);
      this.flockSprites.push(sprite);
    }

    // Move companion flamingos smoothly
    this.flockSprites.forEach((sprite, idx) => {
      const targetX = this.player.x - 60 - idx * 30;
      const baseGroundY = this.playerGroundY() - 28 + (idx % 2 === 0 ? -10 : 10);
      const bobbing = Math.sin((time + idx * 400) * 0.006) * 6;
      sprite.x = Phaser.Math.Linear(sprite.x, targetX, 0.08);
      sprite.y = Phaser.Math.Linear(sprite.y, baseGroundY + bobbing, 0.08);
      sprite.setTexture(this.runFrame === 0 ? "flamingo-a" : "flamingo-b");
    });
  }

  private toggleGoldenSkin() {
    this.goldenSkinEnabled = !this.goldenSkinEnabled;
    this.refreshPlayerTint();
  }

  private refreshPlayerTint() {
    if (this.activePowerUpType === "makiato") {
      this.player.setTint(0xff4f8b);
    } else if (this.goldenSkinEnabled) {
      this.player.setTint(0xffd23f);
    } else if (this.timePhase === "night") {
      this.player.setTint(0xff99bb);
    } else {
      this.player.clearTint();
    }
  }

  private collectTarget(collectible: MovingSprite) {
    if (collectible.getData("collected")) return;

    const target = collectible.getData("target") as CollectibleTarget;
    collectible.setData("collected", true);
    collectible.body.enable = false;

    // Cleanly animate and destroy the attached label
    const binding = this.labels.get(collectible);
    if (binding) {
      this.labels.delete(collectible);
      this.tweens.add({
        targets: binding.label,
        y: binding.label.y - 28,
        alpha: 0,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 320,
        ease: "Quad.easeOut",
        onComplete: () => binding.label.destroy(),
      });
    }

    let stampText: string | undefined;
    if ("titull" in target) {
      if (target.titull.includes("Incinerator")) stampText = "PLEHRA IMAGJINARE!";
      else if (target.titull.includes("5D")) stampText = "TENDERAT VETES!";
      else if (target.titull.includes("Sterilizim")) stampText = "GËRSHËRË FLORIRI!";
      else if (target.titull.includes("Porti")) stampText = "JAHTE JO PORT!";
      else if (target.titull.includes("Check-Up")) stampText = "ANALIZA FIKTIVE!";
      else if (target.titull.includes("Patronazh")) stampText = "SPIUN DIXHITAL!";
      else if (target.titull.includes("Steak")) stampText = "DARKË ME TAKSA!";
      else if (target.titull.includes("Kulla")) stampText = "KULLË BETONI!";
    } else if ("emri" in target) {
      if (target.emri.includes("Tigri")) stampText = "TIGRI N'ARRATI!";
      else if (target.emri.includes("5D")) stampText = "TENDERAT VETES!";
      else if (target.emri.includes("Sterilizim")) stampText = "GËRSHËRË FLORIRI!";
      else if (target.emri.includes("Patronazhist")) stampText = "SPIUN DIXHITAL!";
      else if (target.emri.includes("Kafe")) stampText = "KAFE 500 LEKË!";
      else if (target.emri.includes("Syze")) stampText = "VILË NË ZVICËR!";
      else if (target.emri.includes("Çantës")) stampText = "ÇANTA 8 RROGA!";
      else if (target.emri.includes("Bosh")) stampText = "SALLA BOSH!";
    }

    const isAntagonist = "antagonist" in target && (target.antagonist === "edi" || target.antagonist === "sali");
    let combinationBonus = 0;

    if (isAntagonist) {
      const antagonistType = (target as PersonObstacle).antagonist!;
      // PRISON CAGING ANIMATION
      soundManager.playJailLock();
      soundManager.playShredStamp();
      triggerHaptic([30, 40, 30]); // Crisp double-tap on prison slam
      this.emitPaperShreds(collectible.x, collectible.y, 18);
      this.spawnPrisonCage(collectible.x, collectible.y, antagonistType);

      if (antagonistType === "edi") {
        this.cagedEdi = true;
        this.slamRubberStamp(collectible.x, collectible.y, "RAMA N'BURG!");
      } else {
        this.cagedSali = true;
        this.slamRubberStamp(collectible.x, collectible.y, "BERISHA N'BURG!");
      }

      // Repel boss chase if currently active
      this.endBossChase(true);

      // Check if both have been caged in this run (trigger bonus only once per run)
      if (this.cagedEdi && this.cagedSali && !this.bothAntagonistsBonusAwarded) {
        this.bothAntagonistsBonusAwarded = true;
        combinationBonus = 1000;
        soundManager.playWin();
        triggerHaptic([40, 30, 40, 30, 60]);
        this.showBreakingNews("🏛️ SPAK: EDI DHE SALI U FUTËN NË BURG! RNBNB! (+1000 Pikë)");
      }
    } else {
      // SHRED THE PROPAGANDA: Paper-rip particles + Red Rubber-Stamp + Audio
      soundManager.playShredStamp();
      triggerHaptic([30, 40, 30]); // Crisp double-tap on slogan shred
      this.emitPaperShreds(collectible.x, collectible.y, 16);
      this.slamRubberStamp(collectible.x, collectible.y, stampText);
    }

    // Cleanly animate and destroy the collectible sprite
    this.tweens.add({
      targets: collectible,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      y: collectible.y - 20,
      duration: 250,
      ease: "Quad.easeOut",
      onComplete: () => collectible.destroy(),
    });

    // High-Vault Secret Golden Dossier bonus
    const isHighVault = Boolean(collectible.getData("isHighVault"));
    const highVaultBonus = isHighVault ? 300 : 0;
    if (isHighVault) {
      soundManager.playPowerup();
      this.floatText(this.player.x, this.player.y - 32, "✨ DOSJE E ARTË NË AJËR (+300)!", "#ffd23f");
      this.showBreakingNews("⭐ KËRCIM MAGJIK NË LARTËSI: Kapur dosja sekrete e artë!");
    }

    const combo = Math.min(this.stats.combo + 1, 5);
    const gained = target.pike * this.stats.combo;
    const score = this.stats.score + gained + combinationBonus + highVaultBonus;
    const exposure = this.stats.exposure + 1;

    // Sparkles & Floating Score
    this.emitSparkles(collectible.x, collectible.y, 8);
    // Milestone celebrations every 10 exposures without interrupting the run
    if (exposure % 10 === 0) {
      soundManager.playWin();
      triggerHaptic([30, 30, 50]);
      this.emitSparkles(this.scale.width / 2, this.scale.height * 0.3, 22);
      const bonus = exposure * 50;
      this.showBreakingNews(`🔥 REVOLUCIONI PO RRITET: ${exposure} Zbulime! (+${bonus} Pikë)`);
      this.updateStats({
        score: score + bonus,
        exposure,
        combo,
        message: `${exposure} zbulime të arritura!`,
      });
      return;
    }

    this.updateStats({
      score,
      exposure,
      combo,
      message: `${this.targetReveal(target)}!`,
    });
  }

  private takeHit(obstacle?: MovingSprite) {
    if (this.time.now < this.invulnerableUntil || this.stats.status !== "playing") return;

    // 1. TURBO MAKIATO IMMUNITY: Smashes straight through obstacles!
    if (this.activePowerUpType === "makiato") {
      soundManager.playShredStamp();
      triggerHaptic(40);
      this.cameras.main.shake(80, 0.008);
      if (obstacle && obstacle.active) {
        this.emitPaperShreds(obstacle.x, obstacle.y, 14);
        this.emitSparkles(obstacle.x, obstacle.y, 10);
        const binding = this.labels.get(obstacle);
        if (binding) {
          binding.label.destroy();
          this.labels.delete(obstacle);
        }
        obstacle.destroy();
      }
      this.slamRubberStamp(this.player.x, this.player.y - 28, "TURBO SMASH!");
      this.updateStats({
        score: this.stats.score + 100,
        message: "TURBO DASH! Pengesa u shpartallua!",
      });
      return;
    }

    // 2. SUFLLAQE SHIELD ABSORPTION: Absorbs the hit completely and protects lives!
    if (this.activePowerUpType === "shield") {
      soundManager.playCrash();
      triggerHaptic([40, 60]);
      this.cameras.main.shake(100, 0.01);
      if (obstacle && obstacle.active) {
        this.emitPaperShreds(obstacle.x, obstacle.y, 12);
        const binding = this.labels.get(obstacle);
        if (binding) {
          binding.label.destroy();
          this.labels.delete(obstacle);
        }
        obstacle.destroy();
      }
      this.emitSparkles(this.player.x, this.player.y, 18);
      this.floatText(this.player.x, this.player.y - 30, "🛡️ MBUROJA ABSORBOI GODITJEN!", "#06d6a0");
      this.invulnerableUntil = this.time.now + 1500;
      this.deactivatePowerUp();

      // Flash player sprite during invulnerability
      this.tweens.add({
        targets: this.player,
        alpha: 0.35,
        duration: 90,
        yoyo: true,
        repeat: 7,
        onComplete: () => {
          this.player.setAlpha(1);
        },
      });

      this.showBreakingNews("🛡️ SUFLLAQJA ABSORBOI GODITJEN! JE I SIGURT!");
      this.updateStats({
        message: "Mburoja e Sufllaqes absorboi goditjen!",
      });
      return;
    }

    const obstacleLabel = obstacle?.getData("label") as string | undefined;

    // FORGIVENESS ON FIRST HIT (lives > 1)
    if (this.stats.lives > 1) {
      this.invulnerableUntil = this.time.now + 1400; // 1.4s invulnerability
      soundManager.playCrash();
      triggerHaptic(80); // Heavy pulse (80ms) on stumble

      this.emitFeathers(this.player.x, this.player.y, 8);
      this.cameras.main.shake(120, 0.01);

      // Shatter colliding obstacle so it cannot re-collide
      if (obstacle && obstacle.active) {
        this.emitPaperShreds(obstacle.x, obstacle.y, 10);
        const binding = this.labels.get(obstacle);
        if (binding) {
          binding.label.destroy();
          this.labels.delete(obstacle);
        }
        obstacle.destroy();
      }

      // Flash player sprite during invulnerability
      this.tweens.add({
        targets: this.player,
        alpha: 0.35,
        duration: 90,
        yoyo: true,
        repeat: 7,
        onComplete: () => {
          this.player.setAlpha(1);
          this.player.clearTint();
        },
      });

      // Quick stumble squash & stretch
      this.tweens.add({
        targets: this.player,
        scaleX: 1.18,
        scaleY: 0.82,
        duration: 75,
        yoyo: true,
      });

      this.showBreakingNews("⚠️ SHPËTOVE PËR NJË QIME! (1 Jetë e mbetur)");
      this.updateStats({
        lives: 1,
        combo: 1,
        message: obstacleLabel ? `Përplasje e lehtë me ${obstacleLabel}!` : "Shpëtove për pak!",
      });
      return;
    }

    // FATAL HIT (lives <= 1)
    this.invulnerableUntil = this.time.now + INVULNERABLE_MS;
    soundManager.playCrash();
    triggerHaptic([50, 40, 90]);

    // Burst feathers
    this.emitFeathers(this.player.x, this.player.y, 16);

    // Hit-stop: brief 90ms micro-pause for visceral impact punch
    this.isFrozen = true;
    this.player.setTint(0xff4f8b);
    this.cameras.main.shake(160, 0.015);

    const isEdi = obstacleLabel?.includes("Rama") || obstacle?.texture.key === "edi-character";
    const isSali = obstacleLabel?.includes("Berisha") || obstacle?.texture.key === "sali-character";
    const lastHitAntagonist: "edi" | "sali" | undefined = isEdi ? "edi" : isSali ? "sali" : undefined;

    this.time.delayedCall(90, () => {
      this.isFrozen = false;
      this.updateStats({
        lives: 0,
        combo: 1,
        lastHitAntagonist,
        message: obstacleLabel ? `U përplase me ${obstacleLabel}` : "U përplase",
      });
      this.loseRound();
    });
  }

  private tickDistanceScore() {
    if (this.stats.status !== "playing") return;
    this.updateStats({ score: this.stats.score + Math.ceil(this.currentSpeedMultiplier()) });
  }

  private currentSpeedMultiplier() {
    const survivedSeconds = (this.time.now - this.roundStartAt) / 1000;
    const progressFactor = Math.min(1, this.stats.exposure / this.level.targetExposure);
    return Phaser.Math.Clamp(1 + progressFactor * 0.52 + survivedSeconds * 0.004, 1, 1.82);
  }

  private currentSpeed() {
    return this.level.speed * this.currentSpeedMultiplier();
  }

  private spawnFinishGate() {
    if (this.stats.status !== "playing") return;

    this.showBreakingNews("🏁 PO AFROHET SHESHI! GRIS SHIRITIN PËR TË ÇLIRUAR VENDIN!");

    const speed = this.currentSpeed();
    const x = this.scale.width + 140;
    const gateHeight = 160;
    const gateWidth = 110;

    // 1. Grand Ministry Arch Background
    const gate = this.physics.add.image(
      x,
      this.groundTop - gateHeight / 2 + 4,
      "finish-gate",
    ) as MovingSprite;
    gate.setDisplaySize(gateWidth, gateHeight);
    gate.body.allowGravity = false;
    gate.setVelocityX(-speed);
    gate.setDepth(DEPTH_OBSTACLE - 2);

    // 2. Ceremonial Ribbon across the running line
    const ribbonY = this.groundTop - 34;
    const ribbon = this.physics.add.image(x, ribbonY, "finish-ribbon") as MovingSprite;
    ribbon.setDisplaySize(96, 32);
    ribbon.body.allowGravity = false;
    ribbon.setVelocityX(-speed);
    ribbon.setDepth(DEPTH_LABEL + 4);

    // Overlap with player to trigger Victory!
    const overlapDetector = this.physics.add.overlap(this.player, ribbon, () => {
      overlapDetector.destroy();
      ribbon.destroy();

      // Tear ribbon in half + emit golden confetti & fireworks
      soundManager.playWin();
      triggerHaptic([40, 30, 40, 30, 80, 50, 90]);
      this.emitGoldenConfetti(this.player.x, this.player.y, 40);
      this.emitSparkles(this.scale.width / 2, this.scale.height / 2, 45);
      this.slamRubberStamp(this.player.x, this.player.y - 30, "SHESHI U ÇLIRUA!");

      const victoryBonus = 2000;
      const finalScore = this.stats.score + victoryBonus;

      this.time.delayedCall(450, () => {
        this.winRound(finalScore, victoryBonus);
      });
    });
  }

  private emitGoldenConfetti(x: number, y: number, count = 30) {
    const confettiColors = ["gold-confetti", "shred-red", "shred-white"];
    for (let i = 0; i < count; i++) {
      const key = Phaser.Utils.Array.GetRandom(confettiColors);
      const p = this.add.image(x, y, key);
      p.setDepth(DEPTH_PARTICLES + 10);

      const angle = Phaser.Math.FloatBetween(-Math.PI * 0.95, -Math.PI * 0.05);
      const speed = Phaser.Math.Between(160, 380);
      const targetX = x + Math.cos(angle) * speed + Phaser.Math.Between(-60, 60);
      const targetY = y + Math.sin(angle) * speed + Phaser.Math.Between(40, 140);

      this.tweens.add({
        targets: p,
        x: targetX,
        y: targetY,
        angle: p.angle + Phaser.Math.Between(-720, 720),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(700, 1200),
        ease: "Quad.easeOut",
        onComplete: () => p.destroy(),
      });
    }
  }

  private continueEndlessMode() {
    this.isEndless = true;
    this.finishSpawned = false;
    this.player.body.allowGravity = true;

    this.scoreTimer?.destroy();
    this.scoreTimer = this.time.addEvent({
      delay: DISTANCE_TICK_MS,
      loop: true,
      callback: () => this.tickDistanceScore(),
    });

    this.updateStats({
      status: "playing",
      isEndless: true,
      message: "Marshim pa Fund! Regjimi ra, shko për rekordin!",
    });
    this.scheduleObstacleDirector(1000);
  }

  private winRound(finalScore?: number, victoryBonus = 2000) {
    this.endBossChase(true);
    soundManager.playWin();
    this.emitSparkles(this.scale.width / 2, this.scale.height / 2, 25);
    this.stopMotion();
    this.addBanner("Sheshi u Çlirua!");
    const scoreToSet = finalScore ?? (this.stats.score + victoryBonus);
    this.updateStats({
      score: scoreToSet,
      status: "won",
      message: `Fitore Madhështore! (+${victoryBonus} Pikë)`,
    });
    this.callbacks.onLevelComplete(this.level.id, scoreToSet);
  }

  private loseRound() {
    this.stopMotion();
    // Death tumble animation
    this.tweens.add({
      targets: this.player,
      angle: -45,
      y: this.playerGroundY() + 4,
      duration: 350,
      ease: "Bounce.easeOut",
    });

    this.addBanner("Fund loje");
    trackEvent("game_over", { score: this.stats.score, exposure: this.stats.exposure });
    this.updateStats({ status: "lost", message: "Kliko për ta rinisur" });
  }

  private resetRound(status: GameStats["status"] = "ready") {
    const shouldStart = status === "playing";

    this.stopMotion();
    this.isFrozen = false;
    this.obstacles.clear(true, true);
    this.collectibles.clear(true, true);
    this.labels.forEach(({ label }) => label.destroy());
    this.labels.clear();
    this.zbulimIndex = 0;
    this.politikanIndex = 0;
    this.groundIndex = 0;
    this.airIndex = 0;
    this.documentIndex = 0;
    this.invulnerableUntil = 0;
    this.jumpBufferedUntil = 0;
    this.lastGroundedAt = 0;
    this.jumpStartedAt = 0;
    this.wasGrounded = true;
    this.lastSpawnCategory = "ground_low";
    this.timePhase = "morning";
    this.cagedEdi = false;
    this.cagedSali = false;
    this.bothAntagonistsBonusAwarded = false;
    this.finishSpawned = false;
    this.isEndless = false;
    this.powerups?.clear(true, true);
    this.flockSprites?.forEach((s) => s.destroy());
    this.flockSprites = [];
    this.deactivatePowerUp();
    this.nextPowerupAt = 10000;
    this.endBossChase(false);

    this.sceneryGroup?.getChildren().forEach((child) => {
      const bindingText = child.getData("bindingText") as Phaser.GameObjects.Text | undefined;
      bindingText?.destroy();
    });
    this.sceneryGroup?.clear(true, true);
    this.nextSceneryAt = 0;
    this.nextGraffitiAt = 0;
    this.nextNewsTickerAt = 10000;

    this.cameras.main.setBackgroundColor(this.level.skyColor);
    this.cityBack?.clearTint();
    this.cityFront?.clearTint();

    this.player.setPosition(this.playerX(), this.playerGroundY());
    this.player.setVelocity(0, 0);
    this.player.setAngle(0);
    this.player.setScale(1, 1);
    this.player.setTexture("flamingo-a");
    this.player.clearTint();
    this.player.body.allowGravity = false;

    this.stats = createInitialStats(this.level);
    this.callbacks.onStatsChange(this.stats);

    if (shouldStart) {
      this.jumpBufferedUntil = this.time.now + JUMP_BUFFER_MS;
      this.startRound();
      this.tryBufferedJump();
    }
  }

  private togglePause() {
    if (this.stats.status === "playing") {
      this.physics.world.pause();
      if (this.spawnTimer) this.spawnTimer.paused = true;
      if (this.scoreTimer) this.scoreTimer.paused = true;
      this.updateStats({ status: "paused", message: "Pauzë" });
      this.addBanner("Pauzë");
      return;
    }

    if (this.stats.status === "paused") {
      this.physics.world.resume();
      if (this.spawnTimer) this.spawnTimer.paused = false;
      if (this.scoreTimer) this.scoreTimer.paused = false;
      this.updateStats({ status: "playing", message: this.level.objective });
    }
  }

  private stopMotion() {
    this.spawnTimer?.destroy();
    this.scoreTimer?.destroy();
    this.physics.world.resume();
    this.player.setVelocity(0, 0);
    this.obstacles.setVelocityX(0);
    this.collectibles.setVelocityX(0);
    this.powerups.setVelocityX(0);
  }

  private cleanupObjects() {
    this.cleanupGroup(this.obstacles, false);
    this.cleanupGroup(this.collectibles, true);
    this.cleanupGroup(this.powerups, false);

    this.labels.forEach((binding, sprite) => {
      if (!sprite.active) {
        binding.label.destroy();
        this.labels.delete(sprite);
        return;
      }

      binding.label.setPosition(sprite.x, sprite.y + binding.offsetY);
    });
  }

  private cleanupGroup(group: Phaser.Physics.Arcade.Group, missedCollectible: boolean) {
    const children = [...group.getChildren()];
    children.forEach((child) => {
      const sprite = child as MovingSprite;

      if (
        missedCollectible &&
        !sprite.getData("collected") &&
        sprite.x < this.playerX() - PLAYER_DISPLAY_WIDTH
      ) {
        sprite.setData("collected", true);
        this.updateStats({ combo: 1, message: "Objektivi iku pa u zbuluar" });
      }

      if (sprite.x > -160) return;

      const binding = this.labels.get(sprite);
      binding?.label.destroy();
      this.labels.delete(sprite);
      sprite.destroy();
    });
  }

  private drawWorld() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.cityBack = this.add.tileSprite(0, height - 238, width, 208, "tirana-larg");
    this.cityBack.setOrigin(0, 0).setDepth(DEPTH_BACKGROUND_BACK);

    this.cityFront = this.add.tileSprite(0, height - 190, width, 208, "tirana-afer");
    this.cityFront.setOrigin(0, 0).setDepth(DEPTH_BACKGROUND_FRONT);

    this.ground = this.add.tileSprite(0, height - GROUND_HEIGHT, width, GROUND_HEIGHT, "toke");
    this.ground.setOrigin(0, 0).setDepth(DEPTH_GROUND);
  }

  private handleResize() {
    const width = this.scale.width;
    const height = this.scale.height;
    const newGroundTop = height - GROUND_HEIGHT;
    const deltaY = newGroundTop - this.groundTop;
    this.groundTop = newGroundTop;

    if (deltaY !== 0) {
      const shiftGroup = (group: Phaser.Physics.Arcade.Group) => {
        group.getChildren().forEach((child) => {
          const sprite = child as MovingSprite;
          sprite.y += deltaY;
          const binding = this.labels.get(sprite);
          if (binding) binding.label.y += deltaY;
        });
      };
      shiftGroup(this.obstacles);
      shiftGroup(this.collectibles);

      this.sceneryGroup?.getChildren().forEach((child) => {
        const sprite = child as Phaser.GameObjects.Image;
        sprite.y += deltaY;
        const bindingText = sprite.getData("bindingText") as Phaser.GameObjects.Text | undefined;
        if (bindingText) bindingText.y += deltaY;
      });
    }

    this.playerShadow?.setPosition(this.playerX(), newGroundTop + 2);
    this.player?.setPosition(this.playerX(), Math.min(this.player.y + deltaY, this.playerGroundY()));
    this.cityBack.setSize(width, 208).setPosition(0, height - 238);
    this.cityFront.setSize(width, 208).setPosition(0, height - 190);
    this.ground.setSize(width, GROUND_HEIGHT).setPosition(0, height - GROUND_HEIGHT);
  }

  private snapPlayerToGround() {
    const groundY = this.playerGroundY();
    if (this.player.y < groundY || this.player.body.velocity.y < 0) return;

    this.player.setY(groundY);
    this.player.setVelocityY(0);
  }

  private isGrounded() {
    return this.player.y >= this.playerGroundY() - 1 && this.player.body.velocity.y >= 0;
  }

  private canJump() {
    return this.isGrounded() || this.time.now - this.lastGroundedAt <= COYOTE_TIME_MS;
  }

  private animateRun(time: number) {
    if (time < this.nextRunFrameAt) return;

    this.runFrame = this.runFrame === 0 ? 1 : 0;
    this.player.setTexture(this.runFrame === 0 ? "flamingo-a" : "flamingo-b");
    const interval = RUN_FRAME_MS / this.currentSpeedMultiplier();
    this.nextRunFrameAt = time + interval;
  }

  private nextCollectibleTarget(): CollectibleTarget {
    const roll = Math.random();
    // 45% politicians (with heavy weight on Rama & Berisha), 25% documents, 30% slogans
    if (roll < 0.45) return this.nextPolitikan();
    if (roll < 0.70) return this.nextDocument();
    return this.nextZbulim();
  }

  private nextZbulim() {
    const list = this.level.zbulime;
    return list[Phaser.Math.Between(0, list.length - 1)];
  }

  private nextPolitikan() {
    const list = this.level.politikanet;
    const antagonists = list.filter((p) => p.antagonist === "edi" || p.antagonist === "sali");
    // 65% chance to specifically pick Edi Rama or Sali Berisha so they get caged often!
    if (antagonists.length > 0 && Math.random() < 0.65) {
      return antagonists[Phaser.Math.Between(0, antagonists.length - 1)];
    }
    return list[Phaser.Math.Between(0, list.length - 1)];
  }

  private nextGroundObstacle(category?: "ground_low" | "ground_med" | "ground_tall") {
    let pool = this.level.pengesaToke;
    if (category === "ground_low") {
      pool = this.level.pengesaToke.filter((item) => item.lloj === "letra");
    } else if (category === "ground_med") {
      pool = this.level.pengesaToke.filter((item) => item.lloj === "podium");
    } else if (category === "ground_tall") {
      pool = this.level.pengesaToke.filter((item) => item.lloj === "ministri");
    }

    if (pool.length === 0) pool = this.level.pengesaToke;
    return pool[Phaser.Math.Between(0, pool.length - 1)];
  }

  private nextAirHazard() {
    const list = this.level.rreziqeAjri;
    return list[Phaser.Math.Between(0, list.length - 1)];
  }

  private nextDocument() {
    const list = this.level.dokumente;
    return list[Phaser.Math.Between(0, list.length - 1)];
  }

  private collectibleTexture(target: CollectibleTarget): "edi-character" | "sali-character" | "person" | "dokument" | "shenje" {
    if ("antagonist" in target && target.antagonist === "edi") return "edi-character";
    if ("antagonist" in target && target.antagonist === "sali") return "sali-character";
    if ("emri" in target) return "person";
    if ("titull" in target) return "dokument";
    return "shenje";
  }

  private targetTitle(target: CollectibleTarget) {
    if ("slogan" in target) return target.slogan;
    if ("titull" in target) return target.titull;
    return `${target.emri}\n${target.thirrje}`;
  }

  private targetReveal(target: CollectibleTarget) {
    return target.eVerteta;
  }

  private addLabel(
    sprite: MovingSprite,
    text: string,
    offsetY: number,
    width: number,
    centered = false,
  ) {
    const label = this.add
      .text(sprite.x, sprite.y + offsetY, text, {
        align: "center",
        color: centered ? "#ffffff" : "#263238",
        backgroundColor: centered ? undefined : "rgba(255,255,255,0.76)",
        fixedWidth: width,
        fontFamily: "Arial",
        fontSize: centered ? "10px" : "9px",
        fontStyle: "bold",
        padding: centered ? undefined : { x: 3, y: 2 },
        wordWrap: { width: width - 8 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_LABEL);

    this.labels.set(sprite, { label, offsetY });
    return label;
  }

  private playerX() {
    return Phaser.Math.Clamp(this.scale.width * PLAYER_X_RATIO, 68, 112);
  }

  private playerGroundY() {
    return this.groundTop - PLAYER_DISPLAY_HEIGHT / 2 + 4;
  }

  private emitDust(x: number, y: number, count = 4) {
    for (let i = 0; i < count; i++) {
      const p = this.add.image(
        x + Phaser.Math.Between(-8, 8),
        y + Phaser.Math.Between(-3, 3),
        "dust-particle",
      );
      p.setDepth(DEPTH_PARTICLES).setScale(Phaser.Math.FloatBetween(0.6, 1.2));

      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-24, -4),
        y: p.y - Phaser.Math.Between(6, 18),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(250, 400),
        ease: "Cubic.easeOut",
        onComplete: () => p.destroy(),
      });
    }
  }

  private emitFeathers(x: number, y: number, count = 12) {
    for (let i = 0; i < count; i++) {
      const p = this.add.image(x, y, "feather-particle");
      p.setDepth(DEPTH_PARTICLES).setAngle(Phaser.Math.Between(0, 360));

      const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
      const speed = Phaser.Math.Between(90, 220);
      const targetX = x + Math.cos(angle) * speed;
      const targetY = y + Math.sin(angle) * speed + 30;

      this.tweens.add({
        targets: p,
        x: targetX,
        y: targetY,
        angle: p.angle + Phaser.Math.Between(-180, 180),
        alpha: 0,
        scale: 0.4,
        duration: Phaser.Math.Between(500, 850),
        ease: "Quad.easeOut",
        onComplete: () => p.destroy(),
      });
    }
  }

  private emitSparkles(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) {
      const p = this.add.image(x, y, "sparkle-particle");
      p.setDepth(DEPTH_PARTICLES);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(20, 60);

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(350, 600),
        ease: "Cubic.easeOut",
        onComplete: () => p.destroy(),
      });
    }
  }

  private floatText(x: number, y: number, text: string, color = "#ffffff") {
    const label = this.add
      .text(x, y, text, {
        color,
        fontFamily: "Arial",
        fontSize: "18px",
        fontStyle: "900",
        stroke: "#10131d",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_LABEL);

    this.tweens.add({
      targets: label,
      scaleX: 1.3,
      scaleY: 1.3,
      y: label.y - 32,
      duration: 180,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: label,
          alpha: 0,
          y: label.y - 16,
          duration: 350,
          onComplete: () => label.destroy(),
        });
      },
    });
  }

  private addBanner(message: string) {
    const banner = this.add
      .text(this.scale.width / 2, Math.max(76, this.scale.height * 0.18), message, {
        align: "center",
        backgroundColor: "#10131d",
        color: "#ffffff",
        fixedWidth: Math.min(320, this.scale.width - 36),
        fontFamily: "Arial",
        fontSize: "17px",
        fontStyle: "bold",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_BANNER);

    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 950,
      duration: 450,
      onComplete: () => banner.destroy(),
    });
  }

  private emitPaperShreds(x: number, y: number, count = 16) {
    const shredKeys = ["shred-white", "shred-manila", "shred-red"];
    for (let i = 0; i < count; i++) {
      const key = Phaser.Utils.Array.GetRandom(shredKeys);
      const p = this.add.image(x, y, key);
      p.setDepth(DEPTH_PARTICLES);

      const angle = Phaser.Math.FloatBetween(-Math.PI * 0.85, -Math.PI * 0.15);
      const speed = Phaser.Math.Between(130, 280);
      const targetX = x + Math.cos(angle) * speed + Phaser.Math.Between(-30, 30);
      const targetY = y + Math.sin(angle) * speed + Phaser.Math.Between(20, 90);

      this.tweens.add({
        targets: p,
        x: targetX,
        y: targetY,
        angle: p.angle + Phaser.Math.Between(-360, 360),
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(450, 750),
        ease: "Quad.easeOut",
        onComplete: () => p.destroy(),
      });
    }
  }

  private spawnPrisonCage(x: number, y: number, antagonist: "edi" | "sali") {
    const cage = this.add.image(x, y - 40, "prison-cage");
    cage.setDepth(DEPTH_REWARD_FX + 2);
    cage.setScale(1.15);
    cage.setAlpha(0.75);

    const charSprite = this.add.image(x, y, antagonist === "edi" ? "edi-character" : "sali-character");
    charSprite.setDisplaySize(40, 60);
    charSprite.setDepth(DEPTH_REWARD_FX + 1);

    // Cage slam down animation
    this.tweens.add({
      targets: cage,
      y: y,
      scaleX: 1,
      scaleY: 1,
      alpha: 0.9,
      duration: 80,
      ease: "Back.easeOut",
      onComplete: () => {
        // Subtle micro-shake so runner visibility is not blurred
        this.cameras.main.shake(40, 0.003);
        // Move backwards with world and drop comically off-screen quickly
        this.tweens.add({
          targets: [cage, charSprite],
          x: x - 120,
          y: this.scale.height + 80,
          angle: Phaser.Math.Between(-15, 15),
          alpha: 0,
          delay: 80,
          duration: 300,
          ease: "Cubic.easeIn",
          onComplete: () => {
            cage.destroy();
            charSprite.destroy();
          },
        });
      },
    });
  }

  private slamRubberStamp(x: number, y: number, customText?: string) {
    const stamps = [
      "RNBNB!",
      "RAMA N'BURG!",
      "BERISHA N'BURG!",
      "TË GJITHË N'BURG!",
      "ZEQINE SHKO N'SHKOLLË!",
      "3 MILIONË JEMI NE!",
      "TI NUK DI TË NUMËROSH!",
      "GËNJESHTËR!",
      "FASADË TOTAL!",
    ];
    const text = customText || Phaser.Utils.Array.GetRandom(stamps);
    const tilt = Phaser.Math.Between(-8, 8);
    const clampedX = Phaser.Math.Clamp(x, 140, this.scale.width - 140);
    // Position up high in the sky to never cover running corridors
    const stampY = Math.min(y - 65, this.groundTop - 110);

    const stamp = this.add
      .text(clampedX, stampY, `[ ${text} ]`, {
        color: "#ff2a4b",
        fontFamily: "Outfit, Arial Black, sans-serif",
        fontSize: "14px",
        fontStyle: "900",
        stroke: "#ffffff",
        strokeThickness: 2.5,
        backgroundColor: "rgba(16, 19, 29, 0.82)",
        padding: { x: 7, y: 3 },
      })
      .setOrigin(0.5)
      .setAngle(tilt)
      .setScale(1.8)
      .setAlpha(0)
      .setDepth(DEPTH_LABEL);

    // Snappy rubber-stamp slam
    this.tweens.add({
      targets: stamp,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 75,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: stamp,
          alpha: 0,
          y: stamp.y - 18,
          delay: 220,
          duration: 220,
          ease: "Quad.easeIn",
          onComplete: () => stamp.destroy(),
        });
      },
    });
  }

  private showBreakingNews(headline: string) {
    const banner = this.add
      .text(this.scale.width / 2, Math.max(54, this.scale.height * 0.12), headline, {
        align: "center",
        backgroundColor: "#ffd23f",
        color: "#10131d",
        fixedWidth: Math.min(390, this.scale.width - 24),
        fontFamily: "Outfit, sans-serif",
        fontSize: "12px",
        fontStyle: "900",
        padding: { x: 10, y: 6 },
        wordWrap: { width: Math.min(370, this.scale.width - 44) },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_BANNER + 5)
      .setAlpha(0)
      .setScale(0.9);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: banner.y - 15,
          delay: 2400,
          duration: 400,
          ease: "Quad.easeIn",
          onComplete: () => banner.destroy(),
        });
      },
    });
  }

  private updateStats(nextStats: Partial<GameStats>) {
    const combined = { ...this.stats, ...nextStats };
    const progress = Phaser.Math.Clamp(
      combined.exposure / this.level.targetExposure,
      0,
      1,
    );
    this.stats = {
      ...combined,
      progress,
    };
    this.callbacks.onStatsChange(this.stats);
  }
}

export function createGame(parent: HTMLElement, levelId: string, callbacks: GameCallbacks) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || window.innerWidth,
    height: parent.clientHeight || window.innerHeight,
    roundPixels: true,
    render: {
      pixelArt: false,
      antialias: true,
      powerPreference: "high-performance",
      desynchronized: true,
      preserveDrawingBuffer: true,
    },
    fps: {
      target: 60,
      min: 30,
      forceSetTimeOut: false,
      smoothStep: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 2,
      touch: {
        capture: true,
      },
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scene: new RunnerScene(levelId, callbacks),
  });
}

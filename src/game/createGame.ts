import Phaser from "phaser";
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

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;
const PLAYER_X_RATIO = 0.18;
const PLAYER_DISPLAY_WIDTH = 46;
const PLAYER_DISPLAY_HEIGHT = 66;
const GROUND_HEIGHT = 72;
const INVULNERABLE_MS = 650;
const SPEED_RAMP_RATE = 0.018;
const SPEED_RAMP_MAX = 1.6;
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
const DEPTH_PARTICLES = 25;
const DEPTH_OBSTACLE = 30;
const DEPTH_COLLECTIBLE = 34;
const DEPTH_PLAYER = 42;
const DEPTH_LABEL = 48;
const DEPTH_BANNER = 60;

type MovingSprite = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
type CollectibleTarget = ZbulimDefinition | PolitikanDefinition | DokumentDefinition;

type LabelBinding = {
  label: Phaser.GameObjects.Text;
  offsetY: number;
};

type ObstacleCategory = "ground_low" | "ground_med" | "ground_tall" | "air";

function createInitialStats(level: LevelDefinition): GameStats {
  return {
    levelId: level.id,
    levelName: level.name,
    score: 0,
    exposure: 0,
    lives: 1,
    combo: 1,
    status: "ready",
    message: level.intro,
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
  private stats!: GameStats;

  private readonly handleCommand = (event: Event) => {
    const command = (event as CustomEvent<GameCommand>).detail;

    if (command === "start") this.requestJump();
    if (command === "pause") this.togglePause();
    if (command === "restart") this.resetRound("playing");
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
    this.obstacles = this.physics.add.group();
    this.collectibles = this.physics.add.group();

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

    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
    ]);

    this.input.on("pointerdown", () => this.requestJump());
    this.input.on("pointerup", () => this.releaseJump());
    window.addEventListener(GAME_COMMAND_EVENT, this.handleCommand);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(GAME_COMMAND_EVENT, this.handleCommand);
    });

    this.physics.add.overlap(this.player, this.obstacles, (_, obstacle) => {
      this.takeHit(obstacle as MovingSprite);
    });
    this.physics.add.overlap(this.player, this.collectibles, (_, collectible) => {
      this.collectTarget(collectible as MovingSprite);
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.handleResize());
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
      this.animateRun(time);
      this.player.setAngle(0);
    } else {
      this.player.setTexture("flamingo-a");
      const vy = this.player.body.velocity.y;
      // Ascending: tilt upwards (-12°), Descending: tilt forward (+18°)
      const targetAngle = Phaser.Math.Clamp(vy * 0.032, -14, 22);
      this.player.setAngle(targetAngle);
    }

    // Gentle hover animation for air hazards
    this.animateAirHazards(time);

    this.cleanupObjects();
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
          const hoverOffset = Math.sin((time + sprite.x * 2) * 0.0045) * 6;
          sprite.y = baseY + hoverOffset;
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
    this.jumpBufferedUntil = this.time.now + JUMP_BUFFER_MS;
    this.startOrJump();
  }

  private tryBufferedJump() {
    if (this.stats.status !== "playing") return;
    if (this.jumpBufferedUntil < this.time.now) return;
    if (!this.canJump()) return;

    this.jumpBufferedUntil = 0;
    this.jumpStartedAt = this.time.now;
    this.player.body.allowGravity = true;
    this.player.setVelocityY(this.level.jumpVelocity);
    this.player.setTexture("flamingo-a");

    soundManager.playJump();
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
  }

  private releaseJump() {
    if (this.player.body.velocity.y >= 0) return;
    if (this.time.now - this.jumpStartedAt < JUMP_RELEASE_MIN_MS) return;

    this.player.setVelocityY(this.player.body.velocity.y * JUMP_CUT_MULTIPLIER);
  }

  // --- OBSTACLE DIRECTOR (Random & Varied Pacing) ---
  private scheduleObstacleDirector(overrideDelay?: number) {
    if (this.stats.status !== "playing") return;

    let nextDelay = overrideDelay;
    if (!nextDelay) {
      const baseDelay = this.level.obstacleDelayMs / this.currentSpeedMultiplier();
      const jitter = Phaser.Math.Between(-220, 260);
      nextDelay = Phaser.Math.Clamp(baseDelay + jitter, 780, 1600);
    }

    // Scale delay by mobile viewport width and speed multiplier for fairness
    const widthScale = Phaser.Math.Clamp(this.scale.width / 420, 0.85, 1.15);
    const adjustedDelay = nextDelay * widthScale;

    this.spawnTimer = this.time.delayedCall(adjustedDelay, () => {
      this.directorSpawnNext();
      this.scheduleObstacleDirector();
    });
  }

  private directorSpawnNext() {
    if (this.stats.status !== "playing") return;

    const elapsedSeconds = (this.time.now - this.roundStartAt) / 1000;
    const canSpawnAir = this.lastSpawnCategory !== "ground_tall" && elapsedSeconds > 7;
    const airChance = elapsedSeconds < 7 ? 0 : 0.28;

    const roll = Math.random();

    if (canSpawnAir && roll < airChance) {
      this.spawnAirHazard();
    } else {
      // Randomly pick ground obstacle category
      const groundRoll = Math.random();
      if (groundRoll < 0.42) {
        this.spawnGroundObstacle("ground_low");
      } else if (groundRoll < 0.74) {
        this.spawnGroundObstacle("ground_med");
      } else {
        this.spawnGroundObstacle("ground_tall");
      }
    }

    // 38% chance to spawn a bonus collectible in a safe trajectory
    if (Math.random() < 0.38) {
      this.spawnCollectibleSafeArc();
    }
  }

  private spawnGroundObstacle(category: "ground_low" | "ground_med" | "ground_tall") {
    if (this.stats.status !== "playing") return;

    const obstacle = this.nextGroundObstacle(category);
    const speed = this.currentSpeed();
    const x = this.scale.width + Phaser.Math.Between(30, 70);

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

    // Forgiving collision hitboxes
    if (isMinistry) {
      sprite.body.setSize(width * 0.46, height * 0.54).setOffset(width * 0.27, height * 0.4);
    } else if (isPodium) {
      sprite.body.setSize(width * 0.48, height * 0.52).setOffset(width * 0.26, height * 0.4);
    } else {
      sprite.body.setSize(width * 0.48, height * 0.42).setOffset(width * 0.26, height * 0.48);
    }

    sprite.setVelocityX(-speed);
    sprite.setDepth(DEPTH_OBSTACLE);
    sprite.setData("label", obstacle.emri);
    sprite.setData("hazardType", "ground");
    this.lastSpawnCategory = category;
  }

  private spawnAirHazard() {
    if (this.stats.status !== "playing") return;

    const hazard = this.nextAirHazard();
    const speed = this.currentSpeed();
    const x = this.scale.width + Phaser.Math.Between(50, 90);
    // Altitude randomized: either high or mid
    const y = this.groundTop - Phaser.Math.Between(108, 148);

    const sprite = this.physics.add.image(x, y, hazard.texture) as MovingSprite;
    this.obstacles.add(sprite);

    const isMic = hazard.lloj === "mikrofon";
    const width = isMic ? 38 : 54;
    const height = isMic ? 52 : 36;

    sprite.setDisplaySize(width, height);
    sprite.setActive(true).setVisible(true).setAlpha(1);
    sprite.body.allowGravity = false;

    // Forgiving hitbox for air hazards
    sprite.body.setSize(width * 0.5, height * 0.5).setOffset(width * 0.25, height * 0.25);
    sprite.setVelocityX(-speed * 1.04);
    sprite.setDepth(DEPTH_OBSTACLE);
    sprite.setData("label", hazard.emri);
    sprite.setData("hazardType", "air");
    sprite.setData("baseY", y);

    this.lastSpawnCategory = "air";
  }

  private spawnCollectibleSafeArc() {
    if (this.stats.status !== "playing") return;

    const target = this.nextCollectibleTarget();
    const texture = this.collectibleTexture(target);
    const speed = this.currentSpeed();
    const x = this.scale.width + Phaser.Math.Between(180, 260);
    const y = this.groundTop - Phaser.Math.Between(92, 136);

    const sprite = this.physics.add.image(x, y, texture) as MovingSprite;
    this.collectibles.add(sprite);

    sprite.body.allowGravity = false;
    sprite.setVelocityX(-speed);
    sprite.setDepth(DEPTH_COLLECTIBLE);
    sprite.setData("target", target);
    sprite.setData("collected", false);
    sprite.setData("collectedTexture", texture === "shenje" ? "shenje-zbuluar" : texture);

    if (texture === "person") {
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
  }

  private collectTarget(collectible: MovingSprite) {
    if (collectible.getData("collected")) return;

    const target = collectible.getData("target") as CollectibleTarget;
    collectible.setData("collected", true);
    collectible.body.enable = false;

    // Cleanly animate and destroy the attached label so it never remains frozen
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

    // Cleanly animate and destroy the collectible sprite
    this.tweens.add({
      targets: collectible,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0,
      y: collectible.y - 20,
      duration: 280,
      ease: "Quad.easeOut",
      onComplete: () => collectible.destroy(),
    });

    const combo = Math.min(this.stats.combo + 1, 5);
    const gained = target.pike * this.stats.combo;
    const score = this.stats.score + gained;
    const exposure = this.stats.exposure + 1;

    // Audio & particle feedback
    soundManager.playCollect(this.stats.combo);
    this.emitSparkles(collectible.x, collectible.y, 8);
    this.floatText(collectible.x, collectible.y - 28, `+${gained}`, combo >= 3 ? "#ffd23f" : "#ffffff");

    this.updateStats({
      score,
      exposure,
      combo,
      message: exposure >= this.level.targetExposure ? "Faza u kalua!" : "Zbulim i ri!",
    });

    if (exposure >= this.level.targetExposure) {
      this.winRound();
    }
  }

  private takeHit(obstacle?: MovingSprite) {
    if (this.time.now < this.invulnerableUntil || this.stats.status !== "playing") return;

    this.invulnerableUntil = this.time.now + INVULNERABLE_MS;
    const obstacleLabel = obstacle?.getData("label") as string | undefined;

    // Audio and haptics
    soundManager.playCrash();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([40, 30, 90]);
    }

    // Burst feathers
    this.emitFeathers(this.player.x, this.player.y, 14);

    // Hit-stop: brief 90ms micro-pause for visceral impact punch
    this.isFrozen = true;
    this.player.setTint(0xff4f8b);
    this.cameras.main.shake(160, 0.015);

    this.time.delayedCall(90, () => {
      this.isFrozen = false;
      this.updateStats({
        lives: 0,
        combo: 1,
        message: obstacleLabel ? `U perplase me ${obstacleLabel}` : "U perplase",
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
    return Phaser.Math.Clamp(1 + survivedSeconds * SPEED_RAMP_RATE, 1, SPEED_RAMP_MAX);
  }

  private currentSpeed() {
    return this.level.speed * this.currentSpeedMultiplier();
  }

  private winRound() {
    if (this.stats.status === "won") return;

    soundManager.playWin();
    this.emitSparkles(this.scale.width / 2, this.scale.height / 2, 25);
    this.stopMotion();
    this.addBanner("Faza u kalua!");
    this.updateStats({ status: "won", message: "Prek per te vazhduar" });
    this.callbacks.onLevelComplete(this.level.id, this.stats.score);
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
    this.updateStats({ status: "lost", message: "Prek per ta rinisur" });
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
      this.updateStats({ status: "paused", message: "Pauze" });
      this.addBanner("Pauze");
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
  }

  private cleanupObjects() {
    this.cleanupGroup(this.obstacles, false);
    this.cleanupGroup(this.collectibles, true);

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
    group.getChildren().forEach((child) => {
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
    }

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
    if (roll < 0.28) return this.nextDocument();
    if (roll < 0.46) return this.nextPolitikan();
    return this.nextZbulim();
  }

  private nextZbulim() {
    const list = this.level.zbulime;
    return list[Phaser.Math.Between(0, list.length - 1)];
  }

  private nextPolitikan() {
    const list = this.level.politikanet;
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

  private collectibleTexture(target: CollectibleTarget) {
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

  private updateStats(nextStats: Partial<GameStats>) {
    this.stats = { ...this.stats, ...nextStats };
    this.callbacks.onStatsChange(this.stats);
  }
}

export function createGame(parent: HTMLElement, levelId: string, callbacks: GameCallbacks) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || window.innerWidth,
    height: parent.clientHeight || window.innerHeight,
    pixelArt: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
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

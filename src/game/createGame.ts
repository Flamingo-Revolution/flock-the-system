import Phaser from "phaser";
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
const SPEED_RAMP_RATE = 0.024;
const SPEED_RAMP_MAX = 1.75;
const DISTANCE_TICK_MS = 120;
const RUN_FRAME_MS = 130;
const FIRST_OBSTACLE_DELAY_MS = 220;
const FIRST_OBSTACLE_EDGE_OFFSET = 28;
const JUMP_BUFFER_MS = 130;
const COYOTE_TIME_MS = 90;
const JUMP_RELEASE_MIN_MS = 80;
const JUMP_CUT_MULTIPLIER = 0.52;
const AIR_HAZARD_UNLOCK_SECONDS = 13;
const DEPTH_BACKGROUND_BACK = -40;
const DEPTH_BACKGROUND_FRONT = -30;
const DEPTH_GROUND = 5;
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
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private cityBack!: Phaser.GameObjects.TileSprite;
  private cityFront!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;
  private firstObstacleTimer?: Phaser.Time.TimerEvent;
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
    this.physics.world.gravity.y = this.level.gravityY;
    this.cameras.main.setBackgroundColor(this.level.skyColor);
    this.groundTop = this.scale.height - GROUND_HEIGHT;

    this.drawWorld();
    this.obstacles = this.physics.add.group();
    this.collectibles = this.physics.add.group();

    this.player = this.physics.add.sprite(this.playerX(), this.playerGroundY(), "flamingo-a");
    this.player.setDepth(DEPTH_PLAYER);
    this.player.setDisplaySize(PLAYER_DISPLAY_WIDTH, PLAYER_DISPLAY_HEIGHT);
    this.player.setSize(24, 38).setOffset(11, 22);
    this.player.body.allowGravity = false;

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

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

  update(time: number, delta: number) {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.resetRound("playing");
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.togglePause();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.requestJump();
    }

    if (Phaser.Input.Keyboard.JustUp(this.spaceKey) || Phaser.Input.Keyboard.JustUp(this.enterKey)) {
      this.releaseJump();
    }

    this.player.x = this.playerX();
    this.snapPlayerToGround();
    if (this.isGrounded()) this.lastGroundedAt = this.time.now;

    if (this.stats.status !== "playing") {
      this.player.setTexture("flamingo-a");
      return;
    }

    this.tryBufferedJump();

    const seconds = delta / 1000;
    const speed = this.currentSpeed();
    this.cityBack.tilePositionX += speed * 0.1 * seconds;
    this.cityFront.tilePositionX += speed * 0.28 * seconds;
    this.ground.tilePositionX += speed * seconds;

    if (this.isGrounded()) {
      this.animateRun(time);
    } else {
      this.player.setTexture("flamingo-a");
    }

    this.cleanupObjects();
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
    this.player.body.allowGravity = true;
    this.updateStats({ status: "playing", message: this.level.objective });
    this.firstObstacleTimer = this.time.delayedCall(FIRST_OBSTACLE_DELAY_MS, () => {
      this.spawnGroundObstacle(this.scale.width + FIRST_OBSTACLE_EDGE_OFFSET);
    });
    this.scheduleNextObstacle(1100);
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

    this.tweens.add({
      targets: this.player,
      scaleX: 0.96,
      scaleY: 1.06,
      duration: 85,
      yoyo: true,
    });
  }

  private releaseJump() {
    if (this.player.body.velocity.y >= 0) return;
    if (this.time.now - this.jumpStartedAt < JUMP_RELEASE_MIN_MS) return;

    this.player.setVelocityY(this.player.body.velocity.y * JUMP_CUT_MULTIPLIER);
  }

  private scheduleNextObstacle(overrideDelay?: number) {
    const base = this.level.obstacleDelayMs / this.currentSpeedMultiplier();
    const jitter = Phaser.Math.Between(-170, 240);
    const delay = overrideDelay ?? Phaser.Math.Clamp(base + jitter, 760, 1500);

    this.spawnTimer = this.time.delayedCall(delay, () => {
      this.spawnRunnerObject();
      this.scheduleNextObstacle();
    });
  }

  private spawnRunnerObject() {
    if (this.stats.status !== "playing") return;

    const survivedSeconds = (this.time.now - this.roundStartAt) / 1000;
    const airChance =
      survivedSeconds < AIR_HAZARD_UNLOCK_SECONDS
        ? 0
        : Phaser.Math.Clamp((survivedSeconds - AIR_HAZARD_UNLOCK_SECONDS) * 0.02, 0.08, 0.24);
    const roll = Math.random();
    if (roll > airChance) {
      this.spawnGroundObstacle();
    } else {
      this.spawnAirHazard();
    }

    if (Math.random() < 0.28) {
      this.spawnCollectible();
    }
  }

  private spawnGroundObstacle(xOverride?: number) {
    if (this.stats.status !== "playing") return;

    const obstacle = this.nextGroundObstacle();
    const speed = this.currentSpeed();
    const x = xOverride ?? this.scale.width + Phaser.Math.Between(42, 86);
    const isMinistry = obstacle.lloj === "ministri";
    const isPodium = obstacle.lloj === "podium";
    const width = isMinistry ? 68 : isPodium ? 72 : 82;
    const height = isMinistry ? 82 : isPodium ? 70 : 42;
    const sprite = this.physics.add.image(x, this.groundTop - height / 2 + 3, obstacle.texture) as MovingSprite;
    this.obstacles.add(sprite);

    sprite.setDisplaySize(width, height);
    sprite.setActive(true).setVisible(true).setAlpha(1);
    sprite.body.allowGravity = false;
    sprite.body.setSize(width * 0.58, height * 0.68);
    sprite.setVelocityX(-speed);
    sprite.setDepth(DEPTH_OBSTACLE);
    sprite.setData("label", obstacle.emri);
  }

  private spawnAirHazard(xOverride?: number) {
    if (this.stats.status !== "playing") return;

    const hazard = this.nextAirHazard();
    const speed = this.currentSpeed();
    const x = xOverride ?? this.scale.width + Phaser.Math.Between(72, 150);
    const y = this.groundTop - Phaser.Math.Between(92, 145);
    const sprite = this.physics.add.image(x, y, hazard.texture) as MovingSprite;
    this.obstacles.add(sprite);
    const size = hazard.lloj === "mikrofon" ? { width: 44, height: 58 } : { width: 62, height: 42 };

    sprite.setDisplaySize(size.width, size.height);
    sprite.setActive(true).setVisible(true).setAlpha(1);
    sprite.body.allowGravity = false;
    sprite.body.setSize(size.width * 0.72, size.height * 0.72);
    sprite.setVelocityX(-speed * 1.02);
    sprite.setDepth(DEPTH_OBSTACLE);
    sprite.setData("label", hazard.emri);
  }

  private spawnCollectible() {
    if (this.stats.status !== "playing") return;

    const target = this.nextCollectibleTarget();
    const texture = this.collectibleTexture(target);
    const speed = this.currentSpeed();
    const x = this.scale.width + Phaser.Math.Between(170, 260);
    const y = this.groundTop - Phaser.Math.Between(84, 132);
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
    collectible.setTexture(collectible.getData("collectedTexture") as string);
    collectible.setTint(0xf9c74f);

    const binding = this.labels.get(collectible);
    binding?.label.setText(this.targetReveal(target)).setColor("#f9c74f");

    const combo = Math.min(this.stats.combo + 1, 5);
    const gained = target.pike * this.stats.combo;
    const score = this.stats.score + gained;
    const exposure = this.stats.exposure + 1;
    this.floatText(collectible.x, collectible.y - 30, `+${gained}`);
    this.updateStats({
      score,
      exposure,
      combo,
      message: exposure >= this.level.targetExposure ? "Faza u kalua" : "Zbulim i ri",
    });

    if (exposure >= this.level.targetExposure) {
      this.winRound();
    }
  }

  private takeHit(obstacle?: MovingSprite) {
    if (this.time.now < this.invulnerableUntil || this.stats.status !== "playing") return;

    this.invulnerableUntil = this.time.now + INVULNERABLE_MS;
    this.cameras.main.shake(110, 0.01);
    this.player.setTint(0xff8aa0);
    const obstacleLabel = obstacle?.getData("label") as string | undefined;
    this.updateStats({
      lives: 0,
      combo: 1,
      message: obstacleLabel ? `U perplase me ${obstacleLabel}` : "U perplase",
    });
    this.loseRound();
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

    this.stopMotion();
    this.addBanner("Faza u kalua");
    this.updateStats({ status: "won", message: "Prek per te vrapuar prape" });
    this.callbacks.onLevelComplete(this.level.id, this.stats.score);
  }

  private loseRound() {
    this.stopMotion();
    this.addBanner("Fund loje");
    this.updateStats({ status: "lost", message: "Prek per ta rinisur" });
  }

  private resetRound(status: GameStats["status"] = "ready") {
    const shouldStart = status === "playing";

    this.stopMotion();
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
      if (this.firstObstacleTimer) this.firstObstacleTimer.paused = true;
      if (this.spawnTimer) this.spawnTimer.paused = true;
      if (this.scoreTimer) this.scoreTimer.paused = true;
      this.updateStats({ status: "paused", message: "Pauze" });
      this.addBanner("Pauze");
      return;
    }

    if (this.stats.status === "paused") {
      this.physics.world.resume();
      if (this.firstObstacleTimer) this.firstObstacleTimer.paused = false;
      if (this.spawnTimer) this.spawnTimer.paused = false;
      if (this.scoreTimer) this.scoreTimer.paused = false;
      this.updateStats({ status: "playing", message: this.level.objective });
    }
  }

  private stopMotion() {
    this.firstObstacleTimer?.destroy();
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
    this.nextRunFrameAt = time + RUN_FRAME_MS;
  }

  private nextCollectibleTarget(): CollectibleTarget {
    const roll = Math.random();
    if (roll < 0.28) return this.nextDocument();
    if (roll < 0.46) return this.nextPolitikan();
    return this.nextZbulim();
  }

  private nextZbulim() {
    const zbulim = this.level.zbulime[this.zbulimIndex % this.level.zbulime.length];
    this.zbulimIndex += 1;
    return zbulim;
  }

  private nextPolitikan() {
    const politikan = this.level.politikanet[this.politikanIndex % this.level.politikanet.length];
    this.politikanIndex += 1;
    return politikan;
  }

  private nextGroundObstacle() {
    const obstacle = this.level.pengesaToke[this.groundIndex % this.level.pengesaToke.length];
    this.groundIndex += 1;
    return obstacle;
  }

  private nextAirHazard() {
    const hazard = this.level.rreziqeAjri[this.airIndex % this.level.rreziqeAjri.length];
    this.airIndex += 1;
    return hazard;
  }

  private nextDocument() {
    const document = this.level.dokumente[this.documentIndex % this.level.dokumente.length];
    this.documentIndex += 1;
    return document;
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

  private floatText(x: number, y: number, text: string) {
    const label = this.add
      .text(x, y, text, {
        color: "#263238",
        fontFamily: "Arial",
        fontSize: "16px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_LABEL);

    this.tweens.add({
      targets: label,
      alpha: 0,
      y: label.y - 24,
      duration: 700,
      onComplete: () => label.destroy(),
    });
  }

  private addBanner(message: string) {
    const banner = this.add
      .text(this.scale.width / 2, Math.max(76, this.scale.height * 0.18), message, {
        align: "center",
        backgroundColor: "#263238",
        color: "#ffffff",
        fixedWidth: Math.min(330, this.scale.width - 36),
        fontFamily: "Arial",
        fontSize: "18px",
        fontStyle: "bold",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_BANNER);

    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 950,
      duration: 500,
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

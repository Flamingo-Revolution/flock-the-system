import Phaser from "phaser";
import {
  GAME_COMMAND_EVENT,
  type GameCallbacks,
  type GameCommand,
  type GameStats,
} from "./events";
import {
  getLevel,
  type LevelDefinition,
  type PolitikanDefinition,
  type ZbulimDefinition,
} from "./levels";

const PLAYER_X_RATIO = 0.24;
const GROUND_HEIGHT = 72;
const GATE_WIDTH = 76;
const INVULNERABLE_MS = 900;
const SPEED_RAMP_RATE = 0.018;
const SPEED_RAMP_MAX = 1.35;
const DISTANCE_TICK_MS = 180;

type MovingSprite = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

type Gate = {
  top: MovingSprite;
  bottom: MovingSprite;
  collectible: MovingSprite;
  collectibleLabel: Phaser.GameObjects.Text;
  ministryLabel: Phaser.GameObjects.Text;
};

function createInitialStats(level: LevelDefinition): GameStats {
  return {
    levelId: level.id,
    levelName: level.name,
    score: 0,
    exposure: 0,
    lives: 3,
    combo: 1,
    status: "ready",
    message: level.intro,
  };
}

class FluturimScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private hazards!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private cityBack!: Phaser.GameObjects.TileSprite;
  private cityFront!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private scoreTimer?: Phaser.Time.TimerEvent;
  private gates: Gate[] = [];
  private zbulimIndex = 0;
  private politikanIndex = 0;
  private ministriIndex = 0;
  private invulnerableUntil = 0;
  private roundStartAt = 0;
  private flapFrame = 0;
  private groundY = 0;
  private stats!: GameStats;

  private readonly handleCommand = (event: Event) => {
    const command = (event as CustomEvent<GameCommand>).detail;

    if (command === "start") this.startOrFlap();
    if (command === "pause") this.togglePause();
    if (command === "restart") this.resetRound("playing");
  };

  constructor(
    private readonly levelId: string,
    private readonly callbacks: GameCallbacks,
  ) {
    super("fluturim");
  }

  init() {
    this.level = getLevel(this.levelId);
    this.stats = createInitialStats(this.level);
  }

  create() {
    this.createTextures();
    this.physics.world.gravity.y = this.level.gravityY;
    this.cameras.main.setBackgroundColor(this.level.skyColor);
    this.groundY = this.scale.height - GROUND_HEIGHT;

    this.drawMovingScene();
    this.hazards = this.physics.add.group();
    this.collectibles = this.physics.add.group();

    this.player = this.physics.add.sprite(this.playerX(), this.scale.height * 0.42, "flamingo-a");
    this.player.setDepth(20);
    this.player.setSize(24, 34).setOffset(11, 18);
    this.player.body.allowGravity = false;

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.input.on("pointerdown", () => this.startOrFlap());
    window.addEventListener(GAME_COMMAND_EVENT, this.handleCommand);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(GAME_COMMAND_EVENT, this.handleCommand);
    });

    this.physics.add.overlap(this.player, this.hazards, () => this.takeHit());
    this.physics.add.overlap(this.player, this.collectibles, (_, collectible) => {
      this.collectTarget(collectible as MovingSprite);
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.handleResize());
    this.addBanner(this.level.intro);
    this.callbacks.onStatsChange(this.stats);
  }

  update(_time: number, delta: number) {
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
      Phaser.Input.Keyboard.JustDown(this.enterKey)
    ) {
      this.startOrFlap();
    }

    this.player.x = this.playerX();

    if (this.stats.status !== "playing") {
      this.player.setAngle(Phaser.Math.Linear(this.player.angle, 0, 0.08));
      return;
    }

    const seconds = delta / 1000;
    const speed = this.currentSpeed();
    this.cityBack.tilePositionX += speed * 0.12 * seconds;
    this.cityFront.tilePositionX += speed * 0.34 * seconds;
    this.ground.tilePositionX += speed * seconds;
    this.player.setAngle(Phaser.Math.Clamp(this.player.body.velocity.y / 16, -24, 44));

    if (this.player.y < 8 || this.player.y > this.groundY - 6) {
      this.takeHit();
    }

    this.cleanupGates();
  }

  private startOrFlap() {
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
      this.flap();
    }
  }

  private startRound() {
    this.roundStartAt = this.time.now;
    this.player.body.allowGravity = true;
    this.updateStats({ status: "playing", message: this.level.objective });
    this.scheduleNextGate(500);
    this.scoreTimer = this.time.addEvent({
      delay: DISTANCE_TICK_MS,
      loop: true,
      callback: () => this.tickDistanceScore(),
    });
  }

  private flap() {
    this.player.setVelocityY(this.level.jumpVelocity);
    this.flapFrame = this.flapFrame === 0 ? 1 : 0;
    this.player.setTexture(this.flapFrame === 0 ? "flamingo-a" : "flamingo-b");

    this.tweens.add({
      targets: this.player,
      scaleX: 1.06,
      scaleY: 0.94,
      duration: 80,
      yoyo: true,
    });
  }

  private scheduleNextGate(overrideDelay?: number) {
    const base = this.level.obstacleDelayMs / this.currentSpeedMultiplier();
    const jitter = Phaser.Math.Between(-80, 130);
    const delay = overrideDelay ?? Phaser.Math.Clamp(base + jitter, 980, 1680);
    this.spawnTimer = this.time.delayedCall(delay, () => {
      this.spawnGate();
      this.scheduleNextGate();
    });
  }

  private spawnGate() {
    if (this.stats.status !== "playing") return;

    const gap = Phaser.Math.Clamp(this.level.gateGap, 148, this.scale.height * 0.36);
    const topLimit = 74 + gap / 2;
    const bottomLimit = this.groundY - 36 - gap / 2;
    const centerY = Phaser.Math.Between(topLimit, Math.max(topLimit, bottomLimit));
    const topHeight = Math.max(28, centerY - gap / 2);
    const bottomY = centerY + gap / 2;
    const bottomHeight = Math.max(32, this.groundY - bottomY);
    const x = this.scale.width + GATE_WIDTH;
    const speed = this.currentSpeed();
    const ministry = this.nextMinistri();
    const target = Math.random() < 0.72 ? this.nextZbulim() : this.nextPolitikan();

    const top = this.physics.add.image(x, topHeight / 2, "pengese") as MovingSprite;
    this.setupGatePiece(top, topHeight, speed, true);

    const bottom = this.physics.add.image(x, bottomY + bottomHeight / 2, "pengese") as MovingSprite;
    this.setupGatePiece(bottom, bottomHeight, speed, false);

    const collectible = this.physics.add.image(x + 8, centerY, "shenje") as MovingSprite;
    collectible.setDisplaySize(118, 42);
    collectible.body.allowGravity = false;
    collectible.body.setSize(96, 26);
    collectible.setVelocityX(-speed);
    collectible.setDepth(12);
    collectible.setData("target", target);
    collectible.setData("collected", false);
    this.collectibles.add(collectible);

    const collectibleLabel = this.add
      .text(collectible.x, collectible.y, this.targetTitle(target), {
        align: "center",
        color: "#ffffff",
        fixedWidth: 104,
        fontFamily: "Arial",
        fontSize: "10px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(13);

    const ministryLabel = this.add
      .text(x, Math.max(24, topHeight + 10), ministry.emri, {
        align: "center",
        color: "#263238",
        backgroundColor: "rgba(255,255,255,0.72)",
        fixedWidth: 116,
        fontFamily: "Arial",
        fontSize: "10px",
        fontStyle: "bold",
        padding: { x: 3, y: 2 },
        wordWrap: { width: 108 },
      })
      .setOrigin(0.5, 0)
      .setDepth(11);

    this.gates.push({ top, bottom, collectible, collectibleLabel, ministryLabel });
  }

  private setupGatePiece(piece: MovingSprite, height: number, speed: number, flipY: boolean) {
    piece.setDisplaySize(GATE_WIDTH, height);
    piece.setFlipY(flipY);
    piece.body.allowGravity = false;
    piece.body.setSize(GATE_WIDTH - 18, height - 10);
    piece.setVelocityX(-speed);
    piece.setDepth(10);
    this.hazards.add(piece);
  }

  private collectTarget(collectible: MovingSprite) {
    if (collectible.getData("collected")) return;

    const target = collectible.getData("target") as ZbulimDefinition | PolitikanDefinition;
    collectible.setData("collected", true);
    collectible.body.enable = false;
    collectible.setTexture("shenje-zbuluar");

    const gate = this.gates.find((candidate) => candidate.collectible === collectible);
    gate?.collectibleLabel.setText(this.targetReveal(target)).setColor("#f9c74f");

    const combo = Math.min(this.stats.combo + 1, 5);
    const score = this.stats.score + target.pike * this.stats.combo;
    const exposure = this.stats.exposure + 1;
    this.floatText(collectible.x, collectible.y - 30, `+${target.pike * this.stats.combo}`);
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

  private takeHit() {
    if (this.time.now < this.invulnerableUntil || this.stats.status !== "playing") return;

    const lives = this.stats.lives - 1;
    this.invulnerableUntil = this.time.now + INVULNERABLE_MS;
    this.cameras.main.shake(120, 0.01);
    this.player.setTint(0xff8aa0);
    this.time.delayedCall(180, () => this.player.clearTint());

    if (lives <= 0) {
      this.updateStats({ lives, combo: 1, message: "U perplase" });
      this.loseRound();
      return;
    }

    this.player.setVelocityY(this.level.jumpVelocity * 0.78);
    this.updateStats({ lives, combo: 1, message: "Kujdes, edhe pak!" });
  }

  private tickDistanceScore() {
    if (this.stats.status !== "playing") return;
    this.updateStats({ score: this.stats.score + Math.round(this.currentSpeedMultiplier()) });
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
    this.updateStats({ status: "won", message: "Prek per te luajtur prape" });
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
    this.gates.forEach((gate) => {
      gate.top.destroy();
      gate.bottom.destroy();
      gate.collectible.destroy();
      gate.collectibleLabel.destroy();
      gate.ministryLabel.destroy();
    });
    this.gates = [];
    this.hazards.clear(true, true);
    this.collectibles.clear(true, true);
    this.zbulimIndex = 0;
    this.politikanIndex = 0;
    this.ministriIndex = 0;
    this.invulnerableUntil = 0;
    this.player.setPosition(this.playerX(), this.scale.height * 0.42);
    this.player.setVelocity(0, 0);
    this.player.setAngle(0);
    this.player.setScale(1, 1);
    this.player.clearTint();
    this.player.body.allowGravity = false;
    this.stats = createInitialStats(this.level);
    this.callbacks.onStatsChange(this.stats);

    if (shouldStart) {
      this.startRound();
      this.flap();
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
    this.gates.forEach((gate) => {
      gate.top.setVelocityX(0);
      gate.bottom.setVelocityX(0);
      gate.collectible.setVelocityX(0);
    });
  }

  private cleanupGates() {
    this.gates = this.gates.filter((gate) => {
      gate.collectibleLabel.setPosition(gate.collectible.x, gate.collectible.y);
      gate.ministryLabel.setX(gate.top.x);

      if (!gate.collectible.getData("collected") && gate.collectible.x < this.playerX() - 36) {
        gate.collectible.setData("collected", true);
        this.updateStats({ combo: 1, message: "Objektivi iku pa u zbuluar" });
      }

      if (gate.top.x > -GATE_WIDTH) return true;

      gate.top.destroy();
      gate.bottom.destroy();
      gate.collectible.destroy();
      gate.collectibleLabel.destroy();
      gate.ministryLabel.destroy();
      return false;
    });
  }

  private drawMovingScene() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.cityBack = this.add.tileSprite(0, height - 206, width, 180, "tirana-larg");
    this.cityBack.setOrigin(0, 0).setDepth(-40);

    this.cityFront = this.add.tileSprite(0, height - 154, width, 140, "tirana-afer");
    this.cityFront.setOrigin(0, 0).setDepth(-30);

    this.ground = this.add.tileSprite(0, height - GROUND_HEIGHT, width, GROUND_HEIGHT, "toke");
    this.ground.setOrigin(0, 0).setDepth(30);
  }

  private handleResize() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.groundY = height - GROUND_HEIGHT;
    this.player?.setX(this.playerX());
    this.cityBack.setSize(width, 180).setPosition(0, height - 206);
    this.cityFront.setSize(width, 140).setPosition(0, height - 154);
    this.ground.setSize(width, GROUND_HEIGHT).setPosition(0, height - GROUND_HEIGHT);
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

  private nextMinistri() {
    const ministri = this.level.ministrite[this.ministriIndex % this.level.ministrite.length];
    this.ministriIndex += 1;
    return ministri;
  }

  private targetTitle(target: ZbulimDefinition | PolitikanDefinition) {
    return "slogan" in target ? target.slogan : `${target.emri}\n${target.thirrje}`;
  }

  private targetReveal(target: ZbulimDefinition | PolitikanDefinition) {
    return target.eVerteta;
  }

  private playerX() {
    return Phaser.Math.Clamp(this.scale.width * PLAYER_X_RATIO, 76, 128);
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
      .setDepth(40);

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
      .setDepth(60);

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

  private createTextures() {
    this.drawFlamingoFrame("flamingo-a", false);
    this.drawFlamingoFrame("flamingo-b", true);

    const graphics = this.add.graphics();

    graphics.fillStyle(this.level.obstacleColor, 1);
    graphics.fillRoundedRect(0, 0, GATE_WIDTH, 460, 8);
    graphics.fillStyle(0xffffff, 0.18);
    graphics.fillRect(10, 0, 10, 460);
    graphics.fillStyle(0x263238, 0.25);
    for (let y = 16; y < 430; y += 46) {
      graphics.fillRoundedRect(12, y, GATE_WIDTH - 24, 20, 4);
    }
    graphics.generateTexture("pengese", GATE_WIDTH, 460);
    graphics.clear();

    graphics.fillStyle(0xd94d64, 1);
    graphics.fillRoundedRect(0, 0, 126, 44, 8);
    graphics.lineStyle(2, 0xffffff, 0.78);
    graphics.strokeRoundedRect(3, 3, 120, 38, 6);
    graphics.generateTexture("shenje", 126, 44);
    graphics.clear();

    graphics.fillStyle(0x263238, 1);
    graphics.fillRoundedRect(0, 0, 126, 44, 8);
    graphics.lineStyle(2, 0xf9c74f, 0.95);
    graphics.strokeRoundedRect(3, 3, 120, 38, 6);
    graphics.generateTexture("shenje-zbuluar", 126, 44);
    graphics.clear();

    this.drawTiranaSkyline(graphics, "tirana-larg", 920, 180, 0x5c7690, 0.6, true);
    this.drawTiranaSkyline(graphics, "tirana-afer", 920, 140, 0x141c2b, 0.94, false);

    graphics.fillStyle(this.level.groundColor, 1);
    graphics.fillRect(0, 0, 240, GROUND_HEIGHT);
    graphics.fillStyle(0x263238, 0.22);
    graphics.fillRect(0, 0, 240, 8);
    graphics.fillStyle(0xe9c46a, 0.95);
    for (let x = 16; x < 240; x += 62) {
      graphics.fillRoundedRect(x, 28, 38, 10, 4);
    }
    graphics.generateTexture("toke", 240, GROUND_HEIGHT);
    graphics.destroy();
  }

  private drawTiranaSkyline(
    graphics: Phaser.GameObjects.Graphics,
    key: string,
    width: number,
    height: number,
    color: number,
    alpha: number,
    distant: boolean,
  ) {
    graphics.clear();
    graphics.fillStyle(color, alpha);

    const baseY = height - 6;
    const scaleY = distant ? 0.72 : 1;
    const y = (value: number) => baseY - value * scaleY;

    graphics.fillRect(0, baseY, width, 4);
    graphics.fillRect(6, y(58), 30, 58);
    graphics.fillRect(40, y(84), 26, 84);
    graphics.fillRect(70, y(46), 34, 46);
    graphics.fillRect(108, y(70), 24, 70);

    const mosqueX = 214;
    graphics.fillRect(mosqueX - 32, y(34), 64, 34);
    graphics.fillEllipse(mosqueX, y(48), 70, 52);
    graphics.fillRect(mosqueX - 2, y(70), 4, 14);
    graphics.fillTriangle(mosqueX - 5, y(82), mosqueX + 5, y(82), mosqueX, y(94));
    this.drawMinaret(graphics, mosqueX - 40, 136, baseY, scaleY, color, alpha);

    const towerX = 322;
    graphics.fillRect(towerX - 7, y(84), 14, 84);
    graphics.fillRect(towerX - 10, y(87), 20, 3);
    graphics.fillRect(towerX - 9, y(90), 18, 22);
    graphics.fillTriangle(towerX - 12, y(112), towerX + 12, y(112), towerX, y(134));
    graphics.fillStyle(this.level.skyColor, 1);
    graphics.fillCircle(towerX, y(99), 4.4);
    graphics.fillStyle(color, alpha);

    const pyramidX = 500;
    const pyramidApexY = y(78);
    graphics.fillTriangle(pyramidX - 132, baseY, pyramidX + 132, baseY, pyramidX, pyramidApexY);
    graphics.lineStyle(distant ? 1 : 1.6, 0xffffff, alpha * 0.32);
    for (let i = -5; i <= 5; i += 1) {
      if (i !== 0) graphics.lineBetween(pyramidX, pyramidApexY, pyramidX + i * 24, baseY);
    }

    const cathedralX = 700;
    graphics.fillStyle(color, alpha);
    graphics.fillRect(cathedralX - 42, y(30), 84, 30);
    graphics.fillEllipse(cathedralX, y(52), 96, 66);
    graphics.fillRect(cathedralX - 3, y(84), 6, 16);
    graphics.fillRect(cathedralX - 11, y(98), 22, 5);
    graphics.fillRect(cathedralX - 3, y(93), 6, 16);

    graphics.fillRect(768, y(70), 34, 70);
    graphics.fillRect(808, y(112), 40, 112);
    graphics.fillRect(854, y(52), 30, 52);
    graphics.fillRect(890, y(88), 30, 88);

    if (!distant) {
      graphics.fillStyle(0xffffff, 0.13);
      for (let x = 12; x < 130; x += 13) {
        for (let row = 0; row < 3; row += 1) {
          graphics.fillRect(x, y(20 + row * 16), 5, 6);
        }
      }
      for (let x = 812; x < 920; x += 13) {
        for (let row = 0; row < 4; row += 1) {
          graphics.fillRect(x, y(24 + row * 15), 5, 6);
        }
      }
    }

    graphics.generateTexture(key, width, height);
    graphics.clear();
  }

  private drawMinaret(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    heightValue: number,
    baseY: number,
    scaleY: number,
    color: number,
    alpha: number,
  ) {
    const topY = baseY - heightValue * scaleY;
    const balconyY = baseY - heightValue * 0.72 * scaleY;
    graphics.fillStyle(color, alpha);
    graphics.fillRect(x - 3, topY + 20, 6, baseY - topY - 20);
    graphics.fillRect(x - 4.5, balconyY - 1.5, 9, 3);
    graphics.fillTriangle(x - 6, topY + 22, x + 6, topY + 22, x, topY);
    graphics.fillCircle(x, topY - 2.5, 2.4);
  }

  private drawFlamingoFrame(key: string, wingsUp: boolean) {
    const graphics = this.add.graphics();
    graphics.lineStyle(3, 0xe0637d, 1);
    graphics.lineBetween(16, 44, 13, 60);
    graphics.lineBetween(23, 44, 27, 60);
    graphics.fillStyle(0xe8547d, 1);
    graphics.fillTriangle(6, 32, 1, 25, 10, 29);
    graphics.fillStyle(0xff6f9c, 1);
    graphics.fillEllipse(21, 32, 27, 33);
    graphics.fillStyle(0xffd3e4, 1);
    graphics.fillEllipse(20, 39, 17, 17);
    graphics.fillStyle(0xe0637d, 1);
    graphics.fillTriangle(9, wingsUp ? 22 : 28, 27, wingsUp ? 7 : 30, 18, wingsUp ? 29 : 43);
    graphics.lineStyle(7, 0xff6f9c, 1);
    graphics.beginPath();
    graphics.moveTo(28, 20);
    graphics.lineTo(33, 9);
    graphics.lineTo(30, 3);
    graphics.strokePath();
    graphics.fillStyle(0xff6f9c, 1);
    graphics.fillCircle(30, 3, 7);
    graphics.fillStyle(0x2b2f3a, 1);
    graphics.fillTriangle(36, 1, 44, 3, 36, 7);
    graphics.fillStyle(0xffb703, 1);
    graphics.fillTriangle(34, 0, 40, 2, 34, 6);
    graphics.fillStyle(0x1a1c26, 1);
    graphics.fillCircle(32, 1, 1.5);
    graphics.generateTexture(key, 46, 66);
    graphics.destroy();
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
    scene: new FluturimScene(levelId, callbacks),
  });
}

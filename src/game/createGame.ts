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

const PLAYER_X_RATIO = 0.16;
const GROUND_HEIGHT = 74;
const INVULNERABLE_MS = 1050;
const DUCK_OBSTACLE_OFFSET = 46;
const FAST_FALL_SPEED = 900;
const SPEED_RAMP_RATE = 0.032;
const SPEED_RAMP_MAX = 1.85;
const DISTANCE_TICK_MS = 130;
const MINISTRI_WIDTH = 62;
const MINISTRI_HEIGHT = 92;

type MovingSprite = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

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
  private downKey!: Phaser.Input.Keyboard.Key;
  private duckKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private hazards!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private cityBack!: Phaser.GameObjects.TileSprite;
  private cityFront!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private scoreTimer?: Phaser.Time.TimerEvent;
  private entityLabels = new Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Text>();
  private zbulimIndex = 0;
  private politikanIndex = 0;
  private ministriIndex = 0;
  private invulnerableUntil = 0;
  private roundStartAt = 0;
  private lastStepAt = 0;
  private isGrounded = true;
  private isDucking = false;
  private groundY = 0;
  private stats!: GameStats;

  private readonly handleCommand = (event: Event) => {
    const command = (event as CustomEvent<GameCommand>).detail;

    if (command === "start") this.startOrJump();
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

    this.player = this.physics.add.sprite(this.playerX(), this.groundY, "flamingo-a");
    this.player.setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(false);
    this.player.setDepth(20);
    this.player.setSize(26, 42).setOffset(10, 20);
    this.player.body.allowGravity = true;

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.downKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.duckKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.input.on("pointerdown", () => this.startOrJump());
    window.addEventListener(GAME_COMMAND_EVENT, this.handleCommand);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(GAME_COMMAND_EVENT, this.handleCommand);
    });

    this.physics.add.overlap(this.player, this.hazards, () => this.takeHit());
    this.physics.add.overlap(this.player, this.collectibles, (_, sign) => {
      this.collectSign(sign as MovingSprite);
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

    if (
      Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
      Phaser.Input.Keyboard.JustDown(this.enterKey)
    ) {
      this.startOrJump();
    }

    this.applyGroundClamp();
    this.applyDuck();
    this.animatePlayer(time);

    if (this.stats.status !== "playing") return;

    const seconds = delta / 1000;
    const speed = this.currentSpeed();
    this.cityBack.tilePositionX += speed * 0.1 * seconds;
    this.cityFront.tilePositionX += speed * 0.28 * seconds;
    this.ground.tilePositionX += speed * seconds;

    this.cleanupEntities();
  }

  private applyGroundClamp() {
    if (this.player.y >= this.groundY && this.player.body.velocity.y >= 0) {
      this.player.y = this.groundY;
      this.player.setVelocityY(0);
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  private applyDuck() {
    const wantsDuck =
      this.stats.status === "playing" &&
      this.isGrounded &&
      (this.downKey.isDown || this.duckKey.isDown);

    if (wantsDuck !== this.isDucking) {
      this.isDucking = wantsDuck;
      this.player.setScale(1, wantsDuck ? 0.55 : 1);
    }

    if (
      !this.isGrounded &&
      this.stats.status === "playing" &&
      (this.downKey.isDown || this.duckKey.isDown) &&
      this.player.body.velocity.y < FAST_FALL_SPEED
    ) {
      this.player.setVelocityY(FAST_FALL_SPEED);
    }
  }

  private animatePlayer(time: number) {
    if (!this.isGrounded) {
      this.player.setTexture("flamingo-b");
      return;
    }

    const stepInterval = Phaser.Math.Clamp(180 - (this.currentSpeedMultiplier() - 1) * 90, 85, 180);
    if (time - this.lastStepAt > stepInterval) {
      this.lastStepAt = time;
      const isFrameA = this.player.texture.key === "flamingo-a";
      this.player.setTexture(isFrameA ? "flamingo-b" : "flamingo-a");
    }
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
      return;
    }

    if (this.stats.status === "playing") {
      this.jump();
    }
  }

  private jump() {
    if (!this.isGrounded) return;

    if (this.isDucking) {
      this.isDucking = false;
      this.player.setScale(1, 1);
    }

    this.player.setVelocityY(this.level.jumpVelocity);
    this.isGrounded = false;
  }

  private startRound() {
    this.roundStartAt = this.time.now;
    this.updateStats({
      status: "playing",
      message: this.level.objective,
    });
    this.scheduleNextSpawn(600);
    this.scoreTimer = this.time.addEvent({
      delay: DISTANCE_TICK_MS,
      loop: true,
      callback: () => this.tickDistanceScore(),
    });
  }

  private tickDistanceScore() {
    if (this.stats.status !== "playing") return;
    const gain = Math.max(1, Math.round(this.currentSpeedMultiplier()));
    this.updateStats({ score: this.stats.score + gain });
  }

  private currentSpeedMultiplier() {
    const survivedSeconds = (this.time.now - this.roundStartAt) / 1000;
    return Phaser.Math.Clamp(1 + survivedSeconds * SPEED_RAMP_RATE, 1, SPEED_RAMP_MAX);
  }

  private currentSpeed() {
    return this.level.speed * this.currentSpeedMultiplier();
  }

  private scheduleNextSpawn(overrideDelay?: number) {
    const base = this.level.obstacleDelayMs / this.currentSpeedMultiplier();
    const jitter = Phaser.Math.Between(-140, 160);
    const delay = overrideDelay ?? Phaser.Math.Clamp(base + jitter, base * 0.55, base * 1.2);
    this.spawnTimer = this.time.delayedCall(delay, () => this.spawnEntity());
  }

  private spawnEntity() {
    if (this.stats.status !== "playing") return;

    const roll = Math.random();
    const canOfferSlogan = this.stats.exposure < this.level.targetExposure;

    if (canOfferSlogan && roll < 0.14) {
      this.spawnSlogan();
    } else if (canOfferSlogan && roll < 0.24) {
      this.spawnPolitikan();
    } else if (roll < 0.42) {
      this.spawnFlyer();
    } else if (roll < 0.58) {
      this.spawnMinistri();
    } else {
      this.spawnGroundObstacle();
    }

    this.scheduleNextSpawn();
  }

  private spawnGroundObstacle() {
    const variant = Phaser.Math.Between(1, 3);
    const width = 24 + variant * 10;
    const height = 28 + variant * 14;
    const x = this.scale.width + width;

    const obstacle = this.physics.add.image(x, this.groundY, `leter-${variant}`) as MovingSprite;
    this.hazards.add(obstacle);
    obstacle.setOrigin(0.5, 1);
    obstacle.setDisplaySize(width, height);
    obstacle.body.allowGravity = false;
    obstacle.body.setSize(width - 6, height - 6);
    obstacle.setVelocityX(-this.currentSpeed());
    obstacle.setDepth(10);
  }

  private spawnMinistri() {
    const ministri = this.nextMinistri();
    const x = this.scale.width + MINISTRI_WIDTH;

    const obstacle = this.physics.add.image(x, this.groundY, "ministri") as MovingSprite;
    this.hazards.add(obstacle);
    obstacle.setOrigin(0.5, 1);
    obstacle.setDisplaySize(MINISTRI_WIDTH, MINISTRI_HEIGHT);
    obstacle.body.allowGravity = false;
    obstacle.body.setSize(MINISTRI_WIDTH - 10, MINISTRI_HEIGHT - 10);
    obstacle.setVelocityX(-this.currentSpeed());
    obstacle.setDepth(10);

    const label = this.add
      .text(x, this.groundY - MINISTRI_HEIGHT - 8, ministri.emri, {
        align: "center",
        color: "#263238",
        backgroundColor: "rgba(255,255,255,0.72)",
        fixedWidth: 100,
        fontFamily: "Arial",
        fontSize: "10px",
        fontStyle: "bold",
        padding: { x: 3, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.entityLabels.set(obstacle, label);
  }

  private spawnFlyer() {
    const x = this.scale.width + 50;
    const y = this.groundY - DUCK_OBSTACLE_OFFSET;

    const flyer = this.physics.add.image(x, y, "dron") as MovingSprite;
    this.hazards.add(flyer);
    flyer.body.allowGravity = false;
    flyer.body.setSize(30, 16);
    flyer.setVelocityX(-this.currentSpeed());
    flyer.setDepth(10);

    this.tweens.add({
      targets: flyer,
      y: y - 6,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private spawnSlogan() {
    const zbulim = this.nextZbulim();
    const apex = (this.level.jumpVelocity * this.level.jumpVelocity) / (2 * this.level.gravityY);
    const y = this.groundY - apex * 0.68;
    const x = this.scale.width + 60;

    const sign = this.physics.add.image(x, y, "shenje") as MovingSprite;
    this.collectibles.add(sign);
    sign.setDisplaySize(112, 40);
    sign.body.allowGravity = false;
    sign.body.setSize(104, 32);
    sign.setVelocityX(-this.currentSpeed());
    sign.setDepth(12);
    sign.setData("zbulim", zbulim);
    sign.setData("collected", false);

    const label = this.add
      .text(sign.x, sign.y, zbulim.slogan, {
        align: "center",
        color: "#ffffff",
        fixedWidth: 100,
        fontFamily: "Arial",
        fontSize: "11px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(13);

    this.entityLabels.set(sign, label);
  }

  private spawnPolitikan() {
    const politikan = this.nextPolitikan();
    const apex = (this.level.jumpVelocity * this.level.jumpVelocity) / (2 * this.level.gravityY);
    const y = this.groundY - apex * 0.72;
    const x = this.scale.width + 68;

    const sign = this.physics.add.image(x, y, "politikan") as MovingSprite;
    this.collectibles.add(sign);
    sign.setDisplaySize(128, 46);
    sign.body.allowGravity = false;
    sign.body.setSize(118, 36);
    sign.setVelocityX(-this.currentSpeed());
    sign.setDepth(12);
    sign.setData("politikan", politikan);
    sign.setData("collected", false);

    const label = this.add
      .text(sign.x, sign.y, `${politikan.emri}\n"${politikan.thirrje}"`, {
        align: "center",
        color: "#ffffff",
        fixedWidth: 112,
        fontFamily: "Arial",
        fontSize: "10px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(13);

    this.entityLabels.set(sign, label);
  }

  private collectSign(sign: MovingSprite) {
    if (sign.getData("collected")) return;

    const zbulim = sign.getData("zbulim") as ZbulimDefinition | undefined;
    const politikan = sign.getData("politikan") as PolitikanDefinition | undefined;
    const reveal = zbulim ? zbulim.eVerteta : politikan!.eVerteta;
    const points = zbulim ? zbulim.pike : politikan!.pike;

    sign.setData("collected", true);
    sign.body.enable = false;
    sign.setTexture(zbulim ? "shenje-zbuluar" : "politikan-zbuluar");

    this.entityLabels.get(sign)?.setText(reveal).setColor("#f9c74f");
    this.floatText(sign.x, sign.y - 32, `+${points * this.stats.combo}`);

    const combo = Math.min(this.stats.combo + 1, 5);
    const exposure = this.stats.exposure + 1;
    const score = this.stats.score + points * this.stats.combo;
    this.updateStats({
      score,
      exposure,
      combo,
      message:
        exposure >= this.level.targetExposure
          ? "Raundi u zbulua. Vazhdon për pikë."
          : "Vazhdo garën",
    });

    if (exposure >= this.level.targetExposure) {
      this.winRound();
    }
  }

  private takeHit() {
    if (this.time.now < this.invulnerableUntil || this.stats.status !== "playing") return;

    const lives = this.stats.lives - 1;
    this.invulnerableUntil = this.time.now + INVULNERABLE_MS;
    this.cameras.main.shake(140, 0.012);
    this.player.setTint(0xff8aa0);
    this.time.delayedCall(160, () => this.player.clearTint());

    if (lives <= 0) {
      this.updateStats({ lives, combo: 1, message: "U përplase" });
      this.loseRound();
      return;
    }

    this.updateStats({ lives, combo: 1, message: "U godite. Ki kujdes." });
  }

  private winRound() {
    if (this.stats.status === "won") return;

    this.stopMotion();
    this.addBanner("Faza u kalua");
    this.updateStats({ status: "won", message: "Faza u kalua" });
    this.callbacks.onLevelComplete(this.level.id, this.stats.score);
  }

  private loseRound() {
    this.stopMotion();
    this.addBanner("Fund loje");
    this.updateStats({ status: "lost", message: "Prek për ta rinisur" });
  }

  private resetRound(status: GameStats["status"] = "ready") {
    const shouldStart = status === "playing";

    this.stopMotion();
    this.entityLabels.forEach((label) => label.destroy());
    this.entityLabels.clear();
    this.hazards.clear(true, true);
    this.collectibles.clear(true, true);
    this.zbulimIndex = 0;
    this.politikanIndex = 0;
    this.ministriIndex = 0;
    this.invulnerableUntil = 0;
    this.isGrounded = true;
    this.isDucking = false;
    this.player.setPosition(this.playerX(), this.groundY);
    this.player.setVelocity(0, 0);
    this.player.setAngle(0);
    this.player.setScale(1, 1);
    this.player.clearTint();
    this.player.body.allowGravity = true;
    this.stats = {
      ...createInitialStats(this.level),
      status: "ready",
      message: this.level.intro,
    };
    this.callbacks.onStatsChange(this.stats);

    if (shouldStart) {
      this.startRound();
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
    this.hazards.children.each((child) => {
      (child as MovingSprite).setVelocityX(0);
      return true;
    });
    this.collectibles.children.each((child) => {
      (child as MovingSprite).setVelocityX(0);
      return true;
    });
  }

  private cleanupEntities() {
    this.hazards.children.each((child) => {
      const sprite = child as MovingSprite;
      const label = this.entityLabels.get(sprite);
      label?.setPosition(sprite.x, sprite.y - sprite.displayHeight - 8);

      if (sprite.x < -140) {
        label?.destroy();
        this.entityLabels.delete(sprite);
        sprite.destroy();
      }
      return true;
    });

    this.collectibles.children.each((child) => {
      const sign = child as MovingSprite;
      const label = this.entityLabels.get(sign);
      label?.setPosition(sign.x, sign.y);

      if (!sign.getData("collected") && sign.x < this.playerX() - 30) {
        sign.setData("collected", true);
        this.updateStats({ combo: 1, message: "Objektivi iku pa u zbuluar" });
      }

      if (sign.x < -140) {
        label?.destroy();
        this.entityLabels.delete(sign);
        sign.destroy();
      }
      return true;
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
    if (this.player && this.isGrounded) this.player.y = this.groundY;

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

  private playerX() {
    return Math.max(70, Math.min(120, this.scale.width * PLAYER_X_RATIO));
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
      y: label.y - 26,
      duration: 780,
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
      delay: 1050,
      duration: 550,
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

    for (let variant = 1; variant <= 3; variant += 1) {
      const width = 24 + variant * 10;
      const height = 28 + variant * 14;

      graphics.fillStyle(this.level.obstacleColor, 1);
      for (let i = 0; i < variant; i += 1) {
        const folderHeight = height / variant;
        const y = height - folderHeight * (i + 1);
        graphics.fillRoundedRect(2, y + 2, width - 4, folderHeight - 4, 4);
      }
      graphics.fillStyle(0xffffff, 0.22);
      graphics.fillRect(width * 0.15, 0, Math.max(4, width * 0.12), height);
      graphics.lineStyle(2, 0x263238, 0.35);
      graphics.strokeRoundedRect(1, 1, width - 2, height - 2, 4);
      graphics.generateTexture(`leter-${variant}`, width, height);
      graphics.clear();
    }

    // ministry building obstacle: columned facade with a pediment roof
    graphics.fillStyle(0xd8cba3, 1);
    graphics.fillRect(4, 14, MINISTRI_WIDTH - 8, MINISTRI_HEIGHT - 14);
    graphics.fillStyle(0x9c8258, 1);
    graphics.fillTriangle(0, 14, MINISTRI_WIDTH, 14, MINISTRI_WIDTH / 2, 0);
    graphics.fillStyle(0xf5efdd, 1);
    for (let cx = 10; cx < MINISTRI_WIDTH - 6; cx += 10) {
      graphics.fillRect(cx, 18, 5, MINISTRI_HEIGHT - 24);
    }
    graphics.fillStyle(0x263238, 0.5);
    graphics.fillRect(0, MINISTRI_HEIGHT - 6, MINISTRI_WIDTH, 6);
    graphics.lineStyle(2, 0x263238, 0.3);
    graphics.strokeRect(4, 14, MINISTRI_WIDTH - 8, MINISTRI_HEIGHT - 14);
    graphics.generateTexture("ministri", MINISTRI_WIDTH, MINISTRI_HEIGHT);
    graphics.clear();

    graphics.fillStyle(0x283041, 1);
    graphics.fillCircle(17, 11, 10);
    graphics.fillStyle(0x9ca3af, 1);
    graphics.fillRect(0, 9, 10, 3);
    graphics.fillRect(24, 9, 10, 3);
    graphics.fillStyle(0xd94d64, 1);
    graphics.fillCircle(23, 6, 2.4);
    graphics.generateTexture("dron", 34, 22);
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

    // politikan placard: navy + gold "official target" look, distinct from slogan boards
    graphics.fillStyle(0x1c2c52, 1);
    graphics.fillRoundedRect(0, 0, 128, 46, 8);
    graphics.lineStyle(2, 0xf9c74f, 0.9);
    graphics.strokeRoundedRect(3, 3, 122, 40, 6);
    graphics.fillStyle(0xf9c74f, 1);
    graphics.fillCircle(16, 23, 9);
    graphics.fillStyle(0xe8b98c, 1);
    graphics.fillCircle(16, 23, 6);
    graphics.generateTexture("politikan", 128, 46);
    graphics.clear();

    graphics.fillStyle(0x263238, 1);
    graphics.fillRoundedRect(0, 0, 128, 46, 8);
    graphics.lineStyle(2, 0xf9c74f, 0.95);
    graphics.strokeRoundedRect(3, 3, 122, 40, 6);
    graphics.fillStyle(0xd94d64, 1);
    graphics.fillCircle(16, 23, 9);
    graphics.fillStyle(0xffb4b4, 1);
    graphics.fillCircle(16, 23, 6);
    graphics.generateTexture("politikan-zbuluar", 128, 46);
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

    // Modern apartment/office blocks, left cluster.
    graphics.fillRect(6, y(58), 30, 58);
    graphics.fillRect(40, y(84), 26, 84);
    graphics.fillRect(70, y(46), 34, 46);
    graphics.fillRect(108, y(70), 24, 70);

    // Et'hem Bey Mosque: octagonal prayer hall, one dome, a single tall slender minaret.
    // Reference: the real mosque has exactly one minaret, dramatically taller and
    // thinner than the dome block beside it (photographed 2024, Wikimedia Commons).
    const mosqueX = 214;
    graphics.fillRect(mosqueX - 32, y(34), 64, 34);
    graphics.fillEllipse(mosqueX, y(48), 70, 52);
    graphics.fillRect(mosqueX - 2, y(70), 4, 14);
    graphics.fillTriangle(mosqueX - 5, y(82), mosqueX + 5, y(82), mosqueX, y(94));
    graphics.fillCircle(mosqueX, y(95), 3);
    this.drawMinaret(graphics, mosqueX - 40, 136, baseY, scaleY, color, alpha);

    // Clock Tower (Kulla e Sahatit): a very tall, slender shaft, a balcony ledge,
    // a clock face punched through in the sky colour, and a steep pointed roof.
    const towerX = 322;
    graphics.fillStyle(color, alpha);
    graphics.fillRect(towerX - 7, y(84), 14, 84);
    graphics.fillRect(towerX - 10, y(87), 20, 3);
    graphics.fillRect(towerX - 9, y(90), 18, 22);
    graphics.fillTriangle(towerX - 12, y(112), towerX + 12, y(112), towerX, y(134));
    graphics.lineStyle(distant ? 1 : 1.5, color, alpha);
    graphics.lineBetween(towerX, y(134), towerX, y(140));

    graphics.fillStyle(this.level.skyColor, 1);
    graphics.fillCircle(towerX, y(99), 4.4);
    graphics.fillStyle(color, alpha);

    // Pyramid of Tirana: wide, low, solid triangle with fins fanning from the apex,
    // matching the terraced concrete panels of the original 1988 structure, plus
    // the thin antenna mast visible at its peak.
    const pyramidX = 500;
    const pyramidApexY = y(78);
    graphics.fillTriangle(pyramidX - 132, baseY, pyramidX + 132, baseY, pyramidX, pyramidApexY);
    graphics.lineStyle(distant ? 1 : 1.6, 0xffffff, alpha * 0.32);
    for (let i = -5; i <= 5; i += 1) {
      if (i === 0) continue;
      graphics.lineBetween(pyramidX, pyramidApexY, pyramidX + i * 24, baseY);
    }
    graphics.lineStyle(distant ? 1 : 1.4, color, alpha);
    graphics.lineBetween(pyramidX, pyramidApexY, pyramidX, y(96));

    // Orthodox Cathedral of the Resurrection: a large round dome and a crowning cross.
    const cathedralX = 700;
    graphics.fillStyle(color, alpha);
    graphics.fillRect(cathedralX - 42, y(30), 84, 30);
    graphics.fillEllipse(cathedralX, y(52), 96, 66);
    graphics.fillRect(cathedralX - 3, y(84), 6, 16);
    graphics.fillRect(cathedralX - 11, y(98), 22, 5);
    graphics.fillRect(cathedralX - 3, y(93), 6, 16);

    // TID Tower and modern skyline, right cluster.
    graphics.fillRect(768, y(70), 34, 70);
    graphics.fillRect(808, y(112), 40, 112);
    graphics.fillRect(812, y(112) - 20, 4, 20);
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
      graphics.fillStyle(color, alpha);
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

  private drawFlamingoFrame(key: string, stridePose: boolean) {
    const graphics = this.add.graphics();
    const legColor = 0xe0637d;

    // legs (drawn first so the body silhouette occludes the thighs naturally)
    graphics.lineStyle(3, legColor, 1);
    graphics.fillStyle(legColor, 1);
    if (stridePose) {
      // back leg: trailing, bent behind
      graphics.beginPath();
      graphics.moveTo(16, 44);
      graphics.lineTo(10, 51);
      graphics.lineTo(6, 60);
      graphics.strokePath();
      graphics.fillTriangle(2, 58, 10, 58, 6, 64);

      // front leg: forward, bent ahead
      graphics.beginPath();
      graphics.moveTo(25, 44);
      graphics.lineTo(29, 50);
      graphics.lineTo(33, 57);
      graphics.strokePath();
      graphics.fillTriangle(29, 55, 37, 55, 33, 61);
    } else {
      // contact pose: legs close together, nearly straight down
      graphics.beginPath();
      graphics.moveTo(18, 44);
      graphics.lineTo(17, 53);
      graphics.lineTo(16, 61);
      graphics.strokePath();
      graphics.fillTriangle(11, 59, 19, 59, 16, 65);

      graphics.beginPath();
      graphics.moveTo(23, 44);
      graphics.lineTo(24, 53);
      graphics.lineTo(25, 61);
      graphics.strokePath();
      graphics.fillTriangle(21, 59, 29, 59, 25, 65);
    }

    // tail
    graphics.fillStyle(0xe8547d, 1);
    graphics.fillTriangle(6, 32, 1, 25, 10, 29);

    // body
    graphics.fillStyle(0xff6f9c, 1);
    graphics.fillEllipse(21, 32, 27, 33);
    graphics.fillStyle(0xffd3e4, 1);
    graphics.fillEllipse(20, 39, 17, 17);

    // wing
    graphics.fillStyle(0xe0637d, 1);
    if (stridePose) {
      graphics.fillTriangle(9, 22, 26, 7, 28, 26);
    } else {
      graphics.fillTriangle(8, 28, 27, 30, 17, 43);
    }

    // neck (S curve)
    graphics.lineStyle(7, 0xff6f9c, 1);
    graphics.beginPath();
    graphics.moveTo(28, 20);
    graphics.lineTo(33, 9);
    graphics.lineTo(30, 3);
    graphics.strokePath();

    // head
    graphics.fillStyle(0xff6f9c, 1);
    graphics.fillCircle(30, 3, 7);

    // beak
    graphics.fillStyle(0x2b2f3a, 1);
    graphics.fillTriangle(36, 1, 44, 3, 36, 7);
    graphics.fillStyle(0xffb703, 1);
    graphics.fillTriangle(34, 0, 40, 2, 34, 6);

    // eye
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

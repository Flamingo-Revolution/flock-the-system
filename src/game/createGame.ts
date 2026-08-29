import Phaser from "phaser";
import {
  GAME_COMMAND_EVENT,
  type GameCallbacks,
  type GameCommand,
  type GameStats,
} from "./events";
import { getLevel, type LevelDefinition, type TargetDefinition } from "./levels";

type TargetSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
  body: Phaser.Physics.Arcade.Body;
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

class LevelScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private dropKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private targets!: Phaser.Physics.Arcade.Group;
  private hazards!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private exitZone!: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  private labels = new Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Text>();
  private totalTargets = 0;
  private exposedTargets = 0;
  private lastDropAt = 0;
  private hazardTimer?: Phaser.Time.TimerEvent;
  private stats!: GameStats;
  private readonly handleCommand = (event: Event) => {
    const command = (event as CustomEvent<GameCommand>).detail;

    if (command === "start") this.startRound();
    if (command === "pause") this.togglePause();
    if (command === "restart") this.resetRound("playing");
  };

  constructor(
    private readonly levelId: string,
    private readonly callbacks: GameCallbacks,
  ) {
    super("level");
  }

  create() {
    this.level = getLevel(this.levelId);
    this.stats = createInitialStats(this.level);
    this.createTextures();
    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.scale.height);
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, this.scale.height);
    this.cameras.main.setBackgroundColor("#8bd3dd");

    this.drawWorld();

    this.player = this.physics.add.sprite(95, 170, "flamingo");
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(180, 120);

    this.targets = this.physics.add.group();
    this.hazards = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.exitZone = this.physics.add.staticSprite(
      this.level.worldWidth - 70,
      Math.max(145, this.scale.height - 150),
      "exit",
    );

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;
    this.dropKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.input.keyboard!.once("keydown-ENTER", () => this.startRound());
    window.addEventListener(GAME_COMMAND_EVENT, this.handleCommand);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(GAME_COMMAND_EVENT, this.handleCommand);
    });

    this.createTargets();
    this.registerCollisions();
    this.addBanner(this.level.intro);
    this.callbacks.onStatsChange(this.stats);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.resetRound("playing");
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.togglePause();
      return;
    }

    if (this.stats.status !== "playing") {
      this.player?.setVelocity(0, 0);
      return;
    }

    const speed = 250;
    const velocity = new Phaser.Math.Vector2(0, 0);

    if (this.cursors.left.isDown || this.wasd.left.isDown) velocity.x = -1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) velocity.x = 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) velocity.y = -1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) velocity.y = 1;

    velocity.normalize().scale(speed);
    this.player.setVelocity(velocity.x, velocity.y);

    if (Phaser.Input.Keyboard.JustDown(this.dropKey) && this.time.now - this.lastDropAt > 260) {
      this.dropProjectile();
    }

    this.destroyOffscreenObjects();
  }

  private drawWorld() {
    const groundY = this.scale.height - 70;
    const streetY = this.scale.height - 50;
    const labelY = this.scale.height - 106;

    this.add.rectangle(this.level.worldWidth / 2, groundY, this.level.worldWidth, 140, 0xc7d2a2);

    for (let x = 80; x < this.level.worldWidth; x += 160) {
      this.add.rectangle(x, streetY, 70, 18, 0xe9c46a);
      this.add.rectangle(x + 56, Math.max(112, this.scale.height * 0.24), 8, 170, 0x4a5568).setAlpha(0.4);
    }

    for (const building of this.level.buildings) {
      const buildingY = groundY - building.height / 2 + 6;

      this.add.rectangle(building.x, buildingY, building.width, building.height, building.color);
      this.add.rectangle(building.x, groundY - 25, building.width + 10, 14, 0x263238);
      this.add.rectangle(building.x, buildingY - building.height / 2, building.width + 12, 12, 0x263238);

      if (building.label) {
        this.add.text(building.x - 46, buildingY - building.height / 2 + 24, building.label, {
          color: "#263238",
          fontFamily: "Arial",
          fontSize: "18px",
          fontStyle: "bold",
        });
      }
    }

    this.add.text(this.level.worldWidth - 126, labelY, "EXIT", {
      color: "#263238",
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "bold",
    });
  }

  private registerCollisions() {
    this.physics.add.overlap(this.projectiles, this.targets, (projectile, target) => {
      projectile.destroy();
      this.exposeTarget(target as Phaser.GameObjects.GameObject);
    });

    this.physics.add.overlap(this.player, this.hazards, (_, hazard) => {
      hazard.destroy();
      this.updateStats({ combo: 1, lives: this.stats.lives - 1, message: "Drone hit" });
      this.cameras.main.shake(180, 0.01);
      if (this.stats.lives <= 0) this.loseRound();
    });

    this.physics.add.overlap(this.player, this.exitZone, () => {
      if (this.stats.exposure >= this.level.exposureToWin) {
        this.winRound();
      } else {
        this.updateStats({ message: `Expose ${this.level.exposureToWin}% before exiting` });
      }
    });
  }

  private startRound() {
    if (this.stats.status !== "ready") return;

    this.updateStats({
      status: "playing",
      message: this.level.objective,
    });
    this.hazardTimer = this.time.addEvent({
      delay: this.level.hazardDelayMs,
      callback: () => this.spawnHazard(),
      loop: true,
    });
  }

  private togglePause() {
    if (this.stats.status === "playing") {
      this.physics.world.pause();
      if (this.hazardTimer) this.hazardTimer.paused = true;
      this.updateStats({ status: "paused", message: "Paused" });
      this.addBanner("Paused");
      return;
    }

    if (this.stats.status === "paused") {
      this.physics.world.resume();
      if (this.hazardTimer) this.hazardTimer.paused = false;
      this.updateStats({ status: "playing", message: this.level.objective });
    }
  }

  private createTargets() {
    this.totalTargets = this.level.targets.length;
    this.exposedTargets = 0;

    for (const targetDefinition of this.level.targets) {
      const target = this.targets.create(
        targetDefinition.x,
        targetDefinition.y,
        "slogan",
      ) as TargetSprite;
      target.setImmovable(true);
      target.body.allowGravity = false;
      target.setData("exposed", false);
      target.setData("definition", targetDefinition);

      const label = this.add.text(
        targetDefinition.x - 54,
        targetDefinition.y - 8,
        targetDefinition.slogan,
        {
          color: "#ffffff",
          fontFamily: "Arial",
          fontSize: "12px",
          fontStyle: "bold",
        },
      );

      this.labels.set(target, label);
    }
  }

  private dropProjectile() {
    this.lastDropAt = this.time.now;
    const projectile = this.projectiles.create(
      this.player.x + 8,
      this.player.y + 18,
      "truth",
    ) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    projectile.setVelocityY(380);
    projectile.setCircle(6);
  }

  private exposeTarget(target: Phaser.GameObjects.GameObject) {
    const sprite = target as TargetSprite;
    if (sprite.getData("exposed")) return;

    const targetDefinition = sprite.getData("definition") as TargetDefinition;
    sprite.setData("exposed", true);
    sprite.setTexture("exposed");
    sprite.body.enable = false;
    this.exposedTargets += 1;

    this.labels.get(sprite)?.setText(targetDefinition.reveal).setColor("#f9c74f");
    this.floatText(sprite.x - 46, sprite.y + 24, "+ exposed");

    const combo = Math.min(this.stats.combo + 1, 5);
    const exposure = Math.round((this.exposedTargets / this.totalTargets) * 100);
    const score = this.stats.score + targetDefinition.points * this.stats.combo;
    this.updateStats({
      score,
      exposure,
      combo,
      message:
        exposure >= this.level.exposureToWin
          ? "Objective met. Reach the exit marker."
          : "Keep exposing",
    });
  }

  private spawnHazard() {
    if (this.stats.status !== "playing") return;

    const cameraRight = this.cameras.main.scrollX + this.cameras.main.width;
    const hazard = this.hazards.create(
      Math.min(cameraRight + 70, this.level.worldWidth - 20),
      Phaser.Math.Between(65, Math.max(100, this.scale.height - 150)),
      "drone",
    ) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    hazard.setVelocityX(Phaser.Math.Between(-285, -195));
    hazard.setAngularVelocity(90);
    hazard.setCircle(15);
  }

  private winRound() {
    if (this.stats.status === "won") return;

    this.finishRound("won", "Stage cleared");
    this.callbacks.onLevelComplete(this.level.id, this.stats.score);
  }

  private loseRound() {
    this.finishRound("lost", "Game over");
    this.time.delayedCall(900, () => this.resetRound("playing"));
  }

  private resetRound(status: GameStats["status"] = "ready") {
    this.physics.world.resume();
    this.hazardTimer?.destroy();
    this.labels.forEach((label) => label.destroy());
    this.labels.clear();
    this.targets.clear(true, true);
    this.hazards.clear(true, true);
    this.projectiles.clear(true, true);
    this.player.setPosition(95, 170);
    this.player.setVelocity(0, 0);
    this.cameras.main.scrollX = 0;
    this.stats = {
      ...createInitialStats(this.level),
      status,
      message: status === "playing" ? this.level.objective : this.level.intro,
    };
    this.createTargets();
    this.callbacks.onStatsChange(this.stats);

    if (status === "playing") {
      this.hazardTimer = this.time.addEvent({
        delay: this.level.hazardDelayMs,
        callback: () => this.spawnHazard(),
        loop: true,
      });
    }
  }

  private finishRound(status: "won" | "lost", banner: string) {
    this.hazardTimer?.destroy();
    this.player.setVelocity(0, 0);
    this.hazards.clear(true, true);
    this.projectiles.clear(true, true);
    this.addBanner(banner);
    this.updateStats({
      status,
      message: status === "won" ? "Stage cleared" : "Resetting stage",
    });
  }

  private destroyOffscreenObjects() {
    this.projectiles.children.each((projectile) => {
      if ((projectile as Phaser.GameObjects.Sprite).y > this.scale.height + 40) projectile.destroy();
      return true;
    });

    this.hazards.children.each((hazard) => {
      const sprite = hazard as Phaser.GameObjects.Sprite;
      if (sprite.x < this.cameras.main.scrollX - 80) sprite.destroy();
      return true;
    });
  }

  private floatText(x: number, y: number, text: string) {
    const label = this.add.text(x, y, text, {
      color: "#263238",
      fontFamily: "Arial",
      fontSize: "12px",
      fontStyle: "bold",
    });

    this.tweens.add({
      targets: label,
      alpha: 0,
      y: label.y - 18,
      duration: 900,
      onComplete: () => label.destroy(),
    });
  }

  private addBanner(message: string) {
    const banner = this.add
      .text(this.cameras.main.midPoint.x, 42, message, {
        align: "center",
        backgroundColor: "#263238",
        color: "#ffffff",
        fixedWidth: 340,
        fontFamily: "Arial",
        fontSize: "18px",
        fontStyle: "bold",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);

    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 900,
      duration: 600,
      onComplete: () => banner.destroy(),
    });
  }

  private updateStats(nextStats: Partial<GameStats>) {
    this.stats = { ...this.stats, ...nextStats };
    this.callbacks.onStatsChange(this.stats);
  }

  private createTextures() {
    const graphics = this.add.graphics();

    graphics.fillStyle(0xff6f86);
    graphics.fillEllipse(21, 23, 30, 40);
    graphics.fillStyle(0x202335);
    graphics.fillCircle(28, 13, 3);
    graphics.lineStyle(4, 0xff6f86);
    graphics.lineBetween(13, 40, 9, 52);
    graphics.lineBetween(25, 40, 30, 52);
    graphics.generateTexture("flamingo", 42, 56);
    graphics.clear();

    graphics.fillStyle(0xd94d64);
    graphics.fillRoundedRect(0, 0, 118, 34, 4);
    graphics.lineStyle(2, 0x8f2637);
    graphics.strokeRoundedRect(0, 0, 118, 34, 4);
    graphics.generateTexture("slogan", 118, 34);
    graphics.clear();

    graphics.fillStyle(0x263238);
    graphics.fillRoundedRect(0, 0, 118, 34, 4);
    graphics.lineStyle(2, 0xf9c74f);
    graphics.strokeRoundedRect(0, 0, 118, 34, 4);
    graphics.generateTexture("exposed", 118, 34);
    graphics.clear();

    graphics.fillStyle(0xfff1b8);
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture("truth", 16, 16);
    graphics.clear();

    graphics.fillStyle(0x283041);
    graphics.fillCircle(16, 16, 14);
    graphics.fillStyle(0x9ca3af);
    graphics.fillRect(3, 14, 26, 4);
    graphics.generateTexture("drone", 32, 32);
    graphics.clear();

    graphics.fillStyle(0x2a9d8f);
    graphics.fillRoundedRect(0, 0, 42, 92, 6);
    graphics.fillStyle(0xffffff);
    graphics.fillTriangle(9, 18, 9, 50, 31, 34);
    graphics.generateTexture("exit", 42, 92);
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
    scene: new LevelScene(levelId, callbacks),
  });
}

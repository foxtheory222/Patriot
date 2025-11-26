import Phaser from 'phaser';

// Debug config - read from HTML sliders
const debugConfig = {
  bgSpeed: 0.255,
  moveSpeed: 280,
  gravitySpeed: 110,
  animFps: 13,
  birdScale: 0.07,
  maxTilt: 9,
  groundLevel: 0.85,
  patriotX: 200,
  patriotY: 0.4,
  budgieScale: 0.02,
  budgieSpacing: 125,
  budgieX: 60,
  budgieY: 0.4,
};

// Day / night / weather states
type WeatherState = 'day' | 'dusk' | 'night' | 'storm' | 'dawn';

interface WeatherSystem {
  state: WeatherState;
  stateTimer: number;

  dayDuration: number;
  duskDuration: number;
  nightDuration: number;
  stormDuration: number;
  dawnDuration: number;

  // Darkness overlay (0 = day, ~0.7 = night)
  darkness: number;
  overlay: Phaser.GameObjects.Rectangle;

  // Rain
  rainDrops: Phaser.GameObjects.Line[];
  rainIntensity: number; // 0..1

  // Lightning
  lightningFlash: Phaser.GameObjects.Rectangle;
  nextLightning: number; // ms until next flash
}

// Expose to window for HTML controls
(window as any).gameConfig = debugConfig;

export default class GameScene extends Phaser.Scene {
  private bgLayers: Phaser.GameObjects.TileSprite[] = [];
  private player!: Phaser.Physics.Arcade.Sprite;
  private budgies: Phaser.Physics.Arcade.Sprite[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private weather!: WeatherSystem;
  private stateLabel!: Phaser.GameObjects.Text;
  private overlayBaseColor = 0x0c1024; // base purple tone for day reset

  constructor() {
    super('GameScene');
  }

  preload(): void {
    // Load backgrounds
    this.load.image('bg1', 'assets/backgrounds/layer-1.png');
    this.load.image('bg2', 'assets/backgrounds/layer-2.png');
    this.load.image('bg3', 'assets/backgrounds/layer-3.png');
    this.load.image('bg4', 'assets/backgrounds/layer-4.png');
    this.load.image('bg5', 'assets/backgrounds/layer-5.png');
    this.load.image('bg6', 'assets/backgrounds/layer-6.png');

    // Eagle frames (files are flying-1.png through flying-4.png)
    this.load.image('player_fly_1', 'assets/player/flying-1.png');
    this.load.image('player_fly_2', 'assets/player/flying-2.png');
    this.load.image('player_fly_3', 'assets/player/flying-3.png');
    this.load.image('player_fly_4', 'assets/player/flying-4.png');

    // Budgie frames
    this.load.image('budgie_fly_1', 'assets/budgie/frame-1.png');
    this.load.image('budgie_fly_2', 'assets/budgie/frame-2.png');
    this.load.image('budgie_fly_3', 'assets/budgie/frame-3.png');
    this.load.image('budgie_fly_4', 'assets/budgie/frame-4.png');
  }

  create(): void {
    const { width, height } = this.scale;

    // === Parallax background layers ===
    const layerKeys = ['bg1', 'bg2', 'bg3', 'bg4', 'bg5', 'bg6'];
    for (const key of layerKeys) {
      const layer = this.add.tileSprite(0, 0, width, height, key);
      layer.setOrigin(0, 0);
      this.bgLayers.push(layer);
    }

    // === Player animation ===
    this.anims.create({
      key: 'player_fly',
      frames: [
        { key: 'player_fly_1' },
        { key: 'player_fly_2' },
        { key: 'player_fly_3' },
        { key: 'player_fly_4' },
      ],
      frameRate: debugConfig.animFps,
      repeat: -1,
    });

    // === Budgie animation ===
    this.anims.create({
      key: 'budgie_fly',
      frames: [
        { key: 'budgie_fly_1' },
        { key: 'budgie_fly_2' },
        { key: 'budgie_fly_3' },
        { key: 'budgie_fly_4' },
      ],
      frameRate: debugConfig.animFps,
      repeat: -1,
    });

    // === Player sprite (Patriot eagle) ===
    this.player = this.physics.add.sprite(debugConfig.patriotX, height * debugConfig.patriotY, 'player_fly_1');
    this.player.setScale(debugConfig.birdScale);
    this.player.play('player_fly');
    this.player.setData('targetDirection', 0);

    // === 4 Budgies ===
    const verticalOffsets = [-1.5, -0.5, 0.5, 1.5];
    for (let i = 0; i < 4; i++) {
      const budgie = this.physics.add.sprite(
        debugConfig.budgieX,
        height / 2 + verticalOffsets[i] * debugConfig.budgieSpacing,
        'budgie_fly_1'
      );
      budgie.setScale(debugConfig.budgieScale);
      budgie.play('budgie_fly');
      budgie.setData('verticalOffset', verticalOffsets[i]);
      this.budgies.push(budgie);
    }

    // Keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Touch/Click controls
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < height / 2) {
        this.player.setData('targetDirection', -1);
      } else {
        this.player.setData('targetDirection', 1);
      }
    });

    this.input.on('pointerup', () => {
      this.player.setData('targetDirection', 0);
    });

    // === Night / weather overlay ===
    this.nightOverlay = this.add.rectangle(width / 2, height / 2, width, height, this.overlayBaseColor, 0);
    this.nightOverlay.setDepth(100);
    this.nightOverlay.setScrollFactor(0);

    // Lightning flash overlay (yellow, initially invisible)
    const lightningFlash = this.add.rectangle(width / 2, height / 2, width, height, 0xfff199, 0);
    lightningFlash.setDepth(101);
    lightningFlash.setScrollFactor(0);

    // === Weather system initialization ===
    this.weather = {
      state: 'day',
      stateTimer: 0,

      // Slightly shorter durations to make the cycle visible faster during dev
      dayDuration: Phaser.Math.Between(20000, 30000),
      duskDuration: 5000,
      nightDuration: 12000,
      stormDuration: 12000,
      dawnDuration: 5000,

      darkness: 0,
      overlay: this.nightOverlay,

      rainDrops: [],
      rainIntensity: 0,

      lightningFlash,
      nextLightning: 0,
    };

    // Allow HTML "Night" button to poke the state machine
    (window as any).triggerNightMode = () => this.triggerNightMode();

    // Simple debug state label
    this.stateLabel = this.add
      .text(12, 12, 'state: day', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setDepth(150)
      .setScrollFactor(0);
  }

  private triggerNightMode(): void {
    const w = this.weather;

    // Manual override from HTML button:
    // - If we're in day or dawn => skip to dusk
    // - If we're already in night or storm => go to dawn
    // - If we're in dusk => jump straight into storm
    switch (w.state) {
      case 'day':
      case 'dawn':
        w.state = 'dusk';
        w.stateTimer = 0;
        break;

      case 'dusk':
        w.state = 'storm';
        w.stateTimer = 0;
        w.rainIntensity = 0.5;
        w.nextLightning = 500;
        break;

      case 'night':
      case 'storm':
        w.state = 'dawn';
        w.stateTimer = 0;
        break;
    }
  }

  update(_time: number, delta: number): void {
    const { width, height } = this.scale;
    const groundY = height * debugConfig.groundLevel;
    const targetY = height * debugConfig.patriotY;

    // Update player
    this.player.setScale(debugConfig.birdScale);
    this.player.x = debugConfig.patriotX;

    // Update animation FPS
    const anim = this.anims.get('player_fly');
    if (anim && anim.frameRate !== debugConfig.animFps) {
      anim.frameRate = debugConfig.animFps;
    }

    // Parallax scroll
    const base = delta * debugConfig.bgSpeed;
    const speeds = [0.1, 0.2, 0.4, 0.6, 0.8, 1.0];
    for (let i = 0; i < this.bgLayers.length; i++) {
      this.bgLayers[i].tilePositionX += base * speeds[i];
    }

    // Player movement
    const moveSpeed = debugConfig.moveSpeed;
    const targetDirection = this.player.getData('targetDirection') as number;

    if (this.cursors?.up?.isDown) {
      this.player.setVelocityY(-moveSpeed);
    } else if (this.cursors?.down?.isDown) {
      this.player.setVelocityY(moveSpeed);
    } else if (targetDirection === -1) {
      this.player.setVelocityY(-moveSpeed);
    } else if (targetDirection === 1) {
      this.player.setVelocityY(moveSpeed);
    } else {
      const diff = targetY - this.player.y;
      if (Math.abs(diff) > 5) {
        this.player.setVelocityY(Math.sign(diff) * debugConfig.gravitySpeed);
      } else {
        this.player.setVelocityY(0);
      }
    }

    // Boundaries
    if (this.player.y > groundY) {
      this.player.y = groundY;
      this.player.setVelocityY(0);
    }
    if (this.player.y < 50) {
      this.player.y = 50;
      this.player.setVelocityY(0);
    }

    // Tilt bird
    const vy = this.player.body?.velocity.y ?? 0;
    const targetAngle = (vy / moveSpeed) * debugConfig.maxTilt;
    this.player.angle = Phaser.Math.Linear(this.player.angle, targetAngle, 0.1);

    // Horizontal keyboard
    if (this.cursors?.left?.isDown) {
      this.player.setVelocityX(-moveSpeed);
    } else if (this.cursors?.right?.isDown) {
      this.player.setVelocityX(moveSpeed);
    } else {
      this.player.setVelocityX(0);
    }

    // Budgies
    const budgieCenterY = height * debugConfig.budgieY;
    for (const budgie of this.budgies) {
      const verticalOffset = budgie.getData('verticalOffset') as number;
      budgie.x = debugConfig.budgieX;
      budgie.y = budgieCenterY + verticalOffset * debugConfig.budgieSpacing;
      budgie.setScale(debugConfig.budgieScale);
    }

    // Weather
    this.updateWeather(delta);

    // Debug label
    if (this.stateLabel) {
      this.stateLabel.setText(
        `state: ${this.weather.state}\ndark: ${this.weather.darkness.toFixed(2)}\nrain: ${this.weather.rainIntensity.toFixed(2)}`
      );
    }
  }

  private updateWeather(delta: number): void {
    const w = this.weather;
    const { width, height } = this.scale;

    w.stateTimer += delta;

    switch (w.state) {
      case 'day': {
        // Reset any lingering darkness
        w.darkness = 0;
        this.setOverlay(0, this.overlayBaseColor);

        if (w.stateTimer >= w.dayDuration) {
          w.state = 'dusk';
          w.stateTimer = 0;
        }
        break;
      }

      case 'dusk': {
        const t = Phaser.Math.Clamp(w.stateTimer / w.duskDuration, 0, 1);
        w.darkness = Phaser.Math.Linear(0, 0.65, t);
        // Purple tint for dusk
        this.setOverlay(w.darkness, 0x1a1240);

        if (w.stateTimer >= w.duskDuration) {
          w.state = 'night';
          w.stateTimer = 0;
        }
        break;
      }

      case 'night': {
        // Keep it dark; after nightDuration, start a storm
        w.darkness = 0.9;
        // Deep purple night
        this.setOverlay(w.darkness, 0x0a0622);

        if (w.stateTimer >= w.nightDuration) {
          w.state = 'storm';
          w.stateTimer = 0;
          w.rainIntensity = 0;
          w.nextLightning = Phaser.Math.Between(500, 2000);
        }
        break;
      }

      case 'storm': {
        // Ramp up rain over first 2 seconds
        const ramp = Phaser.Math.Clamp(w.stateTimer / 2000, 0, 1);
        w.rainIntensity = ramp;

        this.updateRain(delta, width, height);
        this.updateLightning(delta);

        // Keep it quite dark during storms with a purple cast
        this.setOverlay(Math.max(w.darkness, 0.8), 0x09071b);

        if (w.stateTimer >= w.stormDuration) {
          w.state = 'dawn';
          w.stateTimer = 0;
        }
        break;
      }

      case 'dawn': {
        // Fade rain and darkness out with a warm-to-neutral tint
        const t = Phaser.Math.Clamp(w.stateTimer / w.dawnDuration, 0, 1);
        w.darkness = Phaser.Math.Linear(0.65, 0.08, t);
        // Slightly warm purple dawn
        this.setOverlay(w.darkness, 0x2a183b);

        // Rain intensity goes down to zero
        w.rainIntensity = Phaser.Math.Linear(1, 0, t);
        this.updateRain(delta, width, height);

        if (w.stateTimer >= w.dawnDuration) {
          // Back to day; reset some durations for variety
          w.state = 'day';
          w.stateTimer = 0;
          w.dayDuration = Phaser.Math.Between(12000, 18000);
          w.rainIntensity = 0;
          this.clearRain();
          this.setOverlay(0, this.overlayBaseColor);
        }
        break;
      }
    }
  }

  private updateRain(_delta: number, width: number, height: number): void {
    const w = this.weather;
    const targetDrops = Math.floor(150 * w.rainIntensity);

    // Add drops until we reach target
    while (w.rainDrops.length < targetDrops) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-50, 0);
      const drop = this.add.line(0, 0, x, y, x - 3, y + 18, 0xaaccff, 0.6);
      drop.setLineWidth(1);
      drop.setDepth(102);
      drop.setData('speed', Phaser.Math.Between(600, 1000));
      w.rainDrops.push(drop);
    }

    // Remove extra drops if intensity went down
    while (w.rainDrops.length > targetDrops) {
      const drop = w.rainDrops.pop();
      if (drop) drop.destroy();
    }

    // Move existing drops
    for (const drop of w.rainDrops) {
      const speed = drop.getData('speed') as number;
      const geom = drop.geom as Phaser.Geom.Line;
      const dy = speed * 0.016;

      geom.y1 += dy;
      geom.y2 += dy;
      geom.x1 -= dy * 0.1;
      geom.x2 -= dy * 0.1;

      if (geom.y1 > height) {
        geom.x1 = Phaser.Math.Between(0, width);
        geom.y1 = Phaser.Math.Between(-50, 0);
        geom.x2 = geom.x1 - 3;
        geom.y2 = geom.y1 + 18;
      }

      drop.setTo(geom.x1, geom.y1, geom.x2, geom.y2);
    }
  }

  private updateLightning(delta: number): void {
    const w = this.weather;
    w.nextLightning -= delta;

    if (w.nextLightning <= 0) {
      this.triggerLightning();
      w.nextLightning = Phaser.Math.Between(1500, 4000);
    }
  }

  private triggerLightning(): void {
    const flash = this.weather.lightningFlash;
    if (!flash) return;

    flash.setFillStyle(0xfff199, 1);

    // Two quick yellow flashes
    this.tweens.add({
      targets: flash,
      alpha: { from: 1, to: 0 },
      duration: 100,
      yoyo: true,
      repeat: 2, // total three pulses (initial + 2 repeats)
      onComplete: () => flash.setAlpha(0),
    });
  }

  private clearRain(): void {
    const w = this.weather;
    for (const drop of w.rainDrops) {
      drop.destroy();
    }
    w.rainDrops = [];
  }

  private setOverlay(alpha: number, color: number): void {
    this.nightOverlay.setFillStyle(color, alpha);
    this.nightOverlay.setAlpha(alpha);
  }
}

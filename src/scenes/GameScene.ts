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
  patriotY: 0.5,
  budgieScale: 0.02,
  budgieSpacing: 125,
  budgieX: 60,
  budgieY: 0.4,
};

// Weather states
type WeatherState = 'day' | 'transition-to-night' | 'night' | 'storm' | 'transition-to-day';

interface WeatherSystem {
  state: WeatherState;
  stateTimer: number;
  dayDuration: number;
  nightDuration: number;
  transitionDuration: number;
  stormDuration: number;
  darkness: number;
  rainDrops: Phaser.GameObjects.Line[];
  lightningFlash: Phaser.GameObjects.Rectangle | null;
  nextLightning: number;
  rainIntensity: number;
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

    // HUD text
    this.add.text(width / 2, 40, 'PATRIOT', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, 80, 'Tap to fly!', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // === Night overlay ===
    this.nightOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x0a1628, 0);
    this.nightOverlay.setDepth(100);

    // === Weather system ===
    this.weather = {
      state: 'day',
      stateTimer: 0,
      dayDuration: Phaser.Math.Between(30000, 60000),
      nightDuration: 10000,
      transitionDuration: 3000,
      stormDuration: 12000,
      darkness: 0,
      rainDrops: [],
      lightningFlash: null,
      nextLightning: 0,
      rainIntensity: 0,
    };

    this.weather.lightningFlash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0);
    this.weather.lightningFlash.setDepth(101);

    // Expose night mode trigger
    (window as any).triggerNightMode = () => this.triggerNightMode();
  }

  private triggerNightMode(): void {
    const w = this.weather;
    if (w.state === 'day') {
      w.state = 'transition-to-night';
      w.stateTimer = 0;
      console.log('🌙 Transitioning to night...');
    } else if (w.state === 'night' || w.state === 'storm') {
      w.state = 'transition-to-day';
      w.stateTimer = 0;
      console.log('☀️ Transitioning to day...');
    } else if (w.state === 'transition-to-night') {
      w.state = 'storm';
      w.stateTimer = 0;
      w.darkness = 0.7;
      w.nextLightning = 500;
      this.nightOverlay.setAlpha(0.7);
      console.log('⛈️ Storm!');
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
    this.updateWeather(delta, width, height);
  }

  private updateWeather(delta: number, width: number, height: number): void {
    const w = this.weather;
    w.stateTimer += delta;

    switch (w.state) {
      case 'day':
        if (w.stateTimer >= w.dayDuration) {
          w.state = 'transition-to-night';
          w.stateTimer = 0;
        }
        break;

      case 'transition-to-night':
        const nightProgress = Math.min(w.stateTimer / w.transitionDuration, 1);
        w.darkness = nightProgress * 0.7;
        this.nightOverlay.setAlpha(w.darkness);
        if (w.stateTimer >= w.transitionDuration) {
          w.state = 'night';
          w.stateTimer = 0;
        }
        break;

      case 'night':
        if (w.stateTimer >= w.nightDuration) {
          w.state = 'storm';
          w.stateTimer = 0;
          w.nextLightning = Phaser.Math.Between(500, 2000);
        }
        break;

      case 'storm':
        w.rainIntensity = Math.min(w.stateTimer / 2000, 1);
        this.updateRain(delta, width, height);
        this.updateLightning(delta);
        if (w.stateTimer >= w.stormDuration) {
          w.state = 'transition-to-day';
          w.stateTimer = 0;
        }
        break;

      case 'transition-to-day':
        const dayProgress = Math.min(w.stateTimer / w.transitionDuration, 1);
        w.darkness = 0.7 * (1 - dayProgress);
        w.rainIntensity = 1 - dayProgress;
        this.nightOverlay.setAlpha(w.darkness);
        this.updateRain(delta, width, height);
        if (w.stateTimer >= w.transitionDuration) {
          w.state = 'day';
          w.stateTimer = 0;
          w.dayDuration = Phaser.Math.Between(30000, 60000);
          this.clearRain();
        }
        break;
    }
  }

  private updateRain(_delta: number, width: number, height: number): void {
    const w = this.weather;
    const targetDrops = Math.floor(w.rainIntensity * 150);

    while (w.rainDrops.length < targetDrops) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-50, 0);
      const drop = this.add.line(0, 0, x, y, x - 3, y + 20, 0xaaccff, 0.5);
      drop.setLineWidth(1);
      drop.setDepth(102);
      drop.setData('speed', Phaser.Math.Between(600, 1000));
      w.rainDrops.push(drop);
    }

    while (w.rainDrops.length > targetDrops) {
      const drop = w.rainDrops.pop();
      if (drop) drop.destroy();
    }

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
        geom.y2 = geom.y1 + 20;
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

    this.tweens.add({
      targets: flash,
      alpha: { from: 0.8, to: 0 },
      duration: 60,
      yoyo: true,
      repeat: 1,
      onComplete: () => flash.setAlpha(0),
    });
  }

  private clearRain(): void {
    for (const drop of this.weather.rainDrops) {
      drop.destroy();
    }
    this.weather.rainDrops = [];
  }
}

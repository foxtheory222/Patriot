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
  darkness: number; // 0 = day, 1 = full night
  rainDrops: Phaser.GameObjects.Line[];
  lightningFlash: Phaser.GameObjects.Rectangle | null;
  nextLightning: number;
  rainIntensity: number;
}

// Expose to window for HTML controls
(window as any).gameConfig = debugConfig;

// Setup slider listeners
function setupDebugControls() {
  const sliders = [
    { id: 'bgSpeed', key: 'bgSpeed' },
    { id: 'moveSpeed', key: 'moveSpeed' },
    { id: 'gravitySpeed', key: 'gravitySpeed' },
    { id: 'animFps', key: 'animFps' },
    { id: 'birdScale', key: 'birdScale' },
    { id: 'maxTilt', key: 'maxTilt' },
    { id: 'groundLevel', key: 'groundLevel' },
    { id: 'patriotX', key: 'patriotX' },
    { id: 'patriotY', key: 'patriotY' },
    { id: 'budgieScale', key: 'budgieScale' },
    { id: 'budgieSpacing', key: 'budgieSpacing' },
    { id: 'budgieX', key: 'budgieX' },
    { id: 'budgieY', key: 'budgieY' },
  ];

  sliders.forEach(({ id, key }) => {
    const slider = document.getElementById(id) as HTMLInputElement;
    const valDisplay = document.getElementById(`${id}Val`);
    if (slider && valDisplay) {
      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        (debugConfig as any)[key] = val;
        valDisplay.textContent = val.toString();
      });
    }
  });
}

// Run setup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDebugControls);
} else {
  setupDebugControls();
}

/**
 * GameScene
 * ---------
 * - 6-layer parallax background
 * - Red eagle with live-adjustable parameters
 * - Touch upper half = rise, touch lower half = fall, release = gravitate to middle
 */
export default class GameScene extends Phaser.Scene {
  private bgLayers: Phaser.GameObjects.TileSprite[] = [];
  private player!: Phaser.Physics.Arcade.Sprite;
  private budgies: Phaser.Physics.Arcade.Sprite[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private weather!: WeatherSystem;
  private isPlayerControlled: boolean = false;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    // Load backgrounds - layer-1 is farthest (sky), layer-6 is nearest (ground)
    this.load.image('bg1', 'Assets/backgrounds/layer-1.png');
    this.load.image('bg2', 'Assets/backgrounds/layer-2.png');
    this.load.image('bg3', 'Assets/backgrounds/layer-3.png');
    this.load.image('bg4', 'Assets/backgrounds/layer-4.png');
    this.load.image('bg5', 'Assets/backgrounds/layer-5.png');
    this.load.image('bg6', 'Assets/backgrounds/layer-6.png');

    // Eagle frames
    this.load.image('player_fly_1', 'Assets/player/frame-1.png');
    this.load.image('player_fly_2', 'Assets/player/frame-2.png');
    this.load.image('player_fly_3', 'Assets/player/frame-3.png');
    this.load.image('player_fly_4', 'Assets/player/frame-4.png');

    // Budgie frames
    this.load.image('budgie_fly_1', 'Assets/Budgie/frame-1.png');
    this.load.image('budgie_fly_2', 'Assets/Budgie/frame-2.png');
    this.load.image('budgie_fly_3', 'Assets/Budgie/frame-3.png');
    this.load.image('budgie_fly_4', 'Assets/Budgie/frame-4.png');
  }

  create(): void {
    const { width, height } = this.scale;

    // === Parallax background layers (back to front: layer-1 to layer-6) ===
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

    // === Player sprite (red eagle - Patriot) ===
    this.player = this.physics.add.sprite(debugConfig.patriotX, height * debugConfig.patriotY, 'player_fly_1');
    this.player.setScale(debugConfig.birdScale);
    this.player.play('player_fly');

    // === 4 Budgies in fixed vertical column on left side ===
    // Formation: 2 above center, 2 below center
    const verticalOffsets = [-1.5, -0.5, 0.5, 1.5]; // evenly spaced
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

    // Keyboard controls for desktop
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // === Touch/Click controls ===
    // Touch upper half = go up, touch lower half = go down
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const midY = height / 2;
      if (pointer.y < midY) {
        this.player.setData('targetDirection', -1);
      } else {
        this.player.setData('targetDirection', 1);
      }
      this.isPlayerControlled = true;
    });

    this.input.on('pointerup', () => {
      this.player.setData('targetDirection', 0);
      this.isPlayerControlled = false;
    });

    // Initialize target direction (0 = gravitate to middle)
    this.player.setData('targetDirection', 0);

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

    // === Night overlay (dark blue tint) ===
    this.nightOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x0a1628, 0);
    this.nightOverlay.setDepth(100); // Above backgrounds and birds
    
    // === Initialize weather system ===
    this.weather = {
      state: 'day',
      stateTimer: 0,
      dayDuration: Phaser.Math.Between(30000, 60000), // 30-60 seconds
      nightDuration: 20000, // 20 seconds of night before storm
      transitionDuration: 5000, // 5 second transitions
      stormDuration: 15000, // 15 seconds of storm
      darkness: 0,
      rainDrops: [],
      lightningFlash: null,
      nextLightning: 0,
      rainIntensity: 0,
    };
    
    // Create lightning flash rectangle (hidden initially)
    this.weather.lightningFlash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0);
    this.weather.lightningFlash.setDepth(101);
  }

  update(_time: number, delta: number): void {
    const { width, height } = this.scale;
    const groundY = height * debugConfig.groundLevel;
    const targetY = height * debugConfig.patriotY;
    
    // === Update bird scale and X position live ===
    this.player.setScale(debugConfig.birdScale);
    this.player.x = debugConfig.patriotX;
    
    // === Update animation FPS live ===
    const anim = this.anims.get('player_fly');
    if (anim && anim.frameRate !== debugConfig.animFps) {
      anim.frameRate = debugConfig.animFps;
    }
    
    // === Parallax scroll ===
    const base = delta * debugConfig.bgSpeed;
    const speeds = [0.1, 0.2, 0.4, 0.6, 0.8, 1.0];

    for (let i = 0; i < this.bgLayers.length; i++) {
      this.bgLayers[i].tilePositionX += base * speeds[i];
    }

    // === Player movement ===
    const moveSpeed = debugConfig.moveSpeed;
    const targetDirection = this.player.getData('targetDirection') as number;
    
    // Keyboard controls (desktop)
    if (this.cursors?.up?.isDown) {
      this.player.setVelocityY(-moveSpeed);
    } else if (this.cursors?.down?.isDown) {
      this.player.setVelocityY(moveSpeed);
    } else if (targetDirection === -1) {
      this.player.setVelocityY(-moveSpeed);
    } else if (targetDirection === 1) {
      this.player.setVelocityY(moveSpeed);
    } else {
      // No input - gravitate toward target Y position from slider
      const diff = targetY - this.player.y;
      
      if (Math.abs(diff) > 5) {
        this.player.setVelocityY(Math.sign(diff) * debugConfig.gravitySpeed);
        this.isPlayerControlled = false;
      } else {
        this.player.setVelocityY(0);
        this.isPlayerControlled = false;
      }
    }

    // === Ground collision - can't go below ground ===
    if (this.player.y > groundY) {
      this.player.y = groundY;
      this.player.setVelocityY(0);
    }

    // === Ceiling - can't go above screen ===
    const minY = 50;
    if (this.player.y < minY) {
      this.player.y = minY;
      this.player.setVelocityY(0);
    }

    // === Tilt bird based on vertical movement ===
    const vy = this.player.body?.velocity.y ?? 0;
    const targetAngle = (vy / moveSpeed) * debugConfig.maxTilt;
    this.player.angle = Phaser.Math.Linear(this.player.angle, targetAngle, 0.1);

    // Horizontal movement (keyboard only)
    if (this.cursors?.left?.isDown) {
      this.player.setVelocityX(-moveSpeed);
    } else if (this.cursors?.right?.isDown) {
      this.player.setVelocityX(moveSpeed);
    } else {
      this.player.setVelocityX(0);
    }

    // === Budgies stay at fixed screen position ===
    const budgieCenterY = height * debugConfig.budgieY;
    for (const budgie of this.budgies) {
      const verticalOffset = budgie.getData('verticalOffset') as number;
      
      // Fixed position on screen
      budgie.x = debugConfig.budgieX;
      budgie.y = budgieCenterY + verticalOffset * debugConfig.budgieSpacing;
      budgie.setScale(debugConfig.budgieScale);
      
      // Update budgie animation FPS
      const budgieAnim = this.anims.get('budgie_fly');
      if (budgieAnim && budgieAnim.frameRate !== debugConfig.animFps) {
        budgieAnim.frameRate = debugConfig.animFps;
      }
    }

    // === Weather System ===
    this.updateWeather(delta, width, height);
  }

  private updateWeather(delta: number, width: number, height: number): void {
    const w = this.weather;
    w.stateTimer += delta;

    switch (w.state) {
      case 'day':
        // Wait for random day duration
        if (w.stateTimer >= w.dayDuration) {
          w.state = 'transition-to-night';
          w.stateTimer = 0;
        }
        break;

      case 'transition-to-night':
        // Gradually darken
        const nightProgress = Math.min(w.stateTimer / w.transitionDuration, 1);
        w.darkness = nightProgress * 0.7; // Max 70% dark
        this.nightOverlay.setAlpha(w.darkness);
        
        if (w.stateTimer >= w.transitionDuration) {
          w.state = 'night';
          w.stateTimer = 0;
        }
        break;

      case 'night':
        // Wait before storm
        if (w.stateTimer >= w.nightDuration) {
          w.state = 'storm';
          w.stateTimer = 0;
          w.nextLightning = Phaser.Math.Between(1000, 3000);
        }
        break;

      case 'storm':
        // Rain and lightning!
        w.rainIntensity = Math.min(w.stateTimer / 2000, 1); // Ramp up rain
        this.updateRain(delta, width, height);
        this.updateLightning(delta);
        
        if (w.stateTimer >= w.stormDuration) {
          w.state = 'transition-to-day';
          w.stateTimer = 0;
        }
        break;

      case 'transition-to-day':
        // Gradually lighten and reduce rain
        const dayProgress = Math.min(w.stateTimer / w.transitionDuration, 1);
        w.darkness = 0.7 * (1 - dayProgress);
        w.rainIntensity = 1 - dayProgress;
        this.nightOverlay.setAlpha(w.darkness);
        this.updateRain(delta, width, height);
        
        if (w.stateTimer >= w.transitionDuration) {
          w.state = 'day';
          w.stateTimer = 0;
          w.dayDuration = Phaser.Math.Between(30000, 60000); // New random day duration
          this.clearRain();
        }
        break;
    }
  }

  private updateRain(delta: number, width: number, height: number): void {
    const w = this.weather;
    const targetDrops = Math.floor(w.rainIntensity * 150); // Up to 150 rain drops
    
    // Add new drops if needed
    while (w.rainDrops.length < targetDrops) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-100, -10);
      const length = Phaser.Math.Between(15, 30);
      const drop = this.add.line(0, 0, x, y, x - 5, y + length, 0xaaccff, 0.6);
      drop.setLineWidth(1.5);
      drop.setDepth(102);
      drop.setData('speedY', Phaser.Math.Between(800, 1200));
      drop.setData('speedX', Phaser.Math.Between(-100, -50));
      w.rainDrops.push(drop);
    }
    
    // Remove excess drops
    while (w.rainDrops.length > targetDrops) {
      const drop = w.rainDrops.pop();
      if (drop) drop.destroy();
    }
    
    // Update drop positions
    const dtSec = delta / 1000;
    for (const drop of w.rainDrops) {
      const speedY = drop.getData('speedY') as number;
      const speedX = drop.getData('speedX') as number;
      const geom = drop.geom as Phaser.Geom.Line;
      
      geom.x1 += speedX * dtSec;
      geom.y1 += speedY * dtSec;
      geom.x2 += speedX * dtSec;
      geom.y2 += speedY * dtSec;
      
      // Reset if off screen
      if (geom.y1 > height) {
        geom.x1 = Phaser.Math.Between(0, width);
        geom.y1 = Phaser.Math.Between(-100, -10);
        geom.x2 = geom.x1 - 5;
        geom.y2 = geom.y1 + Phaser.Math.Between(15, 30);
      }
      
      // Update the line's display
      drop.setTo(geom.x1, geom.y1, geom.x2, geom.y2);
    }
  }

  private updateLightning(_delta: number): void {
    const w = this.weather;
    
    // Check for lightning flash
    w.nextLightning -= _delta;
    
    if (w.nextLightning <= 0) {
      // Flash!
      this.triggerLightning();
      w.nextLightning = Phaser.Math.Between(2000, 5000); // 2-5 seconds between strikes
    }
  }

  private triggerLightning(): void {
    const flash = this.weather.lightningFlash;
    if (!flash) return;
    
    // Multiple quick flashes
    this.tweens.add({
      targets: flash,
      alpha: { from: 0.9, to: 0 },
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        flash.setAlpha(0);
      }
    });
  }

  private clearRain(): void {
    for (const drop of this.weather.rainDrops) {
      drop.destroy();
    }
    this.weather.rainDrops = [];
  }
}

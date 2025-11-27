import Phaser from 'phaser';
import { telemetry } from '../telemetry';

// Tuned game constants
const gameConfig = {
  bgSpeed: 0.36,
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
  beeScale: 0.025,
  scorePadding: 18,
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
  rainEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  rainIntensity: number; // 0..1

  // Lightning
  lightningFlash: Phaser.GameObjects.Rectangle;
  nextLightning: number; // ms until next flash
}

type FalconPhase = 'approach' | 'dive' | 'escape';
type BatPhase = 'loop' | 'attack';

export default class GameScene extends Phaser.Scene {
  private bgLayers: Phaser.GameObjects.TileSprite[] = [];
  private player!: Phaser.Physics.Arcade.Sprite;
  private budgies: Phaser.Physics.Arcade.Sprite[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private weather!: WeatherSystem;
  private overlayBaseColor = 0x0c1024; // base purple tone for day reset
  private budgieGroup!: Phaser.Physics.Arcade.Group;

  private falconGroup!: Phaser.Physics.Arcade.Group;
  private batGroup!: Phaser.Physics.Arcade.Group;

  private nextFalconSpawn = 2000; // Start spawning after 2 seconds
  private nextBatSpawn = 0; // ms
  private bees!: Phaser.Physics.Arcade.Group;
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private budgieIndicators: Phaser.GameObjects.Text[] = [];
  private beeSpeed = 200;
  private gameTime = 0; // Track total game time for difficulty scaling
  private currentFalconVariant = 0; // 0=A, 1=B, 2=C, 3=D
  private baseFalconSpawnRate = 4000; // Base spawn rate in ms
  private baseBatSpawnRate = 7000; // Base spawn rate in ms
  private aliveBudgiesCache: Phaser.Physics.Arcade.Sprite[] = []; // Cache to avoid repeated filtering
  private lastBudgieCacheUpdate = 0; // Track when cache was last updated
  private gameMusic!: Phaser.Sound.BaseSound;
  private isGameOver = false;
  private enemiesDefeated = 0; // Track enemies defeated for stats
  private startTime = 0; // Track game start time
  private poofSound!: Phaser.Sound.BaseSound;
  private dizzySound!: Phaser.Sound.BaseSound;
  private isInvincible = false; // Debug mode: invincibility
  private invincibleButton!: Phaser.GameObjects.Container;
  private debugRainOn = false; // Debug mode: force rain
  private rainButton!: Phaser.GameObjects.Container;

  // Touch feedback
  private touchZoneTop!: Phaser.GameObjects.Rectangle;
  private touchZoneBottom!: Phaser.GameObjects.Rectangle;

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

    // Attack Bird A frames
    this.load.image('falcon_a_1', 'assets/AttackBirds/Bird A/frame-1.png');
    this.load.image('falcon_a_2', 'assets/AttackBirds/Bird A/frame-2.png');
    this.load.image('falcon_a_3', 'assets/AttackBirds/Bird A/frame-3.png');
    this.load.image('falcon_a_4', 'assets/AttackBirds/Bird A/frame-4.png');

    // Attack Bird B frames
    this.load.image('falcon_b_1', 'assets/AttackBirds/Bird B/frame-1.png');
    this.load.image('falcon_b_2', 'assets/AttackBirds/Bird B/frame-2.png');
    this.load.image('falcon_b_3', 'assets/AttackBirds/Bird B/frame-3.png');
    this.load.image('falcon_b_4', 'assets/AttackBirds/Bird B/frame-4.png');

    // Attack Bird C frames
    this.load.image('falcon_c_1', 'assets/AttackBirds/Bird C/frame-1.png');
    this.load.image('falcon_c_2', 'assets/AttackBirds/Bird C/frame-2.png');
    this.load.image('falcon_c_3', 'assets/AttackBirds/Bird C/frame-3.png');
    this.load.image('falcon_c_4', 'assets/AttackBirds/Bird C/frame-4.png');

    // Attack Bird D frames
    this.load.image('falcon_d_1', 'assets/AttackBirds/Bird D/frame-1.png');
    this.load.image('falcon_d_2', 'assets/AttackBirds/Bird D/frame-2.png');
    this.load.image('falcon_d_3', 'assets/AttackBirds/Bird D/frame-3.png');
    this.load.image('falcon_d_4', 'assets/AttackBirds/Bird D/frame-4.png');

    // Bat frames
    this.load.image('bat_fly_1', 'assets/bat/frame-1.png');
    this.load.image('bat_fly_2', 'assets/bat/frame-2.png');
    this.load.image('bat_fly_3', 'assets/bat/frame-3.png');
    this.load.image('bat_fly_4', 'assets/bat/frame-4.png');
    this.load.image('bat_fly_5', 'assets/bat/frame-5.png');
    this.load.image('bat_fly_6', 'assets/bat/frame-6.png');
    this.load.image('bat_fly_7', 'assets/bat/frame-7.png');
    this.load.image('bat_fly_8', 'assets/bat/frame-8.png');

    // Bee frames
    this.load.image('bee_1', 'assets/Bee/frame-1.png');
    this.load.image('bee_2', 'assets/Bee/frame-2.png');

    // Budgie hit animation
    this.load.image('budgie_hit_1', 'animations/Budgie got hit/frame-1.png');
    this.load.image('budgie_hit_2', 'animations/Budgie got hit/frame-2.png');

    // Enemy explosion animation
    this.load.image('explode_1', 'animations/Explode/a1.png');
    this.load.image('explode_2', 'animations/Explode/a2.png');
    this.load.image('explode_3', 'animations/Explode/a3.png');
    this.load.image('explode_4', 'animations/Explode/a4.png');
    this.load.image('explode_5', 'animations/Explode/a5.png');

    // Player Dizzy animation (8 frames)
    this.load.image('player_dizzy_1', 'assets/player/Dizzy/frame-1.png');
    this.load.image('player_dizzy_2', 'assets/player/Dizzy/frame-2.png');
    this.load.image('player_dizzy_3', 'assets/player/Dizzy/frame-3.png');
    this.load.image('player_dizzy_4', 'assets/player/Dizzy/frame-4.png');
    this.load.image('player_dizzy_5', 'assets/player/Dizzy/frame-5.png');
    this.load.image('player_dizzy_6', 'assets/player/Dizzy/frame-6.png');
    this.load.image('player_dizzy_7', 'assets/player/Dizzy/frame-7.png');
    this.load.image('player_dizzy_8', 'assets/player/Dizzy/frame-8.png');

    // Player Faint animation (4 frames)
    this.load.image('player_faint_1', 'assets/player/Faint/frame-1.png');
    this.load.image('player_faint_2', 'assets/player/Faint/frame-2.png');
    this.load.image('player_faint_3', 'assets/player/Faint/frame-3.png');
    this.load.image('player_faint_4', 'assets/player/Faint/frame-4.png');

    // Game music - NOTE: MP3 version needed for iOS! Convert xenostar2loop_.ogg to .mp3
    this.load.audio('game_music', [
      'assets/music/gameMusic/xenostar2loop_.mp3',
      'assets/music/gameMusic/xenostar2loop_.ogg'
    ]);

    // Sound effects
    this.load.audio('poof_sound', [
      'assets/music/poof-80161.mp3',
      'assets/music/poof-80161.ogg'
    ]);
    this.load.audio('dizzy_sound', [
      'assets/music/cartoon-spin-7120.mp3',
      'assets/music/cartoon-spin-7120.ogg'
    ]);
  }

  create(): void {
    const { width, height } = this.scale;

    // Generate rain texture (must be in create, not preload)
    const rainGraphics = this.make.graphics({ x: 0, y: 0 });
    rainGraphics.fillStyle(0xaaccff, 1);
    rainGraphics.fillRect(0, 0, 2, 12);
    rainGraphics.generateTexture('rain_drop', 2, 12);
    rainGraphics.destroy();

    // Reset game state
    this.score = 0;
    this.gameTime = 0;
    this.isGameOver = false;
    this.beeSpeed = 200;
    this.nextFalconSpawn = 2000;
    this.nextBatSpawn = 0;
    this.currentFalconVariant = 0;
    this.bgLayers = [];
    this.budgies = [];
    this.enemiesDefeated = 0;
    this.startTime = Date.now();

    telemetry.recordEvent('game_session_start', {
      startTime: this.startTime,
      scene: this.scene.key,
    });

    // === Parallax background layers ===
    const layerKeys = ['bg1', 'bg2', 'bg3', 'bg4', 'bg5', 'bg6'];
    for (const key of layerKeys) {
      const layer = this.add.tileSprite(0, 0, width, height, key);
      layer.setOrigin(0, 0);
      this.bgLayers.push(layer);
    }

    // === Create animations only if they don't exist ===
    if (!this.anims.exists('player_fly')) {
      this.anims.create({
        key: 'player_fly',
        frames: [
          { key: 'player_fly_1' },
          { key: 'player_fly_2' },
          { key: 'player_fly_3' },
          { key: 'player_fly_4' },
        ],
        frameRate: gameConfig.animFps,
        repeat: -1,
      });
    }

    if (!this.anims.exists('budgie_fly')) {
      this.anims.create({
        key: 'budgie_fly',
        frames: [
          { key: 'budgie_fly_1' },
          { key: 'budgie_fly_2' },
          { key: 'budgie_fly_3' },
          { key: 'budgie_fly_4' },
        ],
        frameRate: gameConfig.animFps,
        repeat: -1,
      });
    }

    if (!this.anims.exists('bee_fly')) {
      this.anims.create({
        key: 'bee_fly',
        frames: [
          { key: 'bee_1' },
          { key: 'bee_2' },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.anims.exists('budgie_hit')) {
      this.anims.create({
        key: 'budgie_hit',
        frames: [
          { key: 'budgie_hit_1' },
          { key: 'budgie_hit_2' },
        ],
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists('enemy_explode')) {
      this.anims.create({
        key: 'enemy_explode',
        frames: [
          { key: 'explode_1' },
          { key: 'explode_2' },
          { key: 'explode_3' },
          { key: 'explode_4' },
          { key: 'explode_5' },
        ],
        frameRate: 12,
        repeat: 0,
      });
    }

    if (!this.anims.exists('player_dizzy')) {
      this.anims.create({
        key: 'player_dizzy',
        frames: [
          { key: 'player_dizzy_1' },
          { key: 'player_dizzy_2' },
          { key: 'player_dizzy_3' },
          { key: 'player_dizzy_4' },
          { key: 'player_dizzy_5' },
          { key: 'player_dizzy_6' },
          { key: 'player_dizzy_7' },
          { key: 'player_dizzy_8' },
        ],
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists('player_faint')) {
      this.anims.create({
        key: 'player_faint',
        frames: [
          { key: 'player_faint_1' },
          { key: 'player_faint_2' },
          { key: 'player_faint_3' },
          { key: 'player_faint_4' },
        ],
        frameRate: 8,
        repeat: 0,
      });
    }

    // === Player sprite (Patriot eagle) ===
    this.player = this.physics.add.sprite(gameConfig.patriotX, height * gameConfig.patriotY, 'player_fly_1');
    this.player.setScale(gameConfig.birdScale);
    this.player.play('player_fly');
    this.player.setData('targetDirection', 0);
    // Resize hitbox to match scaled sprite (using circle for better gameplay)
    const playerRadius = this.player.width * 0.4;
    this.player.body?.setCircle(playerRadius);
    this.player.body?.setOffset((this.player.width - playerRadius * 2) / 2, (this.player.height - playerRadius * 2) / 2);

    // === 4 Budgies ===
    // Adjusted spacing to ensure all budgies are reachable (player min Y is 50, max is groundY)
    const verticalOffsets = [-1.2, -0.4, 0.4, 1.2];
    for (let i = 0; i < 4; i++) {
      const budgie = this.physics.add.sprite(
        gameConfig.budgieX,
        height / 2 + verticalOffsets[i] * gameConfig.budgieSpacing,
        'budgie_fly_1'
      );
      budgie.setScale(gameConfig.budgieScale);
      budgie.play('budgie_fly');
      budgie.setData('verticalOffset', verticalOffsets[i]);
      // Resize hitbox to match scaled sprite
      const budgieRadius = budgie.width * 0.4;
      budgie.body?.setCircle(budgieRadius);
      budgie.body?.setOffset((budgie.width - budgieRadius * 2) / 2, (budgie.height - budgieRadius * 2) / 2);
      this.budgies.push(budgie);
    }

    this.budgieGroup = this.physics.add.group();
    for (const budgie of this.budgies) {
      this.budgieGroup.add(budgie);
      budgie.setData('isHit', false);
    }

    // === Falcons ===
    this.falconGroup = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      runChildUpdate: false,
    });

    // Attack Bird animations - only create if they don't exist
    if (!this.anims.exists('falcon_a_fly')) {
      this.anims.create({
        key: 'falcon_a_fly',
        frames: [
          { key: 'falcon_a_1' },
          { key: 'falcon_a_2' },
          { key: 'falcon_a_3' },
          { key: 'falcon_a_4' },
        ],
        frameRate: gameConfig.animFps,
        repeat: -1,
      });
    }

    if (!this.anims.exists('falcon_b_fly')) {
      this.anims.create({
        key: 'falcon_b_fly',
        frames: [
          { key: 'falcon_b_1' },
          { key: 'falcon_b_2' },
          { key: 'falcon_b_3' },
          { key: 'falcon_b_4' },
        ],
        frameRate: gameConfig.animFps,
        repeat: -1,
      });
    }

    if (!this.anims.exists('falcon_c_fly')) {
      this.anims.create({
        key: 'falcon_c_fly',
        frames: [
          { key: 'falcon_c_1' },
          { key: 'falcon_c_2' },
          { key: 'falcon_c_3' },
          { key: 'falcon_c_4' },
        ],
        frameRate: gameConfig.animFps,
        repeat: -1,
      });
    }

    if (!this.anims.exists('falcon_d_fly')) {
      this.anims.create({
        key: 'falcon_d_fly',
        frames: [
          { key: 'falcon_d_1' },
          { key: 'falcon_d_2' },
          { key: 'falcon_d_3' },
          { key: 'falcon_d_4' },
        ],
        frameRate: gameConfig.animFps,
        repeat: -1,
      });
    }

    // === Bats (night-only enemy) ===
    this.batGroup = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      runChildUpdate: false,
    });

    if (!this.anims.exists('bat_fly')) {
      this.anims.create({
        key: 'bat_fly',
        frames: [
          { key: 'bat_fly_1' },
          { key: 'bat_fly_2' },
          { key: 'bat_fly_3' },
          { key: 'bat_fly_4' },
          { key: 'bat_fly_5' },
          { key: 'bat_fly_6' },
          { key: 'bat_fly_7' },
          { key: 'bat_fly_8' },
        ],
        frameRate: gameConfig.animFps,
        repeat: -1,
      });
    }

    // Patriot vs falcons -> falcon explodes
    this.physics.add.overlap(
      this.player,
      this.falconGroup,
      (player, falcon) => this.handlePatriotHitsFalcon(player as Phaser.GameObjects.GameObject, falcon as Phaser.GameObjects.GameObject),
      undefined,
      this
    );

    // Patriot vs bats -> bat explodes
    this.physics.add.overlap(this.player, this.batGroup, (player, bat) => this.handlePatriotHitsBat(player as Phaser.GameObjects.GameObject, bat as Phaser.GameObjects.GameObject), undefined, this);

    // Falcons hitting budgies
    this.physics.add.overlap(
      this.falconGroup,
      this.budgieGroup,
      (falcon, budgie) => this.handleFalconHitsBudgie(falcon as Phaser.GameObjects.GameObject, budgie as Phaser.GameObjects.GameObject),
      undefined,
      this
    );

    // Bats hitting budgies
    this.physics.add.overlap(this.batGroup, this.budgieGroup, (bat, budgie) => this.handleBatHitsBudgie(bat as Phaser.GameObjects.GameObject, budgie as Phaser.GameObjects.GameObject), undefined, this);

    // Keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Touch/Click controls
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < height / 2) {
        this.player.setData('targetDirection', -1);
        this.showTouchFeedback('top');
      } else {
        this.player.setData('targetDirection', 1);
        this.showTouchFeedback('bottom');
      }
    });

    this.input.on('pointerup', () => {
      this.player.setData('targetDirection', 0);
      this.hideTouchFeedback();
    });

    // === Touch Feedback Visuals ===
    // Top zone (fly up)
    this.touchZoneTop = this.add.rectangle(width / 2, height / 4, width, height / 2, 0xffffff, 0);
    this.touchZoneTop.setDepth(140);
    this.touchZoneTop.setScrollFactor(0);

    // Bottom zone (fly down)
    this.touchZoneBottom = this.add.rectangle(width / 2, (height / 4) * 3, width, height / 2, 0xffffff, 0);
    this.touchZoneBottom.setDepth(140);
    this.touchZoneBottom.setScrollFactor(0);

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

      // Normal durations for day/night cycle
      dayDuration: Phaser.Math.Between(40000, 60000),
      duskDuration: 15000,
      nightDuration: 20000,
      stormDuration: 12000,
      dawnDuration: 5000,

      darkness: 0,
      overlay: this.nightOverlay,

      rainEmitter: null as unknown as Phaser.GameObjects.Particles.ParticleEmitter,
      rainIntensity: 0,

      lightningFlash,
      nextLightning: 0,
    };

    // Create rain emitter separately and configure it
    const rainParticles = this.add.particles(0, 0, 'rain_drop', {
      x: { min: 0, max: width },
      y: -50,
      quantity: 3,
      frequency: 20,
      angle: { min: 85, max: 95 },
      speedY: { min: 600, max: 900 },
      speedX: { min: -20, max: 20 },
      lifespan: 1500,
      scale: { min: 0.5, max: 0.8 },
      alpha: { min: 0.5, max: 0.8 },
      emitting: false,
    });
    rainParticles.setScrollFactor(0);
    rainParticles.setDepth(1000);
    this.weather.rainEmitter = rainParticles;

    // Bees group
    this.bees = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      runChildUpdate: false,
    });

    // Overlap: budgies eat bees, score increases
    this.physics.add.overlap(this.budgieGroup, this.bees, (budgie, bee) => {
      const beeSprite = bee as Phaser.Physics.Arcade.Sprite;
      const budgieSprite = budgie as Phaser.Physics.Arcade.Sprite;
      if (!budgieSprite.active) return;

      beeSprite.disableBody(true, true);
      this.incrementScore(10);
      this.showFloatingText(budgieSprite.x, budgieSprite.y, '+10');
    });

    // Patriot hits bee -> Patriot dies!
    this.physics.add.overlap(this.player, this.bees, (player, bee) => this.handlePatriotHitsBee(player as Phaser.GameObjects.GameObject, bee as Phaser.GameObjects.GameObject), undefined, this);

    // HUD container
    const uiPadding = gameConfig.scorePadding;
    const panelHeight = 46;

    // Score text (top-right)
    this.scoreText = this.add
      .text(width - uiPadding, uiPadding + panelHeight / 2, 'Score: 0', {
        fontFamily: 'Arial Black',
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true },
        align: 'right',
      })
      .setDepth(151)
      .setScrollFactor(0)
      .setOrigin(1, 0.5);

    // Start game music (wait for user interaction if audio is locked)
    this.gameMusic = this.sound.add('game_music', { loop: true, volume: 0.4 });
    if (this.sound.locked) {
      this.sound.once('unlocked', () => {
        this.gameMusic.play();
      });
    } else {
      this.gameMusic.play();
    }

    // Preload poof sound for consistent playback - HIGH volume for visibility
    this.poofSound = this.sound.add('poof_sound', { volume: 2.0 });
    this.dizzySound = this.sound.add('dizzy_sound', { volume: 0.8 });

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Spawn bees periodically in front of random budgies
    this.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => this.spawnBee(),
    });

    // Ensure physics is resumed (in case it was paused from previous game over)
    this.physics.resume();

    // Register shutdown handler
    this.events.on('shutdown', this.shutdown, this);
  }

  private shutdown(): void {
    // Clean up input listeners to prevent memory leaks
    this.input.off('pointerdown');
    this.input.off('pointerup');

    // Remove shutdown listener
    this.events.off('shutdown', this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    // Don't update if game is over
    if (this.isGameOver) return;

    const { width, height } = this.scale;
    const groundY = height * gameConfig.groundLevel;
    const targetY = height * gameConfig.patriotY;

    // Update alive budgies cache only when needed (max once per 100ms)
    this.lastBudgieCacheUpdate += delta;
    if (this.lastBudgieCacheUpdate > 100) {
      this.aliveBudgiesCache = this.budgies.filter((b) => b.active);
      this.lastBudgieCacheUpdate = 0;

      // Check for game over - all budgies dead
      if (this.aliveBudgiesCache.length === 0 && this.gameTime > 1000) {
        this.triggerGameOver();
        return;
      }
    }

    // Update player position (scale set only once in create)
    this.player.x = gameConfig.patriotX;

    // Parallax scroll
    const base = delta * gameConfig.bgSpeed;
    const speeds = [0.1, 0.2, 0.4, 0.6, 0.8, 1.0];
    for (let i = 0; i < this.bgLayers.length; i++) {
      this.bgLayers[i].tilePositionX += base * speeds[i];
    }

    // Player movement
    const moveSpeed = gameConfig.moveSpeed;
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
        this.player.setVelocityY(Math.sign(diff) * gameConfig.gravitySpeed);
      } else {
        this.player.setVelocityY(0);
      }
    }

    // Boundaries with proper bounds checking
    if (this.player.y > groundY) {
      this.player.y = groundY;
      this.player.setVelocityY(0);
    }
    // Allow player to reach top of screen (relaxed from 50 to 30)
    if (this.player.y < 30) {
      this.player.y = 30;
      this.player.setVelocityY(0);
    }

    // Tilt bird
    const vy = this.player.body?.velocity.y ?? 0;
    const targetAngle = (vy / moveSpeed) * gameConfig.maxTilt;
    this.player.angle = Phaser.Math.Linear(this.player.angle, targetAngle, 0.1);

    // Budgies (scale set only once in create, not every frame)
    const budgieCenterY = height * gameConfig.budgieY;
    for (const budgie of this.budgies) {
      if (!budgie.active) continue;

      const verticalOffset = budgie.getData('verticalOffset') as number;
      budgie.x = gameConfig.budgieX;
      budgie.y = budgieCenterY + verticalOffset * gameConfig.budgieSpacing;
    }

    // Track game time for progressive difficulty
    this.gameTime += delta;

    // Weather
    this.updateWeather(delta);

    // Enemies
    this.updateFalconSpawning(delta);
    this.updateFalcons(delta);
    this.updateBatSpawning(delta);
    this.updateBats(delta);

    // Cull bees that move off-screen (use object pooling instead of destroy)
    this.bees.children.each((child) => {
      const bee = child as Phaser.Physics.Arcade.Sprite;
      if (bee.active && bee.x < -100) {
        bee.setActive(false);
        bee.setVisible(false);
        bee.setPosition(width + 1000, 0); // Move off-screen for reuse
      }
      return true;
    });
  }

  private updateWeather(delta: number): void {
    const w = this.weather;
    const { width, height } = this.scale;

    w.stateTimer += delta;

    switch (w.state) {
      case 'day': {
        // Fully clear overlay during day
        w.darkness = 0;
        this.setOverlay(0, this.overlayBaseColor);

        if (w.stateTimer >= w.dayDuration) {
          w.state = 'dusk';
          w.stateTimer = 0;
        }
        break;
      }

      case 'dusk': {
        // Ease in a soft purple dusk
        const t = Phaser.Math.Clamp(w.stateTimer / w.duskDuration, 0, 1);
        const eased = Phaser.Math.Easing.Sine.InOut(t);

        // Fade darkness from 0 → 0.7
        w.darkness = Phaser.Math.Linear(0, 0.7, eased);
        // Rich purple dusk tint
        this.setOverlay(w.darkness, 0x2a183b);

        if (t >= 1) {
          w.state = 'night';
          w.stateTimer = 0;
        }
        break;
      }

      case 'night': {
        // Slight deepening of the purple before the storm
        const t = Phaser.Math.Clamp(w.stateTimer / w.nightDuration, 0, 1);
        const eased = Phaser.Math.Easing.Sine.InOut(t);

        // Go from 0.7 → 0.85 darkness over the night
        w.darkness = Phaser.Math.Linear(0.7, 0.85, eased);
        this.setOverlay(w.darkness, 0x201038);

        if (t >= 1) {
          w.state = 'storm';
          w.stateTimer = 0;
          w.rainIntensity = 0;
          w.nextLightning = Phaser.Math.Between(600, 1800);
        }
        break;
      }

      case 'storm': {
        // Keep a deep purple night during the storm
        this.setOverlay(w.darkness, 0x1a0f33);

        // Fade rain in over first 2 seconds with easing
        const fadeIn = Phaser.Math.Clamp(w.stateTimer / 2000, 0, 1);
        const eased = Phaser.Math.Easing.Sine.Out(fadeIn);
        w.rainIntensity = eased;

        this.updateRain(delta, width, height);
        this.updateLightning(delta);

        if (w.stateTimer >= w.stormDuration) {
          w.state = 'dawn';
          w.stateTimer = 0;
        }
        break;
      }

      case 'dawn': {
        // Fade rain and darkness out, still with a warm purple tint
        const t = Phaser.Math.Clamp(w.stateTimer / w.dawnDuration, 0, 1);
        const eased = Phaser.Math.Easing.Sine.InOut(t);

        // Darkness 0.85 → 0
        w.darkness = Phaser.Math.Linear(0.85, 0, eased);
        this.setOverlay(w.darkness, 0x2a183b);

        // Rain 1 → 0
        w.rainIntensity = Phaser.Math.Linear(1, 0, eased);
        this.updateRain(delta, width, height);

        if (t >= 1) {
          // Back to day; randomize next day a bit
          w.state = 'day';
          w.stateTimer = 0;
          w.dayDuration = Phaser.Math.Between(40000, 60000);
          w.rainIntensity = 0;
          this.clearRain();
          this.setOverlay(0, this.overlayBaseColor);
        }
        break;
      }
    }
  }

  private updateFalconSpawning(delta: number): void {
    if (this.aliveBudgiesCache.length === 0) {
      return;
    }

    this.nextFalconSpawn -= delta;
    if (this.nextFalconSpawn > 0) {
      return;
    }

    this.spawnFalcon();

    // Progressive difficulty - faster spawning over time
    const difficultyMultiplier = Math.max(0.3, 1 - (this.gameTime / 120000)); // Reaches 30% of original rate after 2 minutes
    const spawnRate = this.baseFalconSpawnRate * difficultyMultiplier;
    this.nextFalconSpawn = Phaser.Math.Between(spawnRate * 0.5, spawnRate * 1.2);
  }

  private spawnFalcon(): void {
    const { width } = this.scale;
    if (this.aliveBudgiesCache.length === 0) return;

    const targetBudgie = Phaser.Utils.Array.GetRandom(this.aliveBudgiesCache);
    const targetIndex = this.budgies.indexOf(targetBudgie);

    // Cycle through bird variants A, B, C, D
    const variants = ['a', 'b', 'c', 'd'];
    const variantKey = variants[this.currentFalconVariant];
    this.currentFalconVariant = (this.currentFalconVariant + 1) % 4;

    const spawnY = targetBudgie.y + Phaser.Math.Between(-80, 80);

    // Use object pooling: get or create
    const falcon = this.falconGroup.get(width + 80, spawnY, `falcon_${variantKey}_1`) as Phaser.Physics.Arcade.Sprite;

    if (!falcon) return;

    falcon.setActive(true);
    falcon.setVisible(true);
    falcon.setTexture(`falcon_${variantKey}_1`); // Ensure correct texture if reused

    // Re-enable physics body (critical for pooled sprites)
    falcon.enableBody(true, width + 80, spawnY, true, true);

    falcon.setDepth(50);
    falcon.setScale(gameConfig.birdScale * 0.9);
    falcon.setFlipX(true);
    falcon.play(`falcon_${variantKey}_fly`);
    // Resize hitbox to match scaled sprite
    const falconRadius = falcon.width * 0.4;
    if (falcon.body) {
      falcon.body.setCircle(falconRadius);
      falcon.body.setOffset((falcon.width - falconRadius * 2) / 2, (falcon.height - falconRadius * 2) / 2);
    }

    const speed = Phaser.Math.Between(180, 230);

    falcon.setData('phase', 'approach' as FalconPhase);
    falcon.setData('speed', speed);
    falcon.setData('targetIndex', targetIndex);
  }

  private updateFalcons(delta: number): void {
    const dt = delta * 0.001;
    const { height } = this.scale;

    const children = this.falconGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];

    for (const falcon of children) {
      if (!falcon.active) continue;

      const phase = (falcon.getData('phase') as FalconPhase) ?? 'approach';
      const speed = (falcon.getData('speed') as number) ?? 200;
      const targetIndex = falcon.getData('targetIndex') as number;
      const targetBudgie = this.budgies[targetIndex];

      // If no valid budgie, just drift off-screen
      if (!targetBudgie || !targetBudgie.active) {
        falcon.setVelocity(-speed, 0);
        if (falcon.x < -100) {
          this.killEnemy(falcon);
        }
        continue;
      }

      switch (phase) {
        case 'approach': {
          falcon.setVelocity(-speed, 0);

          // Smoothly align vertically with the budgie
          const desiredY = targetBudgie.y;
          falcon.y = Phaser.Math.Linear(falcon.y, desiredY, 0.03);

          const dx = falcon.x - targetBudgie.x;
          if (dx < 220) {
            falcon.setData('phase', 'dive' as FalconPhase);
          }
          break;
        }

        case 'dive': {
          // Dive harder at the budgie
          const dx = falcon.x - targetBudgie.x;
          const dy = targetBudgie.y - falcon.y;

          falcon.setVelocity(-speed * 1.1, Phaser.Math.Clamp(dy * 4, -260, 260));

          // "Low range" check: only count as a hit when close
          const dist = Phaser.Math.Distance.Between(falcon.x, falcon.y, targetBudgie.x, targetBudgie.y);

          if (dist < 36) {
            this.handleFalconHitsBudgie(falcon, targetBudgie);
            // handleFalconHitsBudgie will destroy or disable falcon as needed
          } else if (dx < -60 || falcon.y < 0 || falcon.y > height + 40) {
            // Missed – transition to escape
            falcon.setData('phase', 'escape' as FalconPhase);
          }
          break;
        }

        case 'escape': {
          falcon.setVelocity(-speed, -40);
          if (falcon.x < -100 || falcon.y < -80) {
            this.killEnemy(falcon);
          }
          break;
        }
      }
    }
  }

  private updateBatSpawning(delta: number): void {
    // Only spawn bats during night or storm
    if (this.weather.state !== 'night' && this.weather.state !== 'storm') {
      this.nextBatSpawn = 0;
      return;
    }

    if (this.aliveBudgiesCache.length === 0) {
      return;
    }

    this.nextBatSpawn -= delta;
    if (this.nextBatSpawn > 0) {
      return;
    }

    this.spawnBat();

    // Progressive difficulty - faster spawning over time
    const difficultyMultiplier = Math.max(0.4, 1 - (this.gameTime / 150000)); // Reaches 40% of original rate after 2.5 minutes
    const spawnRate = this.baseBatSpawnRate * difficultyMultiplier;
    this.nextBatSpawn = Phaser.Math.Between(spawnRate * 0.7, spawnRate * 1.4);
  }

  private spawnBat(): void {
    const { width } = this.scale;
    if (this.aliveBudgiesCache.length === 0) return;

    const targetBudgie = Phaser.Utils.Array.GetRandom(this.aliveBudgiesCache);
    const targetIndex = this.budgies.indexOf(targetBudgie);

    const spawnY = targetBudgie.y + Phaser.Math.Between(-40, 40);

    // Use object pooling
    const bat = this.batGroup.get(width + 80, spawnY, 'bat_fly_1') as Phaser.Physics.Arcade.Sprite;

    if (!bat) return;

    bat.setActive(true);
    bat.setVisible(true);

    // Re-enable physics body (critical for pooled sprites)
    bat.enableBody(true, width + 80, spawnY, true, true);

    bat.setDepth(55);
    bat.setScale(gameConfig.birdScale * 0.8);
    bat.setFlipX(true);
    bat.play('bat_fly');
    // Resize hitbox to match scaled sprite
    const batRadius = bat.width * 0.4;
    if (bat.body) {
      bat.body.setCircle(batRadius);
      bat.body.setOffset((bat.width - batRadius * 2) / 2, (bat.height - batRadius * 2) / 2);
    }

    const speed = Phaser.Math.Between(160, 210);

    bat.setData('phase', 'loop' as BatPhase);
    bat.setData('speed', speed);
    bat.setData('targetIndex', targetIndex);
    bat.setData('phaseTime', 0);
    bat.setData('baseY', spawnY);
    bat.setData('hasHit', false);
  }

  private updateBats(delta: number): void {
    const dt = delta * 0.001;

    const children = this.batGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];

    for (const bat of children) {
      if (!bat.active) continue;

      const phase = (bat.getData('phase') as BatPhase) ?? 'loop';
      const speed = (bat.getData('speed') as number) ?? 180;
      const targetIndex = bat.getData('targetIndex') as number;
      const targetBudgie = this.budgies[targetIndex];
      let phaseTime = (bat.getData('phaseTime') as number) ?? 0;
      const baseY = (bat.getData('baseY') as number) ?? bat.y;

      phaseTime += dt;
      bat.setData('phaseTime', phaseTime);

      if (!targetBudgie || !targetBudgie.active) {
        bat.setVelocity(-speed, 0);
        if (bat.x < -100) {
          this.killEnemy(bat);
        }
        continue;
      }

      switch (phase) {
        case 'loop': {
          // Loop-de-loop / sinusoidal path while moving left
          const amplitude = 80;
          const freq = 1; // loops per second

          const offsetY = Math.sin(phaseTime * freq * Math.PI * 2) * amplitude;
          bat.x -= speed * dt;
          bat.y = baseY + offsetY;

          // When near budgie x, enter attack phase
          const dx = bat.x - targetBudgie.x;
          if (dx < 200) {
            bat.setData('phase', 'attack' as BatPhase);
          }
          break;
        }

        case 'attack': {
          // Home in on the budgie
          const dx = targetBudgie.x - bat.x;
          const dy = targetBudgie.y - bat.y;

          const vx = Phaser.Math.Clamp(dx * 3, -speed, speed);
          const vy = Phaser.Math.Clamp(dy * 3, -220, 220);
          bat.setVelocity(vx - speed, vy);

          const dist = Phaser.Math.Distance.Between(bat.x, bat.y, targetBudgie.x, targetBudgie.y);

          if (!bat.getData('hasHit') && dist < 32) {
            this.handleBatHitsBudgie(bat, targetBudgie);
            bat.setData('hasHit', true);
          }

          if (bat.x < -100) {
            this.killEnemy(bat);
          }
          break;
        }
      }
    }
  }

  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    enemy.setActive(false);
    enemy.setVisible(false);
    enemy.setPosition(2000, 0); // Move way off screen
    enemy.setVelocity(0, 0);
  }

  private handlePatriotHitsFalcon(
    _playerObj: Phaser.GameObjects.GameObject,
    falconObj: Phaser.GameObjects.GameObject
  ): void {
    const falcon = falconObj as Phaser.Physics.Arcade.Sprite;
    if (!falcon.active) return;

    this.playEnemyExplosion(falcon);
  }

  private handlePatriotHitsBat(
    _playerObj: Phaser.GameObjects.GameObject,
    batObj: Phaser.GameObjects.GameObject
  ): void {
    const bat = batObj as Phaser.Physics.Arcade.Sprite;
    if (!bat.active) return;

    this.playEnemyExplosion(bat);
  }

  private handlePatriotHitsBee(
    _playerObj: Phaser.GameObjects.GameObject,
    beeObj: Phaser.GameObjects.GameObject
  ): void {
    const bee = beeObj as Phaser.Physics.Arcade.Sprite;
    if (!bee.active || this.isGameOver) return;

    // Destroy the bee
    bee.destroy();

    // Patriot dies (unless invincible)
    if (!this.isInvincible) {
      this.triggerGameOver();
    }
  }

  private handleFalconHitsBudgie(
    falconObj: Phaser.GameObjects.GameObject,
    budgieObj: Phaser.GameObjects.GameObject
  ): void {
    const falcon = falconObj as Phaser.Physics.Arcade.Sprite;
    const budgie = budgieObj as Phaser.Physics.Arcade.Sprite;

    if (!falcon.active || !budgie.active) return;

    // Budgie getting hit should not award player points
    this.playEnemyExplosion(falcon, false);
    
    // Only hurt budgie if not invincible
    if (!this.isInvincible) {
      this.markBudgieHit(budgie);
    }
  }

  private handleBatHitsBudgie(
    batObj: Phaser.GameObjects.GameObject,
    budgieObj: Phaser.GameObjects.GameObject
  ): void {
    const bat = batObj as Phaser.Physics.Arcade.Sprite;
    const budgie = budgieObj as Phaser.Physics.Arcade.Sprite;

    if (!bat.active || !budgie.active) return;

    // Budgie getting hit should not award player points
    this.playEnemyExplosion(bat, false);
    
    // Only hurt budgie if not invincible
    if (!this.isInvincible) {
      this.markBudgieHit(budgie);
    }
  }

  private playEnemyExplosion(enemy: Phaser.Physics.Arcade.Sprite, givePoints: boolean = true): void {
    // Disable physics but keep sprite visible for explosion animation
    enemy.disableBody(true, false);
    enemy.setVelocity(0, 0);

    // Award points for defeating enemies
    if (givePoints) {
      this.incrementScore(25);
      this.enemiesDefeated++;

      telemetry.recordEvent('enemy_defeated', {
        enemyTexture: enemy.texture.key,
        score: this.score,
      });

      // Show floating score text
      this.showFloatingText(enemy.x, enemy.y, '+25');
    }

    // Play poof sound immediately using direct play (fastest method)
    this.sound.play('poof_sound', { volume: 1.5 });

    // Create explosion sprite at enemy position
    const explosion = this.add.sprite(enemy.x, enemy.y, 'explode_1');
    explosion.setScale(enemy.scale * 1.2);
    explosion.setDepth(enemy.depth + 1);

    // Play explosion animation
    explosion.play('enemy_explode');

    // Hide original enemy immediately and destroy both after animation
    enemy.setVisible(false);

    explosion.on('animationcomplete', () => {
      explosion.destroy();
      this.killEnemy(enemy);
    });
  }

  private markBudgieHit(budgie: Phaser.Physics.Arcade.Sprite): void {
    if (!budgie.active || budgie.getData('isHit')) return;

    budgie.setData('isHit', true);
    budgie.setData('flashCount', 0);

    // Switch to hit animation immediately
    budgie.play('budgie_hit');

    // Flash the budgie 3 times, then disappear
    this.flashBudgie(budgie, 0);
  }

  private flashBudgie(budgie: Phaser.Physics.Arcade.Sprite, flashCount: number): void {
    if (!budgie.active || flashCount >= 3) {
      // After 3 flashes, make budgie disappear
      budgie.setAlpha(0);
      budgie.disableBody(true, true);
      return;
    }

    // Flash sequence: visible -> invisible -> visible
    this.tweens.add({
      targets: budgie,
      alpha: 0,
      duration: 100,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        // After one complete flash, do the next one
        this.time.delayedCall(150, () => {
          this.flashBudgie(budgie, flashCount + 1);
        });
      }
    });
  }

  private updateRain(delta: number, width: number, height: number): void {
    const w = this.weather;

    if (!w.rainEmitter) {
      console.error('Rain emitter is null in updateRain!');
      return;
    }

    if (w.rainIntensity <= 0.01) {
      // Turn off rain
      w.rainEmitter.emitting = false;
      return;
    }

    // Turn on rain
    if (!w.rainEmitter.emitting) {
      w.rainEmitter.emitting = true;
      console.log('Rain turned ON! Intensity:', w.rainIntensity);
    }

    // Adjust frequency based on intensity (higher intensity = lower frequency value = more particles)
    // Intensity 0.1 -> freq 100ms
    // Intensity 1.0 -> freq 10ms
    const freq = Phaser.Math.Linear(100, 10, w.rainIntensity);
    w.rainEmitter.setFrequency(freq);

    // Adjust particle alpha based on rain intensity
    w.rainEmitter.setParticleAlpha(0.6 * w.rainIntensity + 0.4);
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
    if (w.rainEmitter) {
      w.rainEmitter.emitting = false;
    }
  }

  private setOverlay(alpha: number, color: number): void {
    this.nightOverlay.setFillStyle(color, alpha);
    this.nightOverlay.setAlpha(alpha);
  }

  private spawnBee(): void {
    if (this.aliveBudgiesCache.length === 0) return;

    const { width } = this.scale;
    const targetBudgie = Phaser.Utils.Array.GetRandom(this.aliveBudgiesCache);

    // Spawn off-screen right
    const spawnX = width + 50;
    const spawnY = targetBudgie.y;

    const bee = this.bees.get(spawnX, spawnY, 'bee_1') as Phaser.Physics.Arcade.Sprite | null;
    if (!bee) return;

    bee.setActive(true);
    bee.setVisible(true);

    // Re-enable physics body (critical for pooled sprites)
    bee.enableBody(true, spawnX, spawnY, true, true);

    bee.setScale(gameConfig.beeScale);
    bee.setFlipX(true); // Flip to face left
    bee.setDepth(60);
    bee.play('bee_fly');
    // Resize hitbox to match scaled sprite
    const beeRadius = bee.width * 0.4;
    if (bee.body) {
      bee.body.setCircle(beeRadius);
      bee.body.setOffset((bee.width - beeRadius * 2) / 2, (bee.height - beeRadius * 2) / 2);
    }

    // Move left towards budgies, speeding up over time
    bee.setVelocityX(-this.beeSpeed);

    // Increase speed for next spawn (cap at 800)
    this.beeSpeed = Math.min(this.beeSpeed + 10, 800);
  }

  private incrementScore(amount: number): void {
    this.score += amount;
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score}`);
    }
  }

  private triggerGameOver(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // CRITICAL: Pause physics to prevent post-game collisions
    this.physics.pause();

    // Stop all timers to prevent bee spawning during death animation
    this.time.removeAllEvents();

    // Disable all collision overlaps to prevent score changes
    this.physics.world.colliders.removeAll();

    // Stop the game music
    if (this.gameMusic) {
      this.gameMusic.stop();
    }

    // Play dizzy/spin sound effect
    if (this.dizzySound) {
      this.dizzySound.play();
    }

    // Stop player movement and play dizzy animation
    this.player.setVelocity(0, 0);
    this.player.play('player_dizzy');

    // After dizzy animation plays for a bit, play faint
    this.time.delayedCall(1500, () => {
      this.player.play('player_faint');

      // After faint animation, fade out and go to game over
      this.player.once('animationcomplete', () => {
        this.cameras.main.fadeOut(800, 0, 0, 0);

        this.time.delayedCall(800, () => {
          const survivalTime = Math.floor((Date.now() - this.startTime) / 1000);
          const budgiesSaved = this.aliveBudgiesCache.length;
          telemetry.recordEvent('game_over', {
            score: this.score,
            enemiesDefeated: this.enemiesDefeated,
            survivalTime,
            budgiesSaved,
          });
          this.scene.start('GameOverScene', {
            score: this.score,
            enemiesDefeated: this.enemiesDefeated,
            survivalTime: survivalTime,
            budgiesSaved: budgiesSaved,
          });
        });
      });
    });
  }

  private showTouchFeedback(zone: 'top' | 'bottom'): void {
    // Disable touch feedback visual - it was causing white flashes
    // Keep the function for potential future use with a more subtle effect
  }

  private hideTouchFeedback(): void {
    this.touchZoneTop.setAlpha(0);
    this.touchZoneBottom.setAlpha(0);
  }

  private showFloatingText(x: number, y: number, text: string, color: string = '#ffff00'): void {
    const floatingText = this.add.text(x, y - 20, text, {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
    }).setDepth(200);

    this.tweens.add({
      targets: floatingText,
      y: y - 60,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => floatingText.destroy(),
    });
  }

}

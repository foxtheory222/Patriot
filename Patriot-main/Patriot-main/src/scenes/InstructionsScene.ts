import Phaser from 'phaser';

// Icon position config
const iconConfig = {
  // Characters row
  patriotX: 260,
  patriotY: 222,
  patriotScale: 0.08,
  patriotFlip: false,
  
  budgieX: 510,
  budgieY: 223,
  budgieScale: 0.035,
  budgieFlip: false,
  
  beeX: 765,
  beeY: 220,
  beeScale: 0.065,
  beeFlip: false,
  
  // Enemies row
  falconX: 339,
  falconY: 308,
  falconScale: 0.065,
  falconFlip: false,
  
  batX: 683,
  batY: 308,
  batScale: 0.06,
  batFlip: false,
};

export default class InstructionsScene extends Phaser.Scene {
  private instructionsMusic!: Phaser.Sound.BaseSound;
  private iconSprites: { [key: string]: Phaser.GameObjects.Image } = {};

  constructor() {
    super('InstructionsScene');
  }

  preload(): void {
    this.load.image('instructions_bg', 'assets/scenes/instructions/instructions.png');
    this.load.audio('instructions_music', 'assets/music/instructions/awesomeness.wav');
    
    // Load sprites for visuals
    this.load.image('player_fly_1', 'assets/player/flying-1.png');
    this.load.image('budgie_fly_1', 'assets/budgie/frame-1.png');
    this.load.image('falcon_a_1', 'assets/AttackBirds/Bird A/frame-1.png');
    this.load.image('bat_fly_1', 'assets/bat/frame-1.png');
    this.load.image('bee_1', 'assets/Bee/frame-1.png');

    // Button click sound
    this.load.audio('click_sound', 'assets/music/mouse-click-290204.mp3');
  }

  create(): void {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.image(width / 2, height / 2, 'instructions_bg');
    bg.setDisplaySize(width, height);

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a, 0.85);

    // Title
    this.add.text(width / 2 + 2, 28, 'HOW TO PLAY', {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: '32px',
      color: '#000000',
    }).setOrigin(0.5).setAlpha(0.5);

    this.add.text(width / 2, 26, 'HOW TO PLAY', {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: '32px',
      color: '#FFD700',
      stroke: '#8B4513',
      strokeThickness: 3,
    }).setOrigin(0.5);

    let y = 58;

    // Mission Statement - Canadian Theme
    this.createCard(width / 2, y, width * 0.9, 48, '\u{1F341} YOUR MISSION \u{1F341}', 0x8B0000);
    this.add.text(width / 2, y + 28, "Protect Canada's proudest treasure: The Budgie.", {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#FFFFFF',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    y += 58;

    // Controls Card - Simplified
    this.createCard(width / 2, y, width * 0.9, 55, 'CONTROLS', 0x006633);
    y += 20;
    
    this.add.text(width / 2, y + 10, '\u{1F446} TAP TOP = Fly Up', { fontFamily: 'Arial Black', fontSize: '13px', color: '#88FF88' }).setOrigin(0.5);
    this.add.text(width / 2, y + 32, '\u{1F447} TAP BOTTOM = Fly Down', { fontFamily: 'Arial Black', fontSize: '13px', color: '#FF8888' }).setOrigin(0.5);
    y += 48;

    // Characters Card - Clean grid layout
    this.createCard(width / 2, y, width * 0.9, 78, 'CHARACTERS', 0x0055aa);
    y += 18;
    
    // Row with images - using config for positions
    const charY = y + 20;
    const spacing = width / 4;
    
    // Store references for live updates
    this.iconSprites.patriot = this.add.image(iconConfig.patriotX, iconConfig.patriotY, 'player_fly_1')
      .setScale(iconConfig.patriotScale)
      .setFlipX(iconConfig.patriotFlip)
      .setOrigin(0.5);
    this.add.text(spacing, charY + 28, 'PATRIOT', { fontFamily: 'Arial Black', fontSize: '9px', color: '#FFD700' }).setOrigin(0.5);
    this.add.text(spacing, charY + 40, '(You)', { fontFamily: 'Arial', fontSize: '8px', color: '#AAAAAA' }).setOrigin(0.5);
    
    this.iconSprites.budgie = this.add.image(iconConfig.budgieX, iconConfig.budgieY, 'budgie_fly_1')
      .setScale(iconConfig.budgieScale)
      .setFlipX(iconConfig.budgieFlip)
      .setOrigin(0.5);
    this.add.text(spacing * 2, charY + 28, 'BUDGIES', { fontFamily: 'Arial Black', fontSize: '9px', color: '#88FF88' }).setOrigin(0.5);
    this.add.text(spacing * 2, charY + 40, '(Protect)', { fontFamily: 'Arial', fontSize: '8px', color: '#AAAAAA' }).setOrigin(0.5);
    
    this.iconSprites.bee = this.add.image(iconConfig.beeX, iconConfig.beeY, 'bee_1')
      .setScale(iconConfig.beeScale)
      .setFlipX(iconConfig.beeFlip)
      .setOrigin(0.5);
    this.add.text(spacing * 3, charY + 28, 'BEES', { fontFamily: 'Arial Black', fontSize: '9px', color: '#FFFF66' }).setOrigin(0.5);
    this.add.text(spacing * 3, charY + 40, '(Food)', { fontFamily: 'Arial', fontSize: '8px', color: '#AAAAAA' }).setOrigin(0.5);
    y += 72;

    // Enemies Card - Clean layout
    this.createCard(width / 2, y, width * 0.9, 65, 'ENEMIES', 0x992222);
    y += 18;
    
    const enemyY = y + 15;
    this.iconSprites.falcon = this.add.image(iconConfig.falconX, iconConfig.falconY, 'falcon_a_1')
      .setScale(iconConfig.falconScale)
      .setFlipX(iconConfig.falconFlip)
      .setOrigin(0.5);
    this.add.text(width * 0.33, enemyY + 25, 'FALCONS', { fontFamily: 'Arial Black', fontSize: '9px', color: '#FF9999' }).setOrigin(0.5);
    this.add.text(width * 0.33, enemyY + 37, '(Day)', { fontFamily: 'Arial', fontSize: '8px', color: '#AAAAAA' }).setOrigin(0.5);
    
    this.iconSprites.bat = this.add.image(iconConfig.batX, iconConfig.batY, 'bat_fly_1')
      .setScale(iconConfig.batScale)
      .setFlipX(iconConfig.batFlip)
      .setOrigin(0.5);
    this.add.text(width * 0.67, enemyY + 25, 'BATS', { fontFamily: 'Arial Black', fontSize: '9px', color: '#CC99FF' }).setOrigin(0.5);
    this.add.text(width * 0.67, enemyY + 37, '(Night)', { fontFamily: 'Arial', fontSize: '8px', color: '#AAAAAA' }).setOrigin(0.5);
    y += 58;

    // Tips Card - Concise
    this.createCard(width / 2, y, width * 0.9, 42, 'TIPS', 0x555555);
    this.add.text(width / 2, y + 26, 'Crash into enemies! \u2022 Budgies eat bees for points!', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#CCCCCC',
    }).setOrigin(0.5);

    // Back Button
    this.createPolishedButton(width / 2, height - 38, 'BACK TO MENU', 0x884400, 0xcc6600, () => {
      this.instructionsMusic?.stop();
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.time.delayedCall(350, () => this.scene.start('MainMenuScene'));
    });

    // Music (wait for user interaction if audio is locked)
    this.instructionsMusic = this.sound.add('instructions_music', { loop: true, volume: 0.4 });
    if (this.sound.locked) {
      this.sound.once('unlocked', () => {
        this.instructionsMusic.play();
      });
    } else {
      this.instructionsMusic.play();
    }

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private createCard(x: number, y: number, w: number, h: number, title: string, color: number): void {
    // Shadow
    this.add.rectangle(x + 2, y + h/2 + 2, w, h, 0x000000, 0.3).setOrigin(0.5);
    
    // Card bg
    const card = this.add.graphics();
    card.fillStyle(color, 0.9);
    card.fillRoundedRect(x - w/2, y, w, h, 8);
    card.lineStyle(1, 0xffffff, 0.15);
    card.strokeRoundedRect(x - w/2, y, w, h, 8);

    // Title
    this.add.text(x, y + 2, title, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '12px',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0).setAlpha(0.95);
  }

  private createPolishedButton(x: number, y: number, text: string, baseColor: number, hoverColor: number, callback: () => void): void {
    const buttonWidth = 180;
    const buttonHeight = 38;
    
    const container = this.add.container(x, y);
    
    const shadow = this.add.rectangle(0, 3, buttonWidth, buttonHeight, 0x000000, 0.35);
    
    const buttonBody = this.add.graphics();
    buttonBody.fillStyle(baseColor, 1);
    buttonBody.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
    
    const highlight = this.add.graphics();
    highlight.fillStyle(0xffffff, 0.12);
    highlight.fillRoundedRect(-buttonWidth/2 + 3, -buttonHeight/2 + 3, buttonWidth - 6, buttonHeight/3, 4);
    
    const border = this.add.graphics();
    border.lineStyle(2, 0xffffff, 0.2);
    border.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
    
    const textShadow = this.add.text(1, 1, text, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '14px',
      color: '#000000',
    }).setOrigin(0.5).setAlpha(0.4);
    
    const buttonText = this.add.text(0, 0, text, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    
    container.add([shadow, buttonBody, highlight, border, textShadow, buttonText]);
    container.setSize(buttonWidth, buttonHeight);
    container.setInteractive({ useHandCursor: true });
    container.setDepth(20);
    
    container.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100, ease: 'Sine.easeOut' });
      buttonBody.clear();
      buttonBody.fillStyle(hoverColor, 1);
      buttonBody.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
    });

    container.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100, ease: 'Sine.easeOut' });
      buttonBody.clear();
      buttonBody.fillStyle(baseColor, 1);
      buttonBody.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 8);
    });

    container.on('pointerdown', () => {
      this.sound.play('click_sound', { volume: 0.4 });
      container.setScale(0.95);
      container.y += 2;
    });
    container.on('pointerup', () => { container.setScale(1); container.y -= 2; callback(); });
  }

  update(): void {
    // Update icon positions from config (for live settings adjustment)
    if (this.iconSprites.patriot) {
      this.iconSprites.patriot.setPosition(iconConfig.patriotX, iconConfig.patriotY);
      this.iconSprites.patriot.setScale(iconConfig.patriotScale);
      this.iconSprites.patriot.setFlipX(iconConfig.patriotFlip);
    }
    if (this.iconSprites.budgie) {
      this.iconSprites.budgie.setPosition(iconConfig.budgieX, iconConfig.budgieY);
      this.iconSprites.budgie.setScale(iconConfig.budgieScale);
      this.iconSprites.budgie.setFlipX(iconConfig.budgieFlip);
    }
    if (this.iconSprites.bee) {
      this.iconSprites.bee.setPosition(iconConfig.beeX, iconConfig.beeY);
      this.iconSprites.bee.setScale(iconConfig.beeScale);
      this.iconSprites.bee.setFlipX(iconConfig.beeFlip);
    }
    if (this.iconSprites.falcon) {
      this.iconSprites.falcon.setPosition(iconConfig.falconX, iconConfig.falconY);
      this.iconSprites.falcon.setScale(iconConfig.falconScale);
      this.iconSprites.falcon.setFlipX(iconConfig.falconFlip);
    }
    if (this.iconSprites.bat) {
      this.iconSprites.bat.setPosition(iconConfig.batX, iconConfig.batY);
      this.iconSprites.bat.setScale(iconConfig.batScale);
      this.iconSprites.bat.setFlipX(iconConfig.batFlip);
    }
  }
}

import Phaser from 'phaser';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';

export default class MainMenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private menuMusic!: Phaser.Sound.BaseSound;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private eagle!: Phaser.GameObjects.Sprite;
  private buttons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('MainMenuScene');
  }

  preload(): void {
    // Main menu assets
    this.load.image('menu_bg', 'assets/scenes/mainMenu/mainMenu.jpg');
    this.load.audio('menu_music', [
      'assets/music/titleScreen/maxkomusic-true-patriot.mp3',
      'assets/music/titleScreen/maxkomusic-true-patriot.ogg'
    ]);
    
    // Eagle for animation
    this.load.image('player_fly_1', 'assets/player/flying-1.png');
    this.load.image('player_fly_2', 'assets/player/flying-2.png');
    this.load.image('player_fly_3', 'assets/player/flying-3.png');
    this.load.image('player_fly_4', 'assets/player/flying-4.png');

    // Particle texture
    this.load.image('star', 'assets/player/flying-1.png');

    // Button click sound
    this.load.audio('click_sound', [
      'assets/music/mouse-click-290204.mp3',
      'assets/music/mouse-click-290204.ogg'
    ]);
  }

  create(): void {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.image(width / 2, height / 2, 'menu_bg');
    bg.setDisplaySize(width, height);

    // Semi-transparent overlay for better text visibility
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000033, 0.4);

    // Create eagle flying animation
    if (!this.anims.exists('eagle_fly_menu')) {
      this.anims.create({
        key: 'eagle_fly_menu',
        frames: [
          { key: 'player_fly_1' },
          { key: 'player_fly_2' },
          { key: 'player_fly_3' },
          { key: 'player_fly_4' },
        ],
        frameRate: 10,
        repeat: -1,
      });
    }

    // Animated eagle flying across the screen
    this.eagle = this.add.sprite(-100, height * 0.25, 'player_fly_1');
    this.eagle.setScale(0.12);
    this.eagle.play('eagle_fly_menu');
    this.eagle.setDepth(5);

    // Eagle flight path animation
    this.tweens.add({
      targets: this.eagle,
      x: width + 100,
      y: height * 0.3,
      duration: 8000,
      ease: 'Sine.easeInOut',
      repeat: -1,
      onRepeat: () => {
        this.eagle.x = -100;
        this.eagle.y = Phaser.Math.Between(height * 0.15, height * 0.35);
      }
    });

    // Glowing title with shadow
    const titleShadow = this.add.text(width / 2 + 4, 84, 'PATRIOT', {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: '72px',
      color: '#000000',
    });
    titleShadow.setOrigin(0.5);
    titleShadow.setAlpha(0.5);

    this.titleText = this.add.text(width / 2, 80, 'PATRIOT', {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: '72px',
      color: '#FFD700',
      stroke: '#8B0000',
      strokeThickness: 6,
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setDepth(10);

    // Pulsing glow effect on title
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    const subtitle = this.add.text(width / 2, 145, 'Defend the Skies!', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'italic',
    });
    subtitle.setOrigin(0.5);
    subtitle.setAlpha(0.9);

    // Create menu buttons with polished design
    const buttonY = height * 0.52;
    const buttonSpacing = 65;

    this.createPolishedButton(width / 2, buttonY, 'START GAME', 0x00aa00, 0x00ff44, () => {
      this.menuMusic?.stop();
      this.scene.start('GameScene');
    });

    this.createPolishedButton(width / 2, buttonY + buttonSpacing, 'INSTRUCTIONS', 0x0077cc, 0x00aaff, () => {
      this.menuMusic?.stop();
      this.scene.start('InstructionsScene');
    });

    this.createPolishedButton(width / 2, buttonY + buttonSpacing * 2, 'HIGH SCORES', 0xcc8800, 0xffaa00, () => {
      this.menuMusic?.stop();
      this.scene.start('ScoreScene');
    });

    this.createPolishedButton(width / 2, buttonY + buttonSpacing * 3, 'QUIT', 0x880000, 0xcc2222, async () => {
      // iOS App Store rejects programmatic exits - show message instead
      // Android allows App.exitApp()
      
      if ((window as any).Capacitor) {
        try {
          const info = await Device.getInfo();
          
          if (info.platform === 'ios') {
            // iOS - show message (programmatic exit disallowed by Apple)
            const quitText = this.add.text(width / 2, height / 2, 'Press home button to exit', {
              fontFamily: 'Arial Black',
              fontSize: '24px',
              color: '#FFFFFF',
              stroke: '#000000',
              strokeThickness: 4,
              backgroundColor: '#000000AA',
              padding: { x: 20, y: 10 }
            }).setOrigin(0.5).setDepth(1000);
            
            this.tweens.add({
              targets: quitText,
              alpha: 0,
              duration: 3000,
              delay: 2000,
              onComplete: () => quitText.destroy()
            });
          } else {
            // Android - allowed to exit
            App.exitApp();
          }
        } catch (err) {
          console.error('Error detecting platform:', err);
          // Fallback to exit attempt
          App.exitApp();
        }
        return;
      }
      
      // Try Cordova exit (Android)
      if ((window as any).cordova && (window as any).navigator?.app) {
        (window as any).navigator.app.exitApp();
        return;
      }
      
      // Web fallback - show message
      const quitText = this.add.text(width / 2, height / 2, 'Press back button or home to exit', {
        fontFamily: 'Arial Black',
        fontSize: '24px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 4,
        backgroundColor: '#000000AA',
        padding: { x: 20, y: 10 }
      }).setOrigin(0.5).setDepth(1000);
      
      this.tweens.add({
        targets: quitText,
        alpha: 0,
        duration: 3000,
        delay: 2000,
        onComplete: () => quitText.destroy()
      });
    });

    // Decorative stars/sparkles
    this.createSparkles(width, height);

    // Footer text
    const footer = this.add.text(width / 2, height - 30, '© 2025 ArcticFox Games', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#AAAAAA',
    });
    footer.setOrigin(0.5);

    // Play menu music (wait for user interaction if audio is locked)
    this.menuMusic = this.sound.add('menu_music', { loop: true, volume: 0.5 });
    if (this.sound.locked) {
      this.sound.once('unlocked', () => {
        this.menuMusic.play();
      });
    } else {
      this.menuMusic.play();
    }

    // Fade in effect
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  private createPolishedButton(x: number, y: number, text: string, baseColor: number, hoverColor: number, callback: () => void): void {
    const buttonWidth = 240;
    const buttonHeight = 44;
    
    const container = this.add.container(x, y);
    
    // Drop shadow
    const shadow = this.add.rectangle(0, 4, buttonWidth, buttonHeight, 0x000000, 0.35);
    
    // Main button body
    const buttonBody = this.add.graphics();
    buttonBody.fillStyle(baseColor, 1);
    buttonBody.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    
    // Subtle top highlight
    const highlight = this.add.graphics();
    highlight.fillStyle(0xffffff, 0.12);
    highlight.fillRoundedRect(-buttonWidth/2 + 3, -buttonHeight/2 + 3, buttonWidth - 6, buttonHeight/2.5, 6);
    
    // Clean border
    const border = this.add.graphics();
    border.lineStyle(2, 0xffffff, 0.2);
    border.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    
    // Text with subtle shadow
    const textShadow = this.add.text(1, 1, text, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '18px',
      color: '#000000',
    }).setOrigin(0.5).setAlpha(0.4);
    
    const buttonText = this.add.text(0, 0, text, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    
    container.add([shadow, buttonBody, highlight, border, textShadow, buttonText]);
    container.setSize(buttonWidth, buttonHeight);
    container.setInteractive({ useHandCursor: true });
    container.setDepth(20);
    
    this.buttons.push(container);
    
    container.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100, ease: 'Sine.easeOut' });
      buttonBody.clear();
      buttonBody.fillStyle(hoverColor, 1);
      buttonBody.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
      border.clear();
      border.lineStyle(2, 0xffffff, 0.4);
      border.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    });

    container.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100, ease: 'Sine.easeOut' });
      buttonBody.clear();
      buttonBody.fillStyle(baseColor, 1);
      buttonBody.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
      border.clear();
      border.lineStyle(2, 0xffffff, 0.2);
      border.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    });

    container.on('pointerdown', () => {
      this.sound.play('click_sound', { volume: 0.4 });
      container.setScale(0.96);
      container.y += 2;
    });

    container.on('pointerup', () => {
      container.setScale(1);
      container.y -= 2;
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.time.delayedCall(350, callback);
    });
  }

  private createSparkles(width: number, height: number): void {
    // Create floating particles/sparkles effect
    for (let i = 0; i < 20; i++) {
      const sparkle = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 3),
        0xFFFFFF,
        Phaser.Math.FloatBetween(0.3, 0.8)
      );
      sparkle.setDepth(1);

      // Twinkle animation
      this.tweens.add({
        targets: sparkle,
        alpha: 0.1,
        duration: Phaser.Math.Between(1000, 2000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1000),
      });

      // Slow drift
      this.tweens.add({
        targets: sparkle,
        y: sparkle.y - 50,
        x: sparkle.x + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(5000, 10000),
        yoyo: true,
        repeat: -1,
      });
    }
  }
}

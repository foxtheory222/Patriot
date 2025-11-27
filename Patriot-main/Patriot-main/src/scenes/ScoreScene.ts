import Phaser from 'phaser';

export default class ScoreScene extends Phaser.Scene {
  private scoreMusic!: Phaser.Sound.BaseSound;

  constructor() {
    super('ScoreScene');
  }

  preload(): void {
    this.load.image('score_bg', 'assets/scenes/mainMenu/scoreScreen.png');
    this.load.audio('score_music', 'assets/music/hiScore/sad_game_over.wav');

    // Button click sound
    this.load.audio('click_sound', 'assets/music/mouse-click-290204.mp3');
  }

  create(): void {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.image(width / 2, height / 2, 'score_bg');
    bg.setDisplaySize(width, height);

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a, 0.85);

    // Title
    this.add.text(width / 2 + 2, 37, '\u{1F3C6} HIGH SCORES', {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: '36px',
      color: '#000000',
    }).setOrigin(0.5).setAlpha(0.5);

    this.add.text(width / 2, 35, '\u{1F3C6} HIGH SCORES', {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: '36px',
      color: '#FFD700',
      stroke: '#8B4513',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Get high scores
    const highScores = this.getHighScores();

    // Scoreboard card
    const cardY = 70;
    const cardHeight = height - 160;
    this.createCard(width / 2, cardY, width * 0.92, cardHeight, 0x1a1a2e);

    // Headers
    const headerY = cardY + 15;
    this.add.text(width * 0.15, headerY, '#', { fontFamily: 'Arial Black', fontSize: '14px', color: '#666666' }).setOrigin(0.5);
    this.add.text(width * 0.45, headerY, 'NAME', { fontFamily: 'Arial Black', fontSize: '14px', color: '#666666' }).setOrigin(0.5);
    this.add.text(width * 0.8, headerY, 'SCORE', { fontFamily: 'Arial Black', fontSize: '14px', color: '#666666' }).setOrigin(0.5);

    // Divider
    this.add.rectangle(width / 2, headerY + 18, width * 0.85, 1, 0x333333);

    // Display scores - compact layout
    const startY = headerY + 35;
    const lineHeight = 32;

    for (let i = 0; i < 10; i++) {
      const y = startY + i * lineHeight;
      const score = highScores[i];
      const rank = i + 1;

      // Colors and medals
      let rankColor = '#AAAAAA';
      let medal = `${rank}`;
      if (rank === 1) { rankColor = '#FFD700'; medal = '\u{1F947}'; }
      else if (rank === 2) { rankColor = '#C0C0C0'; medal = '\u{1F948}'; }
      else if (rank === 3) { rankColor = '#CD7F32'; medal = '\u{1F949}'; }

      // Row highlight for top 3
      if (rank <= 3 && score) {
        this.add.rectangle(width / 2, y, width * 0.88, lineHeight - 4, 
          Phaser.Display.Color.HexStringToColor(rankColor).color, 0.08);
      }

      // Rank
      this.add.text(width * 0.15, y, medal, {
        fontFamily: 'Arial Black',
        fontSize: rank <= 3 ? '16px' : '14px',
        color: rankColor,
      }).setOrigin(0.5);

      // Name
      this.add.text(width * 0.45, y, score ? score.name : '---', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: score ? '#FFFFFF' : '#444444',
      }).setOrigin(0.5);

      // Score
      this.add.text(width * 0.8, y, score ? score.score.toLocaleString() : '-', {
        fontFamily: 'Arial Black',
        fontSize: '14px',
        color: score ? rankColor : '#444444',
      }).setOrigin(0.5);
    }

    // Stats at bottom of card
    const totalGames = parseInt(localStorage.getItem('patriot_total_games') || '0');
    const totalScore = parseInt(localStorage.getItem('patriot_total_score') || '0');
    
    const statsY = cardY + cardHeight - 30;
    this.add.text(width / 2, statsY, `Games: ${totalGames}  \u2022  Total Points: ${totalScore.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5);

    // Back button
    this.createPolishedButton(width / 2, height - 38, 'BACK TO MENU', 0x884400, 0xcc6600, () => {
      this.scoreMusic?.stop();
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.time.delayedCall(350, () => this.scene.start('MainMenuScene'));
    });

    // Music (wait for user interaction if audio is locked)
    this.scoreMusic = this.sound.add('score_music', { loop: true, volume: 0.3 });
    if (this.sound.locked) {
      this.sound.once('unlocked', () => {
        this.scoreMusic.play();
      });
    } else {
      this.scoreMusic.play();
    }

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private getHighScores(): Array<{ name: string; score: number }> {
    try {
      const scoresJson = localStorage.getItem('patriot_high_scores');
      if (!scoresJson) {
        return [
          { name: 'PATRIOT', score: 5000 },
          { name: 'EAGLE', score: 4000 },
          { name: 'MAPLE', score: 3000 },
          { name: 'CANADA', score: 2000 },
          { name: 'BUDGIE', score: 1000 },
        ];
      }
      return JSON.parse(scoresJson);
    } catch (e) {
      console.warn('Failed to load high scores from localStorage:', e);
      return [
        { name: 'PATRIOT', score: 5000 },
        { name: 'EAGLE', score: 4000 },
        { name: 'MAPLE', score: 3000 },
        { name: 'CANADA', score: 2000 },
        { name: 'BUDGIE', score: 1000 },
      ];
    }
  }

  private createCard(x: number, y: number, w: number, h: number, color: number): void {
    this.add.rectangle(x + 2, y + h/2 + 2, w, h, 0x000000, 0.3).setOrigin(0.5);
    const card = this.add.graphics();
    card.fillStyle(color, 0.95);
    card.fillRoundedRect(x - w/2, y, w, h, 10);
    card.lineStyle(1, 0xffffff, 0.1);
    card.strokeRoundedRect(x - w/2, y, w, h, 10);
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
}

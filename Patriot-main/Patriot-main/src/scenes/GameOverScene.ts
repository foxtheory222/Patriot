import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  private gameOverMusic!: Phaser.Sound.BaseSound;
  private finalScore: number = 0;
  private enemiesDefeated: number = 0;
  private survivalTime: number = 0;
  private budgiesSaved: number = 0;

  constructor() {
    super('GameOverScene');
  }

  init(data: { score: number; enemiesDefeated?: number; survivalTime?: number; budgiesSaved?: number }): void {
    this.finalScore = data.score || 0;
    this.enemiesDefeated = data.enemiesDefeated || 0;
    this.survivalTime = data.survivalTime || 0;
    this.budgiesSaved = data.budgiesSaved || 0;
  }

  preload(): void {
    this.load.image('gameover_bg', 'assets/scenes/gameOver/gameOver.png');
    this.load.audio('gameover_music', 'assets/music/hiScore/sad_game_over.ogg');
    this.load.audio('click_sound', 'assets/music/mouse-click-290204.ogg');
  }

  create(): void {
    const { width, height } = this.scale;

    // Try to load game over background, fallback to dark screen
    try {
      const bg = this.add.image(width / 2, height / 2, 'gameover_bg');
      bg.setDisplaySize(width, height);
    } catch (e) {
      // Fallback if no background
    }

    // Dark overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x220000, 0.85);

    // Game Over title with dramatic effect
    const gameOverText = this.add.text(width / 2, height * 0.25, 'GAME OVER', {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: '64px',
      color: '#FF0000',
      stroke: '#000000',
      strokeThickness: 6,
    });
    gameOverText.setOrigin(0.5);
    gameOverText.setAlpha(0);

    // Fade in title
    this.tweens.add({
      targets: gameOverText,
      alpha: 1,
      scaleX: { from: 2, to: 1 },
      scaleY: { from: 2, to: 1 },
      duration: 1000,
      ease: 'Back.easeOut',
    });

    // Score display
    const scoreLabel = this.add.text(width / 2, height * 0.45, 'FINAL SCORE', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#AAAAAA',
    });
    scoreLabel.setOrigin(0.5);

    const scoreText = this.add.text(width / 2, height * 0.55, this.finalScore.toLocaleString(), {
      fontFamily: 'Impact, Arial Black',
      fontSize: '56px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
    });
    scoreText.setOrigin(0.5);

    // Animate score counting up
    const displayScore = { value: 0 };
    this.tweens.add({
      targets: displayScore,
      value: this.finalScore,
      duration: 2000,
      ease: 'Power2',
      onUpdate: () => {
        scoreText.setText(Math.floor(displayScore.value).toLocaleString());
      },
    });

    // Game stats panel
    const statsY = height * 0.66;
    const statsStyle = {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#CCCCCC',
    };
    
    // Format survival time
    const minutes = Math.floor(this.survivalTime / 60);
    const seconds = this.survivalTime % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    
    const statsText = this.add.text(width / 2, statsY, 
      `TIME: ${timeStr}   |   ENEMIES: ${this.enemiesDefeated}   |   BUDGIES SAVED: ${this.budgiesSaved}/4`,
      statsStyle
    );
    statsText.setOrigin(0.5);
    statsText.setAlpha(0);
    
    // Fade in stats after score count-up
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: statsText,
        alpha: 1,
        duration: 500,
      });
    });

    // Check for new high score
    const isNewHighScore = this.checkHighScore(this.finalScore);
    if (isNewHighScore) {
      this.time.delayedCall(2500, () => {
        const newHighText = this.add.text(width / 2, height * 0.76, '*** NEW HIGH SCORE! ***', {
          fontFamily: 'Arial Black',
          fontSize: '28px',
          color: '#00FF00',
        });
        newHighText.setOrigin(0.5);

        this.tweens.add({
          targets: newHighText,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      });
    }

    // Buttons - Modern polished style (3 buttons in a row)
    const buttonY = height * 0.85;
    
    this.createPolishedButton(width * 0.2, buttonY, 'PLAY AGAIN', 0x006622, 0x00aa33, () => {
      this.gameOverMusic?.stop();
      this.scene.start('GameScene');
    });

    this.createPolishedButton(width * 0.5, buttonY, 'HIGH SCORES', 0xcc8800, 0xffaa00, () => {
      this.gameOverMusic?.stop();
      this.scene.start('ScoreScene');
    });

    this.createPolishedButton(width * 0.8, buttonY, 'MAIN MENU', 0x884400, 0xcc6600, () => {
      this.gameOverMusic?.stop();
      this.scene.start('MainMenuScene');
    });

    // Save game stats
    this.saveGameStats(this.finalScore);

    // Play game over music (wait for user interaction if audio is locked)
    try {
      this.gameOverMusic = this.sound.add('gameover_music', { loop: false, volume: 0.4 });
      if (this.sound.locked) {
        this.sound.once('unlocked', () => {
          this.gameOverMusic.play();
        });
      } else {
        this.gameOverMusic.play();
      }
    } catch (e) {
      // Music might not be loaded
    }

    // Fade in
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  private createPolishedButton(x: number, y: number, text: string, baseColor: number, hoverColor: number, callback: () => void): void {
    const buttonWidth = 140;
    const buttonHeight = 40;
    
    const container = this.add.container(x, y);
    
    // Shadow
    const shadow = this.add.rectangle(0, 3, buttonWidth, buttonHeight, 0x000000, 0.4);
    shadow.setOrigin(0.5);
    
    // Button body with rounded corners (simulated with graphics)
    const buttonBody = this.add.graphics();
    buttonBody.fillStyle(baseColor, 1);
    buttonBody.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    
    // Top highlight for 3D effect
    const highlight = this.add.graphics();
    highlight.fillStyle(0xffffff, 0.15);
    highlight.fillRoundedRect(-buttonWidth/2 + 4, -buttonHeight/2 + 4, buttonWidth - 8, buttonHeight/3, 6);
    
    // Border
    const border = this.add.graphics();
    border.lineStyle(2, 0xffffff, 0.25);
    border.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    
    // Text shadow
    const textShadow = this.add.text(1, 1, text, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '12px',
      color: '#000000',
    }).setOrigin(0.5).setAlpha(0.5);
    
    // Button text
    const buttonText = this.add.text(0, 0, text, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '12px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    
    container.add([shadow, buttonBody, highlight, border, textShadow, buttonText]);
    container.setSize(buttonWidth, buttonHeight);
    container.setInteractive({ useHandCursor: true });
    container.setDepth(20);
    
    container.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, duration: 80, ease: 'Sine.easeOut' });
      buttonBody.clear();
      buttonBody.fillStyle(hoverColor, 1);
      buttonBody.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    });

    container.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80, ease: 'Sine.easeOut' });
      buttonBody.clear();
      buttonBody.fillStyle(baseColor, 1);
      buttonBody.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    });

    container.on('pointerdown', () => {
      try {
        this.sound.play('click_sound', { volume: 0.5 });
      } catch (e) {
        // Sound might not be loaded
      }
      container.setScale(0.95);
      container.y += 2;
    });
    
    container.on('pointerup', () => {
      container.setScale(1);
      container.y -= 2;
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, callback);
    });
  }

  private checkHighScore(score: number): boolean {
    try {
      const scoresJson = localStorage.getItem('patriot_high_scores');
      let highScores: Array<{ name: string; score: number }> = scoresJson ? JSON.parse(scoresJson) : [];

      // Check if this score makes the top 10
      if (highScores.length < 10 || score > highScores[highScores.length - 1].score) {
        // Get player name from localStorage or prompt
        let playerName = localStorage.getItem('patriot_player_name') || '';
        
        // If no saved name, prompt for one
        if (!playerName) {
          this.promptForPlayerName(score, highScores);
          return true;
        }
        
        // Add new score with saved name
        highScores.push({ name: playerName, score: score });
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 10);
        localStorage.setItem('patriot_high_scores', JSON.stringify(highScores));
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Failed to save high score to localStorage:', e);
      return false;
    }
  }

  private promptForPlayerName(score: number, highScores: Array<{ name: string; score: number }>): void {
    const { width, height } = this.scale;
    
    // Create modal overlay
    const modalOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    modalOverlay.setDepth(2000);
    modalOverlay.setInteractive();
    
    // Create modal panel
    const modalPanel = this.add.rectangle(width / 2, height / 2, 400, 250, 0x1a1a2e, 1);
    modalPanel.setDepth(2001);
    modalPanel.setStrokeStyle(3, 0xFFD700);
    
    // Title
    const titleText = this.add.text(width / 2, height / 2 - 80, 'NEW HIGH SCORE!', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#FFD700',
    }).setOrigin(0.5).setDepth(2002);
    
    // Instruction
    const instructionText = this.add.text(width / 2, height / 2 - 40, 'Enter your name:', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(2002);
    
    // Input field background
    const inputBg = this.add.rectangle(width / 2, height / 2, 300, 40, 0x333333, 1);
    inputBg.setDepth(2002);
    inputBg.setStrokeStyle(2, 0x666666);
    
    // Create HTML input element
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.maxLength = 12;
    inputElement.placeholder = 'Your Name';
    inputElement.style.position = 'absolute';
    inputElement.style.left = `${width / 2 - 140}px`;
    inputElement.style.top = `${height / 2 - 20}px`;
    inputElement.style.width = '280px';
    inputElement.style.height = '36px';
    inputElement.style.fontSize = '18px';
    inputElement.style.padding = '4px';
    inputElement.style.border = '2px solid #666666';
    inputElement.style.borderRadius = '4px';
    inputElement.style.backgroundColor = '#333333';
    inputElement.style.color = '#FFFFFF';
    inputElement.style.textAlign = 'center';
    inputElement.style.fontFamily = 'Arial';
    inputElement.style.zIndex = '3000';
    document.body.appendChild(inputElement);
    inputElement.focus();
    
    // Display text (mirrors input)
    const displayText = this.add.text(width / 2, height / 2, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(2003);
    
    // Update display text as user types
    inputElement.addEventListener('input', () => {
      displayText.setText(inputElement.value.toUpperCase());
    });
    
    // Submit button
    const submitBtn = this.add.rectangle(width / 2, height / 2 + 60, 150, 40, 0x00aa00, 1);
    submitBtn.setDepth(2002);
    submitBtn.setInteractive({ useHandCursor: true });
    
    const submitText = this.add.text(width / 2, height / 2 + 60, 'SUBMIT', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(2003);
    
    const submitScore = () => {
      const playerName = inputElement.value.trim().toUpperCase() || 'PLAYER';
      
      try {
        // Save player name for future games
        localStorage.setItem('patriot_player_name', playerName);
        
        // Add score to high scores
        highScores.push({ name: playerName, score: score });
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 10);
        localStorage.setItem('patriot_high_scores', JSON.stringify(highScores));
      } catch (e) {
        console.warn('Failed to save name/score:', e);
      }
      
      // Clean up
      document.body.removeChild(inputElement);
      modalOverlay.destroy();
      modalPanel.destroy();
      titleText.destroy();
      instructionText.destroy();
      inputBg.destroy();
      displayText.destroy();
      submitBtn.destroy();
      submitText.destroy();
    };
    
    // Submit on button click
    submitBtn.on('pointerover', () => {
      submitBtn.setFillStyle(0x00ff00);
    });
    submitBtn.on('pointerout', () => {
      submitBtn.setFillStyle(0x00aa00);
    });
    submitBtn.on('pointerdown', submitScore);
    
    // Submit on Enter key
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submitScore();
      }
    });
  }

  private saveGameStats(score: number): void {
    try {
      // Parse with NaN guards
      let totalGames = parseInt(localStorage.getItem('patriot_total_games') || '0');
      let totalScore = parseInt(localStorage.getItem('patriot_total_score') || '0');
      
      // Reset to 0 if NaN detected
      if (isNaN(totalGames)) totalGames = 0;
      if (isNaN(totalScore)) totalScore = 0;
      
      // Increment values
      totalGames += 1;
      totalScore += score;
      
      localStorage.setItem('patriot_total_games', totalGames.toString());
      localStorage.setItem('patriot_total_score', totalScore.toString());
    } catch (e) {
      console.warn('Failed to save game stats to localStorage:', e);
    }
  }
}

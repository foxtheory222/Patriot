import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  private gameOverMusic!: Phaser.Sound.BaseSound;
  private finalScore: number = 0;
  private enemiesDefeated: number = 0;
  private survivalTime: number = 0;
  private budgiesSaved: number = 0;
  private activeInputElement: HTMLInputElement | null = null;
  private inputCleanupCallback: (() => void) | null = null;

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
    this.load.audio('gameover_music', [
      'assets/music/hiScore/sad_game_over.mp3',
      'assets/music/hiScore/sad_game_over.ogg'
    ]);
    this.load.audio('click_sound', [
      'assets/music/mouse-click-290204.mp3',
      'assets/music/mouse-click-290204.ogg'
    ]);
  }

  create(): void {
    const { width, height } = this.scale;

    // Register shutdown cleanup for modal inputs
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

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
        // Get player name from localStorage
        let playerName = localStorage.getItem('patriot_player_name') || '';
        
        // Always prompt for name on high score, pre-filling with saved name
        this.promptForPlayerName(score, highScores, playerName);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Failed to save high score to localStorage:', e);
      return false;
    }
  }

  private promptForPlayerName(score: number, highScores: Array<{ name: string; score: number }>, defaultName: string = ''): void {
    const { width, height } = this.scale;
    
    // Create modal overlay
    const modalOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    modalOverlay.setDepth(2000);
    modalOverlay.setInteractive();
    
    // Create modal panel
    const modalPanel = this.add.rectangle(width / 2, height / 2 + 30, 420, 420, 0x1a1a2e, 1);
    modalPanel.setDepth(2001);
    modalPanel.setStrokeStyle(3, 0xFFD700);
    
    // Title
    const titleText = this.add.text(width / 2, height / 2 - 100, 'NEW HIGH SCORE!', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#FFD700',
    }).setOrigin(0.5).setDepth(2002);
    
    // Instruction
    const instructionText = this.add.text(width / 2, height / 2 - 60, 'Tap letters to enter name:', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(2002);
    
    // Input field background
    const inputBg = this.add.rectangle(width / 2, height / 2 - 20, 300, 40, 0x333333, 1);
    inputBg.setDepth(2002);
    inputBg.setStrokeStyle(2, 0x666666);
    
    let playerName = defaultName || '';
    const maxLength = 8;
    
    // Display text that shows current name with cursor
    const displayText = this.add.text(width / 2, height / 2 - 20, playerName || '_', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(2003);
    
    // Blinking cursor effect
    const cursorTimer = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (playerName.length < maxLength) {
          const showCursor = displayText.text.endsWith('_');
          displayText.setText(playerName + (showCursor ? '' : '_'));
        }
      }
    });
    
    // Create on-screen keyboard for mobile
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const keyboardContainer = this.add.container(width / 2, height / 2 + 60);
    keyboardContainer.setDepth(2002);
    
    const keySize = 28;
    const keySpacing = 32;
    const keysPerRow = 9;
    
    letters.split('').forEach((letter, index) => {
      const row = Math.floor(index / keysPerRow);
      const col = index % keysPerRow;
      const rowOffset = row === 2 ? keySpacing / 2 : 0; // Center last row
      const x = (col - keysPerRow / 2 + 0.5) * keySpacing + rowOffset;
      const y = row * (keySize + 6);
      
      const keyBg = this.add.rectangle(x, y, keySize, keySize, 0x444444, 1);
      keyBg.setStrokeStyle(1, 0x666666);
      keyBg.setInteractive({ useHandCursor: true });
      
      const keyText = this.add.text(x, y, letter, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#FFFFFF',
      }).setOrigin(0.5);
      
      keyBg.on('pointerdown', () => {
        keyBg.setFillStyle(0x666666);
        if (playerName.length < maxLength) {
          playerName += letter;
          displayText.setText(playerName);
        }
      });
      keyBg.on('pointerup', () => keyBg.setFillStyle(0x444444));
      keyBg.on('pointerout', () => keyBg.setFillStyle(0x444444));
      
      keyboardContainer.add([keyBg, keyText]);
    });
    
    // Backspace button
    const backspaceBg = this.add.rectangle(keysPerRow / 2 * keySpacing + 20, 2 * (keySize + 6), 50, keySize, 0x993333, 1);
    backspaceBg.setStrokeStyle(1, 0xcc4444);
    backspaceBg.setInteractive({ useHandCursor: true });
    const backspaceText = this.add.text(keysPerRow / 2 * keySpacing + 20, 2 * (keySize + 6), '←', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    
    backspaceBg.on('pointerdown', () => {
      backspaceBg.setFillStyle(0xbb4444);
      if (playerName.length > 0) {
        playerName = playerName.slice(0, -1);
        displayText.setText(playerName || '_');
      }
    });
    backspaceBg.on('pointerup', () => backspaceBg.setFillStyle(0x993333));
    backspaceBg.on('pointerout', () => backspaceBg.setFillStyle(0x993333));
    
    keyboardContainer.add([backspaceBg, backspaceText]);
    
    // Also support physical keyboard
    const keyboardHandler = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if (key.length === 1 && /[A-Z]/.test(key) && playerName.length < maxLength) {
        playerName += key;
        displayText.setText(playerName);
      } else if (event.key === 'Backspace' && playerName.length > 0) {
        playerName = playerName.slice(0, -1);
        displayText.setText(playerName || '_');
      } else if (event.key === 'Enter' && playerName.length > 0) {
        window.removeEventListener('keydown', keyboardHandler);
        submitScore();
      }
    };
    window.addEventListener('keydown', keyboardHandler);
    
    // Submit button - modern styled
    const submitBtnContainer = this.add.container(width / 2, height / 2 + 185);
    submitBtnContainer.setDepth(2002);
    
    // Button shadow
    const submitShadow = this.add.rectangle(0, 3, 160, 44, 0x000000, 0.4);
    
    // Button body
    const submitBtn = this.add.graphics();
    submitBtn.fillStyle(0x00aa00, 1);
    submitBtn.fillRoundedRect(-80, -22, 160, 44, 12);
    
    // Top highlight for 3D effect
    const submitHighlight = this.add.graphics();
    submitHighlight.fillStyle(0xffffff, 0.2);
    submitHighlight.fillRoundedRect(-76, -18, 152, 18, 8);
    
    // Border
    const submitBorder = this.add.graphics();
    submitBorder.lineStyle(2, 0x00ff00, 0.5);
    submitBorder.strokeRoundedRect(-80, -22, 160, 44, 12);
    
    // Text shadow
    const submitTextShadow = this.add.text(1, 1, 'SUBMIT', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#000000',
    }).setOrigin(0.5).setAlpha(0.5);
    
    // Button text
    const submitText = this.add.text(0, 0, 'SUBMIT', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    
    submitBtnContainer.add([submitShadow, submitBtn, submitHighlight, submitBorder, submitTextShadow, submitText]);
    submitBtnContainer.setSize(160, 44);
    submitBtnContainer.setInteractive({ useHandCursor: true });
    
    const cleanupModal = () => {
      // Remove keyboard listener
      window.removeEventListener('keydown', keyboardHandler);
      // Stop cursor timer
      cursorTimer.destroy();
      // Destroy Phaser objects
      modalOverlay.destroy();
      modalPanel.destroy();
      titleText.destroy();
      instructionText.destroy();
      inputBg.destroy();
      displayText.destroy();
      keyboardContainer.destroy();
      submitBtnContainer.destroy();
    };
    
    const submitScore = () => {
      // Require at least 1 character
      if (playerName.length === 0) {
        playerName = 'AAA';
      }
      
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
      cleanupModal();
    };
    
    // Submit on button click
    submitBtnContainer.on('pointerover', () => {
      this.tweens.add({ targets: submitBtnContainer, scaleX: 1.05, scaleY: 1.05, duration: 80, ease: 'Sine.easeOut' });
    });
    submitBtnContainer.on('pointerout', () => {
      this.tweens.add({ targets: submitBtnContainer, scaleX: 1, scaleY: 1, duration: 80, ease: 'Sine.easeOut' });
    });
    submitBtnContainer.on('pointerdown', () => {
      submitBtnContainer.setScale(0.95);
    });
    submitBtnContainer.on('pointerup', submitScore);
  }
  
  shutdown(): void {
    // Clean up any active input modal
    if (this.inputCleanupCallback) {
      this.inputCleanupCallback();
    }
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

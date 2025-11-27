import Phaser from 'phaser';
import MainMenuScene from './scenes/MainMenuScene';
import InstructionsScene from './scenes/InstructionsScene';
import ScoreScene from './scenes/ScoreScene';
import GameOverScene from './scenes/GameOverScene';
import GameScene from './scenes/GameScene';

// Calculate optimal dimensions for landscape orientation
const getGameDimensions = () => {
  const targetAspect = 2; // 2:1 landscape (1024x512)
  const viewportAspect = window.innerWidth / window.innerHeight;
  
  // Base dimensions
  let width = 1024;
  let height = 512;
  
  // For very wide screens, keep base dimensions
  // For taller screens (portrait mistakenly), maximize landscape usage
  if (viewportAspect < targetAspect) {
    // Viewport is taller than target - use height to calculate width
    height = 512;
    width = Math.round(height * Math.max(viewportAspect, targetAspect));
  }
  
  return { width, height };
};

const { width, height } = getGameDimensions();

// Clamp DPR for performance (avoid 3x+ on high-end phones)
const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // Auto-select WebGL or Canvas fallback
  width,
  height,
  backgroundColor: '#000000',

  // Smooth rendering for high-res art
  pixelArt: false,
  roundPixels: true,
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [MainMenuScene, InstructionsScene, ScoreScene, GameOverScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Force landscape orientation hints
    width,
    height,
  },
  // High-DPI rendering support
  zoom: 1 / devicePixelRatio,
};

const game = new Phaser.Game(config);

// Pause/Resume handling for mobile APK
let wasPaused = false;

const handleVisibilityChange = () => {
  if (document.hidden) {
    // App backgrounded - pause everything
    wasPaused = true;
    
    // Pause all active scenes
    game.scene.scenes.forEach(scene => {
      if (scene.scene.isActive()) {
        scene.scene.pause();
        
        // Pause physics
        if (scene.physics && scene.physics.world) {
          scene.physics.world.pause();
        }
        
        // Pause sound
        if (scene.sound) {
          scene.sound.pauseAll();
        }
      }
    });
  } else {
    // App foregrounded - resume
    if (wasPaused) {
      // Resume all paused scenes
      game.scene.scenes.forEach(scene => {
        if (scene.scene.isPaused()) {
          scene.scene.resume();
          
          // Resume physics
          if (scene.physics && scene.physics.world) {
            scene.physics.world.resume();
          }
          
          // Resume sound
          if (scene.sound) {
            scene.sound.resumeAll();
          }
        }
      });
      
      wasPaused = false;
    }
  }
};

// Window blur/focus as backup
const handleBlur = () => {
  if (!document.hidden) {
    handleVisibilityChange();
  }
};

const handleFocus = () => {
  if (!document.hidden && wasPaused) {
    handleVisibilityChange();
  }
};

document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('blur', handleBlur);
window.addEventListener('focus', handleFocus);

// Handle WebGL context loss gracefully
if (game.canvas) {
  game.canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    console.warn('WebGL context lost - game will attempt to restore');
  });
  
  game.canvas.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored');
    // Phaser will handle restoration automatically with AUTO mode
  });
}

// Enforce landscape orientation warning for portrait mode
let isGamePausedForOrientation = false;

const checkOrientation = () => {
  const isPortrait = window.innerHeight > window.innerWidth;
  
  if (isPortrait) {
    // Pause all active scenes during portrait mode
    if (!isGamePausedForOrientation) {
      game.scene.scenes.forEach(scene => {
        if (scene.scene.isActive() && !scene.scene.isPaused()) {
          scene.scene.pause();
          if (scene.sound) scene.sound.pauseAll();
        }
      });
      isGamePausedForOrientation = true;
    }
    
    // Show rotation prompt overlay
    let rotateOverlay = document.getElementById('rotate-overlay');
    if (!rotateOverlay) {
      rotateOverlay = document.createElement('div');
      rotateOverlay.id = 'rotate-overlay';
      rotateOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        color: #fff;
        font-family: Arial, sans-serif;
        text-align: center;
      `;
      rotateOverlay.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">&#8635;</div>
        <div style="font-size: 18px; font-weight: bold;">Please Rotate Your Device</div>
        <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">This game is best played in landscape mode</div>
      `;
      document.body.appendChild(rotateOverlay);
    }
    rotateOverlay.style.display = 'flex';
  } else {
    // Hide rotation prompt
    const rotateOverlay = document.getElementById('rotate-overlay');
    if (rotateOverlay) {
      rotateOverlay.style.display = 'none';
    }
    
    // Resume game if it was paused for orientation
    if (isGamePausedForOrientation) {
      game.scene.scenes.forEach(scene => {
        if (scene.scene.isPaused()) {
          scene.scene.resume();
          if (scene.sound) scene.sound.resumeAll();
        }
      });
      isGamePausedForOrientation = false;
    }
    
    // Recalculate dimensions and resize canvas
    const newDimensions = getGameDimensions();
    if (game.scale && (newDimensions.width !== game.scale.width || newDimensions.height !== game.scale.height)) {
      game.scale.resize(newDimensions.width, newDimensions.height);
    }
  }
};

window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
checkOrientation(); // Check on load

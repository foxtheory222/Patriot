import Phaser from 'phaser';
import MainMenuScene from './scenes/MainMenuScene';
import InstructionsScene from './scenes/InstructionsScene';
import ScoreScene from './scenes/ScoreScene';
import GameOverScene from './scenes/GameOverScene';
import GameScene from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 1024, // matches the background asset size
  height: 512,
  backgroundColor: '#000000',

  // Smooth rendering for high-res art
  pixelArt: false,
  roundPixels: true, // still avoid jitter
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
  },
};

new Phaser.Game(config);

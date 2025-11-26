import Phaser from 'phaser';
import GameScene from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 1024, // matches the background asset size
  height: 512,
  backgroundColor: '#000000',
  pixelArt: true,  // Disable antialiasing for sharper sprites
  antialias: false,
  roundPixels: true,
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);

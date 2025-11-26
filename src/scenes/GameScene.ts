import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload(): void {
    // Assets will be loaded here later.
  }

  create(): void {
    const { centerX, centerY } = this.cameras.main;

    const title = this.add
      .text(centerX, centerY - 20, 'PATRIOT - MVP BOOTSTRAP', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(title.x, title.y + 48, 'If you see this, the engine is working.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#b0b7c3',
      })
      .setOrigin(0.5);
  }

  update(_time: number, _delta: number): void {
    // Game loop updates will live here.
  }
}

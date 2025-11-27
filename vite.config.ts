import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) {
            return 'phaser-core';
          }

          if (id.includes('/src/scenes/')) {
            return 'game-scenes';
          }

          return undefined;
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.ts'],
  },
});

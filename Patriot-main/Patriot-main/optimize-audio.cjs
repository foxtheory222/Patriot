const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get ffmpeg path from installed package
const ffmpegPath = require('ffmpeg-static');

console.log('Using ffmpeg at:', ffmpegPath);

const audioFiles = [
  { input: 'public/assets/music/cartoon-spin-7120.mp3', output: 'public/assets/music/cartoon-spin-7120.ogg' },
  { input: 'public/assets/music/mouse-click-290204.mp3', output: 'public/assets/music/mouse-click-290204.ogg' },
  { input: 'public/assets/music/poof-80161.mp3', output: 'public/assets/music/poof-80161.ogg' },
  { input: 'public/assets/music/hiScore/sad_game_over.wav', output: 'public/assets/music/hiScore/sad_game_over.ogg' },
  { input: 'public/assets/music/instructions/awesomeness.wav', output: 'public/assets/music/instructions/awesomeness.ogg' },
  { input: 'public/assets/music/titleScreen/maxkomusic-true-patriot.mp3', output: 'public/assets/music/titleScreen/maxkomusic-true-patriot.ogg' },
];

console.log('Converting audio files to OGG format with compression...\n');

audioFiles.forEach(({ input, output }) => {
  if (!fs.existsSync(input)) {
    console.log(`⚠️  Skipping ${input} - file not found`);
    return;
  }

  const inputStats = fs.statSync(input);
  const inputSizeMB = (inputStats.size / 1024 / 1024).toFixed(2);

  console.log(`Converting: ${input} (${inputSizeMB} MB)`);

  try {
    // Convert to OGG with quality setting (3 = ~96 kbps, good balance)
    execSync(`"${ffmpegPath}" -i "${input}" -c:a libvorbis -q:a 3 -y "${output}"`, {
      stdio: 'pipe'
    });

    const outputStats = fs.statSync(output);
    const outputSizeMB = (outputStats.size / 1024 / 1024).toFixed(2);
    const reduction = (((inputStats.size - outputStats.size) / inputStats.size) * 100).toFixed(1);

    console.log(`✓ Created: ${output} (${outputSizeMB} MB, ${reduction}% reduction)\n`);
  } catch (error) {
    console.error(`✗ Failed to convert ${input}:`, error.message);
  }
});

console.log('Audio optimization complete!');
console.log('\n📋 Next steps:');
console.log('1. Update asset loading paths in your code to use .ogg files');
console.log('2. Test that all audio plays correctly');
console.log('3. Delete the old .wav and .mp3 files after confirming OGG works');

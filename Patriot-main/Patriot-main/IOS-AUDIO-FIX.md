# iOS Audio and Asset Optimization

## ✅ COMPLETED: iOS Audio Support

### Status: FIXED
All audio loading has been updated to use dual-format arrays (MP3 first for iOS, OGG for others).

### What Was Done
- Updated all `load.audio()` calls across all scenes to use array format: `['*.mp3', '*.ogg']`
- Phaser automatically selects the first supported format for each platform
- iOS/Safari will use MP3, Android/Desktop will prefer OGG

### Remaining Task
**Convert missing MP3 files** - Run the provided script to convert OGG files to MP3.

#### Implementation Steps

1. **Convert OGG files to MP3/AAC**
   ```powershell
   # Using ffmpeg to convert audio files
   # Install: winget install ffmpeg
   
   # Convert OGG to MP3
   Get-ChildItem -Recurse -Filter *.ogg | ForEach-Object {
       $mp3Path = $_.FullName -replace '\.ogg$', '.mp3'
       ffmpeg -i $_.FullName -codec:a libmp3lame -qscale:a 2 $mp3Path
   }
   ```

2. **Update Audio Loading in All Scenes**
   
   Modify each scene's `preload()` to load both formats:
   
   ```typescript
   // Instead of:
   this.load.audio('game_music', 'assets/music/gameMusic/Swerve-96bpm-AmidYouSleep.ogg');
   
   // Use:
   this.load.audio('game_music', [
       'assets/music/gameMusic/Swerve-96bpm-AmidYouSleep.mp3',
       'assets/music/gameMusic/Swerve-96bpm-AmidYouSleep.ogg'
   ]);
   ```
   
   Phaser will automatically use the first supported format for each platform.

3. **Files to Update**
   - `src/scenes/GameScene.ts`
   - `src/scenes/MainMenuScene.ts`
   - `src/scenes/InstructionsScene.ts`
   - `src/scenes/GameOverScene.ts`
   - `src/scenes/ScoreScene.ts`

4. **Audio Files Requiring Conversion**
   ```
   public/assets/music/gameMusic/Swerve-96bpm-AmidYouSleep.ogg
   public/assets/music/titleScreen/FizzBuzz-80bpm-Swerve.ogg
   public/assets/music/instructions/Swerve-Buzzy-80bpm.ogg
   public/assets/music/hiScore/sad_game_over.ogg
   public/assets/music/mouse-click-290204.ogg
   public/assets/music/poof-80161.ogg
   public/assets/music/cartoon-spin-7120.ogg
   ```

---

## Asset Size Optimization

### Current State
- Total asset size: **~40 MB**
- Contains duplicate audio formats (OGG + original MP3/WAV)
- Target: **~25 MB** for mobile app stores

### Optimization Plan

1. **After Adding iOS Audio**
   - Keep only MP3 and OGG versions
   - Delete original WAV files (if any exist)
   - Delete any unused audio files

2. **Audio Compression**
   ```powershell
   # Compress MP3 files to smaller bitrate while maintaining quality
   Get-ChildItem -Recurse -Filter *.mp3 | ForEach-Object {
       $output = $_.FullName + ".tmp"
       ffmpeg -i $_.FullName -codec:a libmp3lame -b:a 128k $output
       Move-Item -Force $output $_.FullName
   }
   ```

3. **Image Optimization**
   - Run the existing `optimize-audio.cjs` script (if it handles images too)
   - Use tools like ImageOptim or Squoosh for PNG compression
   - Consider WebP format for backgrounds (with PNG fallback)

4. **Audit Unused Assets**
   ```powershell
   # Search for asset references in code
   Get-ChildItem src -Recurse -Filter *.ts | Select-String -Pattern "load\.(image|audio|spritesheet)"
   
   # Compare with files in public/assets to find unused assets
   ```

5. **Final Cleanup Checklist**
   - [ ] Convert all OGG to MP3
   - [ ] Update all audio load calls to use array format
   - [ ] Test on iOS Safari
   - [ ] Delete unused audio formats
   - [ ] Optimize remaining audio files
   - [ ] Compress images
   - [ ] Verify final build size < 25 MB
   - [ ] Test game on iOS, Android, and desktop

---

## Testing Requirements

### Browser Compatibility
- ✅ Desktop Chrome/Firefox/Edge (OGG support)
- ⚠️ Desktop Safari (needs MP3)
- ⚠️ iOS Safari/WebView (needs MP3/AAC)
- ✅ Android Chrome (OGG support)

### Test Checklist
- [ ] Audio plays correctly on iOS Safari
- [ ] Audio plays correctly on Android Chrome
- [ ] Audio plays correctly on desktop browsers
- [ ] No console errors for missing audio files
- [ ] Game size is under 25 MB
- [ ] All scenes transition properly
- [ ] localStorage works in private browsing mode

---

## Priority Order

1. **HIGH PRIORITY - Build Blockers (COMPLETED ✅)**
   - ✅ Fix TypeScript compile errors
   - ✅ Fix localStorage crashes

2. **HIGH PRIORITY - iOS Audio (NEXT)**
   - Convert OGG to MP3
   - Update audio loading in all scenes
   - Test on iOS device/simulator

3. **MEDIUM PRIORITY - Asset Optimization**
   - Remove duplicate audio files
   - Compress remaining assets
   - Achieve < 25 MB target

4. **LOW PRIORITY - Polish**
   - Further optimization
   - Additional browser testing

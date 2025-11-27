# Asset Optimization Guide

## Current Status
The `public/` directory currently contains approximately **33.19 MB** of assets, which can cause slow first-load times, especially on mobile devices.

## Recommended Optimizations

### 1. Image Compression (PNGs)

#### Background Layers (6 files in `assets/backgrounds/`)
- Current: Full resolution PNGs
- **Action**: Compress using tools like:
  - [TinyPNG](https://tinypng.com/) - Online compression (up to 70% reduction)
  - [pngquant](https://pngquant.org/) - Command-line tool
  - `npm install -g imagemin-cli` then use imagemin

**Command example:**
```bash
# Install imagemin
npm install -g imagemin-cli imagemin-pngquant

# Compress all PNGs
imagemin public/assets/**/*.png --out-dir=public/assets/ --plugin=pngquant
```

#### Sprite Frames
- **Action**: Consider creating sprite sheets/texture atlases for:
  - Player animation frames (4 frames)
  - Budgie frames (4 frames)
  - Attack bird variants (4 variants × 4 frames = 16 frames)
  - Bat frames (8 frames)
  - Use tools like [TexturePacker](https://www.codeandweb.com/texturepacker) or [Free Texture Packer](https://github.com/odrick/free-tex-packer)

**Benefits:**
- Reduces HTTP requests from ~40+ to ~5-10
- Faster loading and better caching
- Reduced total file size

### 2. Audio Optimization

#### WAV Files (Convert to OGG)
Current WAV files:
- `assets/music/hiScore/sad_game_over.wav`
- `assets/music/instructions/awesomeness.wav`

**Action**: Convert to OGG Vorbis format:
```bash
# Install ffmpeg if not already installed
# Windows: Download from https://ffmpeg.org/download.html

# Convert WAV to OGG
ffmpeg -i sad_game_over.wav -c:a libvorbis -q:a 4 sad_game_over.ogg
ffmpeg -i awesomeness.wav -c:a libvorbis -q:a 4 awesomeness.ogg
```

**Expected savings**: 60-80% file size reduction

#### MP3 Files (Consider OGG alternative)
- `assets/music/titleScreen/maxkomusic-true-patriot.mp3`
- `assets/music/gameMusic/xenostar2loop_.ogg` (already optimized!)
- `assets/music/poof-80161.mp3`
- `assets/music/mouse-click-290204.mp3`
- `assets/music/cartoon-spin-7120.mp3`

**Action**: Convert MP3s to OGG for consistency and smaller size

### 3. Scene Background Images

Files in `assets/scenes/`:
- `mainMenu/mainMenu.jpg`
- `mainMenu/scoreScreen.png`
- `gameOver/gameOver.png`
- `instructions/instructions.png`

**Action**:
1. Ensure JPG quality is set to 80-85% (current may be higher)
2. Convert PNGs without transparency to JPG
3. Resize if larger than displayed size (typically 1920×1080 max)

```bash
# Convert PNG to optimized JPG (if no transparency needed)
ffmpeg -i scoreScreen.png -q:v 85 scoreScreen.jpg

# Resize if too large
ffmpeg -i image.png -vf scale=1920:1080 image_optimized.png
```

### 4. Recommended Compression Targets

| Asset Type | Current Est. | Target | Tool |
|------------|--------------|--------|------|
| Background layers | ~15 MB | ~5 MB | pngquant, TinyPNG |
| Sprite frames | ~8 MB | ~3 MB | Sprite sheets + compression |
| Audio (WAV) | ~5 MB | ~1 MB | Convert to OGG |
| Audio (MP3) | ~3 MB | ~1.5 MB | Convert to OGG |
| Scene backgrounds | ~2 MB | ~1 MB | JPG optimization |

**Total target: ~12-15 MB** (60-65% reduction)

### 5. Implementation Steps

1. **Backup first**: Copy `public/` to `public_backup/`

2. **Compress images**:
   ```bash
   npm install -g imagemin-cli imagemin-pngquant
   imagemin public/assets/**/*.png --out-dir=public/assets/ --plugin=pngquant
   ```

3. **Convert audio**:
   ```bash
   # Convert all WAV to OGG
   cd public/assets/music/hiScore
   ffmpeg -i sad_game_over.wav -c:a libvorbis -q:a 4 sad_game_over.ogg
   
   cd ../instructions
   ffmpeg -i awesomeness.wav -c:a libvorbis -q:a 4 awesomeness.ogg
   ```

4. **Update code references**: Search and replace `.wav` → `.ogg` in scene files

5. **Test thoroughly**: Ensure all assets load correctly

### 6. Future Considerations

- **Progressive loading**: Load menu assets first, game assets on demand
- **WebP format**: Modern browsers support WebP (smaller than PNG/JPG)
- **Lazy loading**: Load background music after initial scene renders
- **Service Worker**: Cache assets for repeat visits

### 7. Build Optimization

Add to `package.json`:
```json
{
  "scripts": {
    "optimize:images": "imagemin public/**/*.png --out-dir=public --plugin=pngquant",
    "optimize:audio": "# Add audio conversion script here",
    "optimize": "npm run optimize:images && npm run optimize:audio"
  }
}
```

## Testing Checklist

After optimization:
- [ ] All images display correctly
- [ ] All audio plays correctly
- [ ] No console errors for missing assets
- [ ] Test on slow 3G network (Chrome DevTools)
- [ ] Verify mobile loading performance
- [ ] Compare file sizes before/after
- [ ] Run `npm run build` successfully
- [ ] Test production build on local server

## Notes

- Keep original assets in a separate backup directory
- Version control: Commit optimizations separately for easy rollback
- Consider CDN hosting for static assets in production

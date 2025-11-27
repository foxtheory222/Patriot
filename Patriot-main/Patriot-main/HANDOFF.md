# Patriot Game - Development Handoff Document

**Date:** November 27, 2025  
**Repository:** foxtheory222/Patriot  
**Branch:** main

---

## Project Overview

**Patriot** is a Phaser 3 side-scrolling game where players control an eagle (Patriot) protecting a flock of budgies from enemies (falcons, bats, bees). The game features a day/night/storm weather cycle, score tracking, and high score persistence.

### Tech Stack
- **Framework:** Phaser 3.90.0
- **Language:** TypeScript
- **Build Tool:** Vite 6.4.1
- **Mobile:** Capacitor (Android configured)
- **Node.js:** Portable v20.18.0 (bundled in `node-v20.18.0-win-x64/`)

### Running the Project
```powershell
cd C:\Users\smcfarlane\Desktop\WorkBench\PatriotGame\Patriot-main\Patriot-main
$env:PATH = "$PWD\node-v20.18.0-win-x64;$env:PATH"
npm run dev
```

---

## Session Summary - Changes Made

### 1. Collision Detection Fixes
**Files:** `src/scenes/GameScene.ts`

- Fixed hitbox radius calculations that were double-scaling
- Changed from `falcon.width * gameConfig.birdScale * 0.9 * 0.4` to `falcon.width * 0.4`
- Applied to: player, budgies, falcons, bats, bees

### 2. HUD Cleanup
**Files:** `src/scenes/GameScene.ts`

- Removed budgie count indicator from HUD
- Removed box around score display
- Larger, cleaner score text

### 3. Dizzy Sound on Death
**Files:** `src/scenes/GameScene.ts`

- Added `dizzySound` property
- Sound plays in `triggerGameOver()` when player dies

### 4. Poof Sound Effect
**Files:** `src/scenes/GameScene.ts`

- Added poof sound when Patriot kills enemies
- Uses `this.sound.play('poof_sound', { volume: 1.5 })`
- **Note:** Audio file may have leading silence causing perceived delay

### 5. Floating Score Text
**Files:** `src/scenes/GameScene.ts`

- Added `showFloatingText()` helper method
- Shows "+25" when killing enemies
- Shows "+10" when budgies eat bees

### 6. Invincibility Debug Button (GOD MODE)
**Files:** `src/scenes/GameScene.ts`

- Added `isInvincible` flag and `invincibleButton` container
- Toggle button in top-right corner
- When active, player and budgies cannot die

### 7. Rain Debug Button
**Files:** `src/scenes/GameScene.ts`

- Added `debugRainOn` flag and `rainButton` container
- Toggle button below GOD MODE button
- Forces rain on/off for testing

### 8. Weather/Rain System Fixes
**Files:** `src/scenes/GameScene.ts`

**Key Issue Fixed:** Rain emitter was breaking after first use because `stop()` permanently disables it.

**Solution:** Changed all `start()`/`stop()` calls to use `emitting = true/false` property directly.

- Rain texture generated in `create()` (not `preload()`)
- Texture size: 2x12 pixels
- Particle scale: 0.5-0.8
- Rain appears during "storm" weather state

### 9. Touch Feedback Removed
**Files:** `src/scenes/GameScene.ts`

- Disabled white flash when clicking top/bottom of screen
- `showTouchFeedback()` method now empty

### 10. Game Over Modal Fixes
**Files:** `src/scenes/GameOverScene.ts`

- Removed duplicate input display (was showing both HTML input + Phaser text)
- Removed cancel button - only SUBMIT button available now
- Modern styled submit button with shadow, rounded corners, hover effects

---

## Known Issues / Future Work

### Poof Sound Delay
The poof sound has a ~1 second delay. This is likely due to:
1. Leading silence in the audio file (`public/assets/music/poof-80161.mp3`)
2. Consider trimming the audio file or replacing with a different sound

### Weather Timing
Current weather cycle durations:
- Day: 40-60 seconds (randomized)
- Dusk: 15 seconds
- Night: 20 seconds
- Storm (with rain): 12 seconds
- Dawn: 5 seconds

### Debug Buttons
Two debug buttons are visible in-game:
- **GOD MODE** - Top right, red button
- **RAIN OFF/ON** - Below GOD MODE, blue button

These should be removed or hidden behind a debug flag before production release.

---

## File Structure

```
src/
  scenes/
    GameScene.ts      # Main gameplay
    GameOverScene.ts  # Game over screen with high score entry
    MainMenuScene.ts  # Title screen
    InstructionsScene.ts
    ScoreScene.ts     # High scores display
  main.ts            # Phaser game config
  
public/
  assets/
    music/           # Audio files (mp3/ogg)
    backgrounds/     # Parallax background layers
    player/          # Patriot sprites
    budgie/          # Budgie sprites
    AttackBirds/     # Falcon variants
    bat/             # Bat sprites
    Bee/             # Bee sprites
```

---

## Key Properties & Methods

### GameScene.ts

| Property | Type | Description |
|----------|------|-------------|
| `isInvincible` | boolean | Debug: prevents death |
| `debugRainOn` | boolean | Debug: forces rain |
| `weather` | WeatherSystem | Tracks day/night/storm state |
| `poofSound` | BaseSound | Pre-loaded poof sound |
| `dizzySound` | BaseSound | Pre-loaded dizzy sound |

| Method | Description |
|--------|-------------|
| `showFloatingText(x, y, text, color?)` | Shows floating score text |
| `createInvincibleButton()` | Creates GOD MODE toggle |
| `createRainButton()` | Creates rain toggle |
| `updateRain(delta, width, height)` | Updates rain particles |
| `clearRain()` | Stops rain emitter |

### GameOverScene.ts

| Method | Description |
|--------|-------------|
| `promptForPlayerName(score, highScores, defaultName)` | Shows name entry modal |
| `createPolishedButton(x, y, text, baseColor, hoverColor, callback)` | Creates styled button |

---

## Audio Files

| Key | File | Usage |
|-----|------|-------|
| `poof_sound` | `poof-80161.mp3` | Enemy explosion |
| `dizzy_sound` | `cartoon-spin-7120.mp3` | Player death |
| `game_music` | `gameMusic/*.mp3` | Gameplay BGM |
| `gameover_music` | `hiScore/sad_game_over.mp3` | Game over BGM |
| `click_sound` | `mouse-click-290204.mp3` | Button clicks |

---

## localStorage Keys

| Key | Description |
|-----|-------------|
| `patriot_high_scores` | JSON array of {name, score} objects |
| `patriot_player_name` | Last entered player name |
| `patriot_game_stats` | Game statistics |

---

## Build Commands

```powershell
# Development
npm run dev

# Production build
npm run build

# Android (Capacitor)
npx cap add android
npx cap sync
npx cap open android
```

---

## Contact

For questions about this codebase, refer to this handoff document or the inline code comments.

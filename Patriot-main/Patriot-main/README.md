# Patriot

A Phaser 3 game built with TypeScript and Vite.

## Prerequisites

- **Node.js** (v20 or later)
  - System-wide installation recommended: Download from [nodejs.org](https://nodejs.org/)
  - Or use the bundled version in `node-v20.18.0-win-x64/` (Windows only)

## Setup

### Option 1: Using System Node.js (Recommended)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Option 2: Using Bundled Node (Windows only)

If you don't have Node.js installed system-wide, add the bundled Node to your PATH:

```powershell
# PowerShell
$env:PATH = "$(Get-Location)\node-v20.18.0-win-x64;$env:PATH"
npm install
npm run dev
```

```cmd
# Command Prompt
set PATH=%CD%\node-v20.18.0-win-x64;%PATH%
npm install
npm run dev
```

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle to `dist/`
- `npm run preview` - Preview production build locally
- `npm test` - Run TypeScript compilation and tests

## Audio Support

The game uses dual-format audio loading for cross-platform compatibility:
- **MP3** files for iOS/Safari (doesn't support OGG)
- **OGG** files for other browsers

All required MP3 files are included. If you add new audio:
1. Create both MP3 and OGG versions
2. Load with array format: `this.load.audio('key', ['path/file.mp3', 'path/file.ogg'])`

## Build for Production

```bash
# Build optimized bundle
npm run build

# Output will be in dist/ folder
# Upload contents to your web server
```

### CI/CD Notes

For CI/CD pipelines, ensure Node.js is installed in the build environment:

```yaml
# Example GitHub Actions
- uses: actions/setup-node@v4
  with:
    node-version: '20'
- run: npm ci
- run: npm test
- run: npm run build
```

## Asset Optimization

To reduce bundle size:

```bash
# Optimize images
npm run optimize:images

# Optimize audio
npm run optimize:audio
```

Current asset size: ~30 MB (after removing unused WAV files)

## Browser Support

- ✅ Chrome/Edge (desktop & mobile)
- ✅ Firefox (desktop & mobile)
- ✅ Safari (desktop & iOS) - requires MP3 audio
- ✅ Mobile WebView (iOS & Android)
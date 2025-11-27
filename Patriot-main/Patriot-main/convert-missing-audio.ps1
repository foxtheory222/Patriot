# Convert Missing Audio Files for iOS Support
# This script converts WAV/OGG files to MP3 format for iOS/Safari compatibility

# Check if ffmpeg is installed
$ffmpegAvailable = Get-Command ffmpeg -ErrorAction SilentlyContinue

if (-not $ffmpegAvailable) {
    Write-Host "Warning: ffmpeg is not installed." -ForegroundColor Yellow
    Write-Host "Attempting to use existing WAV files as source instead..." -ForegroundColor Cyan
    Write-Host "For best results, install ffmpeg: winget install ffmpeg" -ForegroundColor Yellow
    Write-Host ""
}

# Files that need MP3 conversion
# Prefer WAV as source (higher quality), fall back to OGG if no WAV exists
$filesToConvert = @(
    @{
        Source = @("public/assets/music/instructions/awesomeness.wav", "public/assets/music/instructions/awesomeness.ogg")
        Target = "public/assets/music/instructions/awesomeness.mp3"
    },
    @{
        Source = @("public/assets/music/hiScore/sad_game_over.wav", "public/assets/music/hiScore/sad_game_over.ogg")
        Target = "public/assets/music/hiScore/sad_game_over.mp3"
    },
    @{
        Source = @("public/assets/music/gameMusic/xenostar2loop_.ogg")
        Target = "public/assets/music/gameMusic/xenostar2loop_.mp3"
    }
)

Write-Host "Converting audio files to MP3 for iOS compatibility..." -ForegroundColor Cyan
Write-Host ""

$convertedCount = 0
$skippedCount = 0
$failedCount = 0

foreach ($file in $filesToConvert) {
    $targetFile = $file.Target
    
    if (Test-Path $targetFile) {
        Write-Host "✓ $targetFile already exists, skipping..." -ForegroundColor Green
        $skippedCount++
        continue
    }
    
    # Find first available source file
    $sourceFile = $null
    foreach ($src in $file.Source) {
        if (Test-Path $src) {
            $sourceFile = $src
            break
        }
    }
    
    if (-not $sourceFile) {
        Write-Host "✗ No source file found for $targetFile" -ForegroundColor Red
        Write-Host "  Tried: $($file.Source -join ', ')" -ForegroundColor Gray
        $failedCount++
        continue
    }
    
    Write-Host "Converting: $sourceFile -> $targetFile" -ForegroundColor Yellow
    
    if ($ffmpegAvailable) {
        # Use ffmpeg for conversion (high quality VBR ~192kbps)
        ffmpeg -i $sourceFile -codec:a libmp3lame -qscale:a 2 $targetFile -y 2>$null
        
        if ($LASTEXITCODE -eq 0 -and (Test-Path $targetFile)) {
            $size = [math]::Round((Get-Item $targetFile).Length / 1MB, 2)
            Write-Host "✓ Successfully converted: $targetFile ($size MB)" -ForegroundColor Green
            $convertedCount++
        } else {
            Write-Host "✗ Failed to convert: $sourceFile" -ForegroundColor Red
            $failedCount++
        }
    } else {
        Write-Host "✗ Cannot convert without ffmpeg. Please install: winget install ffmpeg" -ForegroundColor Red
        $failedCount++
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Conversion Summary:" -ForegroundColor Cyan
Write-Host "  Converted: $convertedCount" -ForegroundColor Green
Write-Host "  Skipped:   $skippedCount" -ForegroundColor Yellow
Write-Host "  Failed:    $failedCount" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Cyan

if ($convertedCount -gt 0) {
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Test the game in Safari/iOS to verify audio works" -ForegroundColor White
    Write-Host "2. Run .\remove-unused-audio.ps1 to delete WAV files and save ~11 MB" -ForegroundColor White
    Write-Host "3. Run npm run build to create production bundle" -ForegroundColor White
}

if ($failedCount -gt 0) {
    exit 1
}

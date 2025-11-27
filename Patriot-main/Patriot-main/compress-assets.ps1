# Compress Oversized Assets for Mobile APK
# This script compresses large PNG images and audio files

Write-Host "Compressing oversized assets for mobile..." -ForegroundColor Cyan
Write-Host ""

# Check for required tools
$ffmpegAvailable = Get-Command ffmpeg -ErrorAction SilentlyContinue
$magickAvailable = Get-Command magick -ErrorAction SilentlyContinue

if (-not $ffmpegAvailable) {
    Write-Host "Warning: ffmpeg not found. Audio compression will be skipped." -ForegroundColor Yellow
    Write-Host "Install: winget install ffmpeg" -ForegroundColor Gray
}

if (-not $magickAvailable) {
    Write-Host "Warning: ImageMagick not found. Image compression will use basic methods." -ForegroundColor Yellow
    Write-Host "Install: winget install ImageMagick.ImageMagick" -ForegroundColor Gray
}

Write-Host ""

# ==================== IMAGE COMPRESSION ====================
Write-Host "=== Compressing Images ===" -ForegroundColor Cyan

$imagesToCompress = @(
    @{ Path = "public/assets/scenes/instructions/instructions.png"; MaxWidth = 1920 },
    @{ Path = "public/assets/scenes/gameOver/gameOver.png"; MaxWidth = 1920 },
    @{ Path = "public/assets/scenes/mainMenu/scoreScreen.png"; MaxWidth = 1920 },
    @{ Path = "public/assets/instructions.png"; MaxWidth = 1920 },
    @{ Path = "public/assets/gameOver.png"; MaxWidth = 1920 }
)

$totalImageSaved = 0

foreach ($img in $imagesToCompress) {
    $path = $img.Path
    $maxWidth = $img.MaxWidth
    
    if (-not (Test-Path $path)) {
        Write-Host "⚠ Not found: $path" -ForegroundColor Yellow
        continue
    }
    
    $originalSize = (Get-Item $path).Length
    $originalSizeMB = [math]::Round($originalSize / 1MB, 2)
    
    Write-Host "Processing: $path ($originalSizeMB MB)" -ForegroundColor White
    
    if ($magickAvailable) {
        # Use ImageMagick for high-quality compression
        $tempPath = "$path.tmp.png"
        
        # Resize if too large, compress with quality 85, optimize
        & magick convert $path -resize "${maxWidth}x>" -quality 85 -strip $tempPath 2>$null
        
        if ($LASTEXITCODE -eq 0 -and (Test-Path $tempPath)) {
            $newSize = (Get-Item $tempPath).Length
            $saved = $originalSize - $newSize
            $savedMB = [math]::Round($saved / 1MB, 2)
            
            if ($saved -gt 0) {
                Move-Item -Force $tempPath $path
                Write-Host "  ✓ Compressed: saved $savedMB MB" -ForegroundColor Green
                $totalImageSaved += $saved
            } else {
                Remove-Item $tempPath
                Write-Host "  - Already optimized" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "  ⚠ Skipped (no ImageMagick)" -ForegroundColor Yellow
    }
}

# ==================== AUDIO COMPRESSION ====================
Write-Host ""
Write-Host "=== Compressing Audio ===" -ForegroundColor Cyan

$audioToCompress = @(
    @{ Path = "public/assets/music/titleScreen/maxkomusic-true-patriot.mp3"; Bitrate = "96k" },
    @{ Path = "public/assets/music/titleScreen/maxkomusic-true-patriot.ogg"; Bitrate = "96k" },
    @{ Path = "public/assets/music/gameMusic/xenostar2loop_.mp3"; Bitrate = "96k" },
    @{ Path = "public/assets/music/gameMusic/xenostar2loop_.ogg"; Bitrate = "96k" },
    @{ Path = "public/assets/music/instructions/awesomeness.mp3"; Bitrate = "96k" }
)

$totalAudioSaved = 0

foreach ($audio in $audioToCompress) {
    $path = $audio.Path
    $bitrate = $audio.Bitrate
    
    if (-not (Test-Path $path)) {
        Write-Host "⚠ Not found: $path" -ForegroundColor Yellow
        continue
    }
    
    $originalSize = (Get-Item $path).Length
    $originalSizeMB = [math]::Round($originalSize / 1MB, 2)
    
    Write-Host "Processing: $path ($originalSizeMB MB)" -ForegroundColor White
    
    if ($ffmpegAvailable) {
        $tempPath = "$path.tmp"
        $ext = [System.IO.Path]::GetExtension($path)
        
        if ($ext -eq ".mp3") {
            # Compress MP3 to lower bitrate
            & ffmpeg -i $path -codec:a libmp3lame -b:a $bitrate $tempPath -y 2>$null
        } elseif ($ext -eq ".ogg") {
            # Compress OGG to lower bitrate
            & ffmpeg -i $path -codec:a libvorbis -b:a $bitrate $tempPath -y 2>$null
        }
        
        if ($LASTEXITCODE -eq 0 -and (Test-Path $tempPath)) {
            $newSize = (Get-Item $tempPath).Length
            $saved = $originalSize - $newSize
            $savedMB = [math]::Round($saved / 1MB, 2)
            $newSizeMB = [math]::Round($newSize / 1MB, 2)
            
            if ($saved -gt 100KB) {  # Only replace if we save meaningful space
                Move-Item -Force $tempPath $path
                Write-Host "  ✓ Compressed: $originalSizeMB MB -> $newSizeMB MB (saved $savedMB MB)" -ForegroundColor Green
                $totalAudioSaved += $saved
            } else {
                Remove-Item $tempPath -ErrorAction SilentlyContinue
                Write-Host "  - Already optimized" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "  ⚠ Skipped (no ffmpeg)" -ForegroundColor Yellow
    }
}

# ==================== SUMMARY ====================
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Compression Summary:" -ForegroundColor Cyan

$totalImageSavedMB = [math]::Round($totalImageSaved / 1MB, 2)
$totalAudioSavedMB = [math]::Round($totalAudioSaved / 1MB, 2)
$totalSavedMB = $totalImageSavedMB + $totalAudioSavedMB

Write-Host "  Images saved: $totalImageSavedMB MB" -ForegroundColor Green
Write-Host "  Audio saved:  $totalAudioSavedMB MB" -ForegroundColor Green
Write-Host "  Total saved:  $totalSavedMB MB" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan

# Calculate new total size
$newTotalSize = (Get-ChildItem -Path "public/assets" -Recurse -File | Measure-Object -Property Length -Sum).Sum
$newTotalSizeMB = [math]::Round($newTotalSize / 1MB, 2)

Write-Host ""
Write-Host "New assets total: $newTotalSizeMB MB" -ForegroundColor Cyan

if ($totalSavedMB -gt 0) {
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Test the game to ensure quality is acceptable" -ForegroundColor White
    Write-Host "2. Run: npm run build" -ForegroundColor White
    Write-Host "3. Test on actual mobile device" -ForegroundColor White
}

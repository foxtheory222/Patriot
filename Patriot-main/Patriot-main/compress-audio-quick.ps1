# Quick Audio Compression for Mobile APK
# Compresses large audio files to 96kbps for faster loading

Write-Host "Compressing audio files..." -ForegroundColor Cyan

# Ensure ffmpeg is in PATH
$ffmpegPath = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "ffmpeg.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty DirectoryName
if ($ffmpegPath) {
    $env:PATH = "$ffmpegPath;$env:PATH"
}

$filesToCompress = @(
    "public/assets/music/titleScreen/maxkomusic-true-patriot.mp3",
    "public/assets/music/titleScreen/maxkomusic-true-patriot.ogg",
    "public/assets/music/gameMusic/xenostar2loop_.mp3",
    "public/assets/music/gameMusic/xenostar2loop_.ogg",
    "public/assets/music/instructions/awesomeness.mp3",
    "public/assets/music/instructions/awesomeness.ogg"
)

$totalSaved = 0

foreach ($file in $filesToCompress) {
    if (-not (Test-Path $file)) { continue }
    
    $originalSize = (Get-Item $file).Length
    $ext = [System.IO.Path]::GetExtension($file)
    $temp = "$file.tmp"
    
    Write-Host "`nCompressing: $file" -ForegroundColor Yellow
    
    if ($ext -eq ".mp3") {
        ffmpeg -i $file -codec:a libmp3lame -b:a 96k $temp -y 2>$null
    } else {
        ffmpeg -i $file -codec:a libvorbis -b:a 96k $temp -y 2>$null
    }
    
    if (Test-Path $temp) {
        $newSize = (Get-Item $temp).Length
        $saved = $originalSize - $newSize
        
        if ($saved -gt 100KB) {
            Move-Item -Force $temp $file
            $savedMB = [math]::Round($saved / 1MB, 2)
            Write-Host "  ✓ Saved $savedMB MB" -ForegroundColor Green
            $totalSaved += $saved
        } else {
            Remove-Item $temp
            Write-Host "  - Already optimized" -ForegroundColor Gray
        }
    }
}

$totalSavedMB = [math]::Round($totalSaved / 1MB, 2)
Write-Host "`n✓ Total saved: $totalSavedMB MB" -ForegroundColor Cyan

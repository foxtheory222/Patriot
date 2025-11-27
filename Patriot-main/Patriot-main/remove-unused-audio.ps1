# Remove Unused Audio Files
# This script removes WAV files now that MP3 versions exist for iOS compatibility

Write-Host "Scanning for unused audio files..." -ForegroundColor Cyan
Write-Host ""

# WAV files to remove (MP3 and OGG versions now exist)
$wavFilesToRemove = @(
    "public/assets/music/instructions/awesomeness.wav",
    "public/assets/music/hiScore/sad_game_over.wav"
)

# Find any other WAV files that might exist
$allWavFiles = Get-ChildItem -Path "public/assets/music" -Filter *.wav -Recurse

$totalSizeBefore = 0
$totalSizeRemoved = 0
$removedCount = 0

foreach ($wavFile in $allWavFiles) {
    $size = $wavFile.Length
    $totalSizeBefore += $size
    $sizeInMB = [math]::Round($size / 1MB, 2)
    
    $relativePath = $wavFile.FullName.Replace((Get-Location).Path + "\", "")
    
    Write-Host "Found: $relativePath ($sizeInMB MB)" -ForegroundColor Yellow
    
    # Check if both MP3 and OGG versions exist
    $basePath = $wavFile.FullName -replace '\.wav$', ''
    $mp3Exists = Test-Path "$basePath.mp3"
    $oggExists = Test-Path "$basePath.ogg"
    
    if ($mp3Exists -and $oggExists) {
        Write-Host "  ✓ MP3 and OGG versions exist - SAFE TO REMOVE" -ForegroundColor Green
        Remove-Item $wavFile.FullName -Force
        Write-Host "  ✓ Removed: $relativePath" -ForegroundColor Green
        $totalSizeRemoved += $size
        $removedCount++
    } elseif ($mp3Exists) {
        Write-Host "  ⚠ Only MP3 exists (no OGG) - REMOVING (MP3 is sufficient for iOS)" -ForegroundColor Yellow
        Remove-Item $wavFile.FullName -Force
        Write-Host "  ✓ Removed: $relativePath" -ForegroundColor Green
        $totalSizeRemoved += $size
        $removedCount++
    } else {
        Write-Host "  ⚠ No MP3 or OGG version - KEEPING (might be needed)" -ForegroundColor Red
    }
    Write-Host ""
}

$totalSizeBeforeMB = [math]::Round($totalSizeBefore / 1MB, 2)
$totalSizeRemovedMB = [math]::Round($totalSizeRemoved / 1MB, 2)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Cleanup Summary:" -ForegroundColor Cyan
Write-Host "  WAV files found:   $($allWavFiles.Count)" -ForegroundColor White
Write-Host "  WAV files removed: $removedCount" -ForegroundColor Green
Write-Host "  Total size before: $totalSizeBeforeMB MB" -ForegroundColor White
Write-Host "  Space saved:       $totalSizeRemovedMB MB" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan

if ($removedCount -gt 0) {
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Run: npm run build" -ForegroundColor White
    Write-Host "2. Check dist/ folder size (should be smaller)" -ForegroundColor White
    Write-Host "3. Test the game to ensure audio still works" -ForegroundColor White
    Write-Host "4. Test on iOS/Safari specifically" -ForegroundColor White
}

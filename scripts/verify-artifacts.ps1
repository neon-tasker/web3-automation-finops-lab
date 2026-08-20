$ErrorActionPreference = "Stop"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  NEON TASKER LABS - MASTER ARTIFACT VERIFICATION GATE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$manifestPath = "FILE_MANIFEST.md"
if (-not (Test-Path $manifestPath)) {
    Write-Host " [FATAL] FILE_MANIFEST.md is missing!" -ForegroundColor Red
    exit 1
}

$rawLines = Get-Content $manifestPath
$expectedFiles = @()

foreach ($line in $rawLines) {
    if ($line.StartsWith('| `')) {
        $parts = $line.Split('`')
        if ($parts.Length -ge 2) {
            $expectedFiles += $parts[1].Trim()
        }
    }
}

$missing = @()
foreach ($f in $expectedFiles) {
    if (-not (Test-Path $f)) {
        $missing += $f
        Write-Host " [MISSING] $f" -ForegroundColor Red
    }
}

if ($missing.Count -gt 0) {
    Write-Host "`n[FATAL] Artifact Gate Failed: $($missing.Count) files missing." -ForegroundColor Red
    exit 1
}

if ($expectedFiles.Count -ne 54) {
    Write-Host "`n[FATAL] Manifest count is $($expectedFiles.Count), expected exactly 54." -ForegroundColor Red
    exit 1
}

Write-Host " [PASS] Exactly 54/54 artifacts verified on disk." -ForegroundColor Green

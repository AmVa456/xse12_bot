# ================================
#  Luv Media Favicon Generator
#  Generates PNG sizes + favicon.ico
#  Author: Dani’s Copilot
# ================================

Write-Host "`n🌸 Luv Media Favicon Generator" -ForegroundColor Magenta
Write-Host "----------------------------------------`n"

# Detect SVG
$svg = "LMFavFlt.svg"

if (-Not (Test-Path $svg)) {
    Write-Host "❌ Could not find $svg in this folder." -ForegroundColor Red
    Write-Host "Place LMFavFlt.svg next to this script and run again.`n"
    exit
}

Write-Host "✔ Found $svg" -ForegroundColor Green

# Check for ImageMagick
$magick = Get-Command magick -ErrorAction SilentlyContinue

if (-Not $magick) {
    Write-Host "❌ ImageMagick (magick.exe) not found." -ForegroundColor Red
    Write-Host "Install it using:" -ForegroundColor Yellow
    Write-Host "  winget install ImageMagick.ImageMagick"
    Write-Host "  or"
    Write-Host "  choco install imagemagick`n"
    exit
}

Write-Host "✔ ImageMagick detected" -ForegroundColor Green

# PNG sizes
$sizes = @(512, 256, 128, 64, 32, 16)

Write-Host "`n🎨 Generating PNG sizes..." -ForegroundColor Cyan

foreach ($size in $sizes) {
    $outfile = "favicon-$size.png"
    magick $svg -resize "${size}x$size" $outfile
    Write-Host "  ✔ Created $outfile" -ForegroundColor Green
}

# Build ICO
Write-Host "`n🧩 Building favicon.ico..." -ForegroundColor Cyan

$pngList = $sizes | ForEach-Object { "favicon-$_.png" }

magick $pngList favicon.ico

Write-Host "  ✔ favicon.ico created" -ForegroundColor Green

Write-Host "`n✨ All done! Your favicon set is ready." -ForegroundColor Magenta
Write-Host "----------------------------------------`n"

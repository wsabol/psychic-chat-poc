Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Projects\psychic-chat-poc\StarshipPsychics_Logo.png'
$src = [System.Drawing.Image]::FromFile($srcPath)

$configs = @(
    @{ dir = 'mipmap-mdpi';    size = 48 },
    @{ dir = 'mipmap-hdpi';    size = 72 },
    @{ dir = 'mipmap-xhdpi';   size = 96 },
    @{ dir = 'mipmap-xxhdpi';  size = 144 },
    @{ dir = 'mipmap-xxxhdpi'; size = 192 }
)

foreach ($config in $configs) {
    $size = $config.size
    $destDir = 'C:\Projects\psychic-chat-poc\mobile\android\app\src\main\res\' + $config.dir

    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $bitmap.SetResolution(72, 72)
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()

    $launcher = Join-Path $destDir 'ic_launcher.png'
    $launcherRound = Join-Path $destDir 'ic_launcher_round.png'
    $bitmap.Save($launcher, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Save($launcherRound, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Host "Wrote ${size}x${size} icons to $destDir"
}

$src.Dispose()
Write-Host 'Done! All Android app icons replaced with StarshipPsychics_Logo.png'

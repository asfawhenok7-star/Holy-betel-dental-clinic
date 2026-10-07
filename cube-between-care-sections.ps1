$File = "C:\Users\HP\dental-clinic\frontend\index.html"

if (!(Test-Path $File)) {
    Write-Host "ERROR: index.html not found." -ForegroundColor Red
    exit
}

$Backup = "$File.before-cube-between-care-v2"

Copy-Item $File $Backup -Force

$html = Get-Content $File -Raw -Encoding UTF8

# ============================================================
# FIND THE EXISTING CUBE USING ITS UNIQUE ID
# ============================================================

$cubeId = 'id="dentalCube"'

$cubeIdPosition = $html.IndexOf($cubeId)

if ($cubeIdPosition -lt 0) {
    Write-Host "ERROR: dentalCube was not found." -ForegroundColor Red
    Write-Host "No changes were made." -ForegroundColor Yellow
    exit
}

# Find the opening wrapper before the cube
$wrapperStart = $html.LastIndexOf('<div', $cubeIdPosition)

while ($wrapperStart -ge 0) {

    $wrapperTextEnd = $html.IndexOf('>', $wrapperStart)

    if ($wrapperTextEnd -gt $cubeIdPosition) {
        $wrapperStart = $html.LastIndexOf('<div', $wrapperStart - 1)
        continue
    }

    $wrapperText = $html.Substring(
        $wrapperStart,
        $wrapperTextEnd - $wrapperStart + 1
    )

    if ($wrapperText -match 'dental-cube-wrap') {
        break
    }

    $wrapperStart = $html.LastIndexOf('<div', $wrapperStart - 1)
}

if ($wrapperStart -lt 0) {
    Write-Host "ERROR: dental-cube-wrap opening tag was not found." -ForegroundColor Red
    Copy-Item $Backup $File -Force
    exit
}

# ============================================================
# FIND THE COMPLETE CUBE WRAPPER
# ============================================================

$position = $wrapperStart
$depth = 0
$wrapperEnd = -1

while ($position -lt $html.Length) {

    $nextOpen = $html.IndexOf('<div', $position)
    $nextClose = $html.IndexOf('</div>', $position)

    if ($nextClose -lt 0) {
        break
    }

    if ($nextOpen -ge 0 -and $nextOpen -lt $nextClose) {

        $depth++
        $position = $nextOpen + 4

    } else {

        $depth--

        if ($depth -eq 0) {
            $wrapperEnd = $nextClose + 6
            break
        }

        $position = $nextClose + 6
    }
}

if ($wrapperEnd -lt 0) {
    Write-Host "ERROR: Could not determine cube ending." -ForegroundColor Red
    Copy-Item $Backup $File -Force
    exit
}

# Save the existing cube exactly as it is
$cubeHTML = $html.Substring(
    $wrapperStart,
    $wrapperEnd - $wrapperStart
)

# Remove cube from current location
$html = $html.Remove(
    $wrapperStart,
    $wrapperEnd - $wrapperStart
)

# ============================================================
# FIND "COMPLETE CARE FOR YOUR SMILE"
# ============================================================

$target = "Complete care for your smile"

$targetPosition = $html.IndexOf($target)

if ($targetPosition -lt 0) {

    # Try case-insensitive search
    $targetPosition = [regex]::Match(
        $html,
        [regex]::Escape($target),
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    ).Index
}

if ($targetPosition -le 0) {
    Write-Host "ERROR: 'Complete care for your smile' was not found." -ForegroundColor Red
    Copy-Item $Backup $File -Force
    exit
}

# ============================================================
# FIND THE SECTION CONTAINING THAT HEADING
# ============================================================

$sectionStart = $html.LastIndexOf('<section', $targetPosition)

if ($sectionStart -lt 0) {
    Write-Host "ERROR: Target section was not found." -ForegroundColor Red
    Copy-Item $Backup $File -Force
    exit
}

# ============================================================
# CREATE A CLEAN DEDICATED SPACE
# ============================================================

$dedicatedCubeSpace = @"

<!-- ==========================================================
     HOLY BETEL - DEDICATED 3D CUBE AREA
     This area belongs only to the dental cube.
========================================================== -->

<section class="holy-betel-dedicated-cube-area"
         aria-label="Holy Betel dental care highlights">

    <div class="holy-betel-cube-label">
        HOLY BETEL DENTAL CARE
    </div>

    $cubeHTML

</section>

"@

# Put the new cube area immediately before
# the "Complete care for your smile" section
$html =
    $html.Substring(0, $sectionStart) +
    $dedicatedCubeSpace +
    $html.Substring($sectionStart)

# ============================================================
# NEW CLEAN POSITIONING
# ============================================================

$css = @'

/* ============================================================
   HOLY BETEL - DEDICATED 3D CUBE AREA
   The cube has its own independent space.
   It does NOT sit over the smile image.
============================================================ */

.holy-betel-dedicated-cube-area{

    width:100% !important;

    min-height:390px !important;

    margin:55px auto 55px !important;

    padding:35px 20px 45px !important;

    display:flex !important;

    flex-direction:column !important;

    align-items:center !important;

    justify-content:center !important;

    position:relative !important;

    clear:both !important;

    box-sizing:border-box !important;

    overflow:visible !important;

    z-index:20 !important;

    background:transparent !important;
}


/* Small label */

.holy-betel-cube-label{

    margin-bottom:25px !important;

    text-align:center !important;

    font-size:12px !important;

    font-weight:800 !important;

    letter-spacing:2px !important;

    color:var(--blue) !important;
}


/* ============================================================
   CUBE WRAPPER
============================================================ */

.holy-betel-dedicated-cube-area .dental-cube-wrap{

    position:relative !important;

    top:auto !important;
    right:auto !important;
    bottom:auto !important;
    left:auto !important;

    transform:none !important;

    width:280px !important;

    height:280px !important;

    margin:0 auto !important;

    padding:0 !important;

    display:flex !important;

    align-items:center !important;

    justify-content:center !important;

    perspective:1400px !important;

    overflow:visible !important;

    z-index:30 !important;

    pointer-events:none !important;
}


/* ============================================================
   CUBE
============================================================ */

.holy-betel-dedicated-cube-area .dental-cube{

    position:relative !important;

    width:210px !important;

    height:210px !important;

    margin:0 !important;

    transform-style:preserve-3d !important;

    will-change:transform !important;
}


/* ============================================================
   CUBE FACES
============================================================ */

.holy-betel-dedicated-cube-area .cube-face{

    position:absolute !important;

    width:210px !important;

    height:210px !important;

    display:flex !important;

    align-items:center !important;

    justify-content:center !important;

    box-sizing:border-box !important;

    padding:24px !important;

    font-size:17px !important;

    font-weight:900 !important;

    letter-spacing:1px !important;

    text-align:center !important;

    color:var(--navy) !important;

    background:
        linear-gradient(
            145deg,
            rgba(255,255,255,.98),
            rgba(234,247,251,.96)
        ) !important;

    border:2px solid rgba(8,126,165,.30) !important;

    box-shadow:
        inset 0 0 30px rgba(18,191,211,.08),
        0 18px 40px rgba(7,91,120,.15) !important;

    backface-visibility:hidden !important;

    -webkit-backface-visibility:hidden !important;
}


/* ============================================================
   CUBE DEPTH
============================================================ */

.holy-betel-dedicated-cube-area .cube-front{
    transform:translateZ(105px) !important;
}

.holy-betel-dedicated-cube-area .cube-back{
    transform:rotateY(180deg) translateZ(105px) !important;
}

.holy-betel-dedicated-cube-area .cube-right{
    transform:rotateY(90deg) translateZ(105px) !important;
}

.holy-betel-dedicated-cube-area .cube-left{
    transform:rotateY(-90deg) translateZ(105px) !important;
}

.holy-betel-dedicated-cube-area .cube-top{
    transform:rotateX(90deg) translateZ(105px) !important;
}

.holy-betel-dedicated-cube-area .cube-bottom{
    transform:rotateX(-90deg) translateZ(105px) !important;
}


/* ============================================================
   MOBILE
============================================================ */

@media(max-width:650px){

    .holy-betel-dedicated-cube-area{

        min-height:300px !important;

        margin:35px auto 35px !important;

        padding:30px 15px 35px !important;
    }


    .holy-betel-cube-label{

        margin-bottom:18px !important;

        font-size:10px !important;

        letter-spacing:1.5px !important;
    }


    .holy-betel-dedicated-cube-area .dental-cube-wrap{

        width:210px !important;

        height:210px !important;
    }


    .holy-betel-dedicated-cube-area .dental-cube{

        width:150px !important;

        height:150px !important;
    }


    .holy-betel-dedicated-cube-area .cube-face{

        width:150px !important;

        height:150px !important;

        font-size:12px !important;

        padding:14px !important;
    }


    .holy-betel-dedicated-cube-area .cube-front{
        transform:translateZ(75px) !important;
    }

    .holy-betel-dedicated-cube-area .cube-back{
        transform:rotateY(180deg) translateZ(75px) !important;
    }

    .holy-betel-dedicated-cube-area .cube-right{
        transform:rotateY(90deg) translateZ(75px) !important;
    }

    .holy-betel-dedicated-cube-area .cube-left{
        transform:rotateY(-90deg) translateZ(75px) !important;
    }

    .holy-betel-dedicated-cube-area .cube-top{
        transform:rotateX(90deg) translateZ(75px) !important;
    }

    .holy-betel-dedicated-cube-area .cube-bottom{
        transform:rotateX(-90deg) translateZ(75px) !important;
    }

}

'@

# Add CSS before the last </style>
$stylePosition = $html.LastIndexOf("</style>")

if ($stylePosition -lt 0) {
    Write-Host "ERROR: style section not found." -ForegroundColor Red
    Copy-Item $Backup $File -Force
    exit
}

$html =
    $html.Substring(0,$stylePosition) +
    $css +
    "`r`n" +
    $html.Substring($stylePosition)

# Save
Set-Content -Path $File -Value $html -Encoding UTF8

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " 3D CUBE MOVED SUCCESSFULLY" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Existing cube preserved." -ForegroundColor Green
Write-Host "Existing rotation preserved." -ForegroundColor Green
Write-Host "Existing cube faces preserved." -ForegroundColor Green
Write-Host ""
Write-Host "The cube now has its OWN dedicated space." -ForegroundColor Yellow
Write-Host "It is placed BEFORE: Complete care for your smile" -ForegroundColor Yellow
Write-Host "It does NOT cover the smile image." -ForegroundColor Yellow
Write-Host ""
Write-Host "Backup:" -ForegroundColor Cyan
Write-Host $Backup
Write-Host ""
# ============================================================
# HOLY BETEL - FIX 3D DENTAL CUBE
# Removes only the previously added cube and installs a fix
# ============================================================

$File = "C:\Users\HP\dental-clinic\frontend\index.html"

if (!(Test-Path $File)) {
    Write-Host "ERROR: index.html not found." -ForegroundColor Red
    exit
}

# Backup current file before changing anything
$Backup = "$File.before-cube-fix"

Copy-Item $File $Backup -Force

$html = Get-Content $File -Raw -Encoding UTF8

# ============================================================
# REMOVE PREVIOUS CUBE CSS
# ============================================================

$cssStart = $html.IndexOf("/* =========================================================`r`n   HOLY BETEL - 3D DENTAL CUBE")

if ($cssStart -lt 0) {
    $cssStart = $html.IndexOf("/* =========================================================`n   HOLY BETEL - 3D DENTAL CUBE")
}

if ($cssStart -ge 0) {

    $cssEnd = $html.IndexOf("</style>", $cssStart)

    if ($cssEnd -ge 0) {

        $before = $html.Substring(0, $cssStart)
        $after = $html.Substring($cssEnd)

        $html = $before + $after

    }
}

# ============================================================
# REMOVE PREVIOUS CUBE HTML
# ============================================================

$cubeHtmlStart = $html.IndexOf('<!-- HOLY BETEL - ROTATING 3D DENTAL CUBE -->')

if ($cubeHtmlStart -ge 0) {

    $cubeHtmlEnd = $html.IndexOf('</div>', $cubeHtmlStart)

    # Find the closing structure safely by removing the known
    # cube wrapper section using the dental-cube-wrap class.
    $wrapStart = $html.IndexOf('<div', $cubeHtmlStart)

    if ($wrapStart -ge 0) {

        $pos = $wrapStart
        $depth = 0
        $end = -1

        while ($pos -lt $html.Length) {

            $nextOpen = $html.IndexOf('<div', $pos)
            $nextClose = $html.IndexOf('</div>', $pos)

            if ($nextClose -lt 0) {
                break
            }

            if ($nextOpen -ge 0 -and $nextOpen -lt $nextClose) {

                $depth++
                $pos = $nextOpen + 4

            }
            else {

                $depth--

                if ($depth -eq 0) {

                    $end = $nextClose + 6
                    break

                }

                $pos = $nextClose + 6
            }
        }

        if ($end -gt $wrapStart) {

            $before = $html.Substring(0, $cubeHtmlStart)
            $after = $html.Substring($end)

            $html = $before + $after
        }
    }
}

# ============================================================
# REMOVE PREVIOUS CUBE JAVASCRIPT
# ============================================================

$jsMarker = '/* HOLY BETEL - 3D DENTAL CUBE */'

$jsStart = $html.IndexOf($jsMarker)

if ($jsStart -ge 0) {

    $jsEnd = $html.IndexOf('</script>', $jsStart)

    if ($jsEnd -ge 0) {

        $before = $html.Substring(0, $jsStart)
        $after = $html.Substring($jsEnd)

        $html = $before + $after
    }
}

# ============================================================
# NEW CUBE CSS
# ============================================================

$cubeCSS = @'

/* ============================================================
   HOLY BETEL - CORRECTED 3D DENTAL CUBE
============================================================ */

.hero-inner{
  position:relative;
}

.dental-cube-wrap{
  position:absolute;
  top:50%;
  right:5%;
  width:300px;
  height:300px;
  transform:translateY(-50%);
  display:flex;
  align-items:center;
  justify-content:center;
  perspective:1000px;
  z-index:5;
  pointer-events:none;
}

.dental-cube{
  position:relative;
  width:170px;
  height:170px;
  transform-style:preserve-3d;
  transform:rotateX(-12deg) rotateY(0deg);
  will-change:transform;
}

.cube-face{
  position:absolute;
  width:170px;
  height:170px;

  display:flex;
  align-items:center;
  justify-content:center;

  box-sizing:border-box;
  padding:20px;

  text-align:center;

  font-size:16px;
  font-weight:900;
  letter-spacing:1px;

  color:var(--navy);

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.98),
      rgba(234,247,251,.95)
    );

  border:2px solid rgba(8,126,165,.28);

  box-shadow:
    inset 0 0 24px rgba(18,191,211,.08),
    0 12px 30px rgba(7,91,120,.12);

  backface-visibility:hidden;
  -webkit-backface-visibility:hidden;
}

.cube-face::before{
  content:"+";
  position:absolute;
  top:12px;
  left:50%;
  transform:translateX(-50%);
  color:var(--cyan);
  font-size:14px;
  font-weight:900;
}

.cube-front{
  transform:translateZ(85px);
}

.cube-back{
  transform:rotateY(180deg) translateZ(85px);
}

.cube-right{
  transform:rotateY(90deg) translateZ(85px);
}

.cube-left{
  transform:rotateY(-90deg) translateZ(85px);
}

.cube-top{
  transform:rotateX(90deg) translateZ(85px);
}

.cube-bottom{
  transform:rotateX(-90deg) translateZ(85px);
}

.dental-cube-shadow{
  position:absolute;
  width:190px;
  height:28px;
  left:50%;
  bottom:34px;
  transform:translateX(-50%);
  border-radius:50%;
  background:rgba(7,91,120,.14);
  filter:blur(12px);
}

@media(max-width:1100px){

  .dental-cube-wrap{
    right:2%;
    width:230px;
    height:230px;
  }

  .dental-cube{
    width:140px;
    height:140px;
  }

  .cube-face{
    width:140px;
    height:140px;
    font-size:13px;
  }

  .cube-front{
    transform:translateZ(70px);
  }

  .cube-back{
    transform:rotateY(180deg) translateZ(70px);
  }

  .cube-right{
    transform:rotateY(90deg) translateZ(70px);
  }

  .cube-left{
    transform:rotateY(-90deg) translateZ(70px);
  }

  .cube-top{
    transform:rotateX(90deg) translateZ(70px);
  }

  .cube-bottom{
    transform:rotateX(-90deg) translateZ(70px);
  }

}

@media(max-width:650px){

  .dental-cube-wrap{
    position:relative;
    top:auto;
    right:auto;

    width:210px;
    height:210px;

    margin:25px auto 0;

    transform:none;
  }

  .dental-cube{
    width:125px;
    height:125px;
  }

  .cube-face{
    width:125px;
    height:125px;

    font-size:10px;
    letter-spacing:.7px;
    padding:12px;
  }

  .cube-front{
    transform:translateZ(62.5px);
  }

  .cube-back{
    transform:rotateY(180deg) translateZ(62.5px);
  }

  .cube-right{
    transform:rotateY(90deg) translateZ(62.5px);
  }

  .cube-left{
    transform:rotateY(-90deg) translateZ(62.5px);
  }

  .cube-top{
    transform:rotateX(90deg) translateZ(62.5px);
  }

  .cube-bottom{
    transform:rotateX(-90deg) translateZ(62.5px);
  }

  .dental-cube-shadow{
    width:140px;
    height:22px;
    bottom:24px;
  }

}

'@

# ============================================================
# NEW CUBE HTML
# ============================================================

$cubeHTML = @'

    <!-- HOLY BETEL - CORRECTED ROTATING 3D DENTAL CUBE -->

    <div
      class="dental-cube-wrap"
      aria-label="Holy Betel dental services 3D cube">

      <div class="dental-cube-shadow"></div>

      <div class="dental-cube" id="dentalCube">

        <div class="cube-face cube-front">
          DENTAL CARE
        </div>

        <div class="cube-face cube-back">
          SMILE
        </div>

        <div class="cube-face cube-right">
          IMPLANTS
        </div>

        <div class="cube-face cube-left">
          BRACES
        </div>

        <div class="cube-face cube-top">
          WHITENING
        </div>

        <div class="cube-face cube-bottom">
          HEALTHY TEETH
        </div>

      </div>

    </div>

'@

# ============================================================
# NEW CUBE JAVASCRIPT
# ============================================================

$cubeJS = @'

/* HOLY BETEL - CORRECTED 3D DENTAL CUBE */

(function(){

  "use strict";

  const cube = document.getElementById("dentalCube");

  if(!cube){
    return;
  }

  let rotationX = -12;
  let rotationY = 0;

  let lastTime = performance.now();

  function animateCube(currentTime){

    const delta = currentTime - lastTime;
    lastTime = currentTime;

    rotationY += delta * 0.045;

    rotationX = -12 + Math.sin(currentTime * 0.001) * 10;

    cube.style.transform =
      "rotateX(" + rotationX + "deg) " +
      "rotateY(" + rotationY + "deg)";

    requestAnimationFrame(animateCube);
  }

  requestAnimationFrame(animateCube);

})();

'@

# ============================================================
# INSERT CSS
# ============================================================

$stylePosition = $html.IndexOf("</style>")

if ($stylePosition -lt 0) {

    Write-Host "ERROR: style section not found." -ForegroundColor Red

    Copy-Item $Backup $File -Force

    exit
}

$html =
    $html.Substring(0, $stylePosition) +
    $cubeCSS +
    "`r`n" +
    $html.Substring($stylePosition)

# ============================================================
# INSERT HTML INTO EXISTING HERO
# ============================================================

$heroStart = $html.IndexOf('<section class="hero" id="home">')

if ($heroStart -lt 0) {

    Write-Host "ERROR: Existing hero section not found." -ForegroundColor Red

    Copy-Item $Backup $File -Force

    exit
}

$heroEnd = $html.IndexOf("</section>", $heroStart)

if ($heroEnd -lt 0) {

    Write-Host "ERROR: Hero closing tag not found." -ForegroundColor Red

    Copy-Item $Backup $File -Force

    exit
}

$html =
    $html.Substring(0, $heroEnd) +
    $cubeHTML +
    $html.Substring($heroEnd)

# ============================================================
# INSERT JAVASCRIPT BEFORE LAST SCRIPT TAG
# ============================================================

$scriptPosition = $html.LastIndexOf("</script>")

if ($scriptPosition -lt 0) {

    Write-Host "ERROR: Script section not found." -ForegroundColor Red

    Copy-Item $Backup $File -Force

    exit
}

$html =
    $html.Substring(0, $scriptPosition) +
    $cubeJS +
    "`r`n" +
    $html.Substring($scriptPosition)

# ============================================================
# SAVE
# ============================================================

Set-Content `
    -Path $File `
    -Value $html `
    -Encoding UTF8

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " 3D DENTAL CUBE FIXED" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup:" -ForegroundColor Yellow
Write-Host $Backup
Write-Host ""
Write-Host "The cube now uses JavaScript animation." -ForegroundColor Green
Write-Host "The cube is positioned on the right side of the hero." -ForegroundColor Green
Write-Host "Mobile positioning is also corrected." -ForegroundColor Green
Write-Host ""
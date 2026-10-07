# ============================================================
# HOLY BETEL SPECIALITY DENTAL CLINIC CENTER
# ONE-TIME 3D DENTAL CUBE INSTALLER
# ============================================================

$File = "C:\Users\HP\dental-clinic\frontend\index.html"

if (!(Test-Path $File)) {
    Write-Host "ERROR: index.html was not found." -ForegroundColor Red
    exit
}

$Backup = "$File.before-3d-cube"

Copy-Item $File $Backup -Force

$html = Get-Content $File -Raw -Encoding UTF8

# ============================================================
# 3D CUBE CSS
# ============================================================

$cubeCSS = @'

/* =========================================================
   HOLY BETEL - 3D DENTAL CUBE
========================================================= */

.hero-inner{
  position:relative;
}

.dental-cube-wrap{
  position:absolute;
  right:4%;
  top:50%;
  transform:translateY(-50%);
  width:320px;
  height:320px;
  display:grid;
  place-items:center;
  perspective:1100px;
  z-index:3;
  pointer-events:none;
}

.dental-cube{
  width:190px;
  height:190px;
  position:relative;
  transform-style:preserve-3d;
  animation:dentalCubeRotate 18s linear infinite;
}

.cube-face{
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  padding:18px;

  color:var(--navy);

  font-size:17px;
  font-weight:900;
  letter-spacing:1.2px;

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.98),
      rgba(234,247,251,.94)
    );

  border:2px solid rgba(8,126,165,.30);

  box-shadow:
    inset 0 0 25px rgba(18,191,211,.08),
    0 12px 28px rgba(7,91,120,.12);

  backface-visibility:hidden;
  -webkit-backface-visibility:hidden;
}

.cube-face::before{
  content:"*";
  position:absolute;
  top:13px;
  left:50%;
  transform:translateX(-50%);
  color:var(--cyan);
  font-size:14px;
  opacity:.75;
}

.cube-front{
  transform:translateZ(95px);
}

.cube-back{
  transform:rotateY(180deg) translateZ(95px);
}

.cube-right{
  transform:rotateY(90deg) translateZ(95px);
}

.cube-left{
  transform:rotateY(-90deg) translateZ(95px);
}

.cube-top{
  transform:rotateX(90deg) translateZ(95px);
}

.cube-bottom{
  transform:rotateX(-90deg) translateZ(95px);
}

@keyframes dentalCubeRotate{

  0%{
    transform:
      rotateX(-12deg)
      rotateY(0deg);
  }

  25%{
    transform:
      rotateX(10deg)
      rotateY(90deg);
  }

  50%{
    transform:
      rotateX(-10deg)
      rotateY(180deg);
  }

  75%{
    transform:
      rotateX(10deg)
      rotateY(270deg);
  }

  100%{
    transform:
      rotateX(-12deg)
      rotateY(360deg);
  }

}

.dental-cube-shadow{
  position:absolute;
  width:220px;
  height:34px;
  bottom:38px;
  left:50%;
  transform:translateX(-50%);
  border-radius:50%;
  background:rgba(7,91,120,.13);
  filter:blur(12px);
  z-index:-1;
}


/* =========================================================
   TABLET
========================================================= */

@media(max-width:1000px){

  .dental-cube-wrap{
    right:1%;
    width:250px;
    height:250px;
    opacity:.94;
  }

  .dental-cube{
    width:150px;
    height:150px;
  }

  .cube-front{
    transform:translateZ(75px);
  }

  .cube-back{
    transform:rotateY(180deg) translateZ(75px);
  }

  .cube-right{
    transform:rotateY(90deg) translateZ(75px);
  }

  .cube-left{
    transform:rotateY(-90deg) translateZ(75px);
  }

  .cube-top{
    transform:rotateX(90deg) translateZ(75px);
  }

  .cube-bottom{
    transform:rotateX(-90deg) translateZ(75px);
  }

  .cube-face{
    font-size:13px;
    padding:12px;
  }

  .dental-cube-shadow{
    width:170px;
    height:27px;
  }

}


/* =========================================================
   MOBILE
========================================================= */

@media(max-width:650px){

  .hero{
    min-height:auto;
    padding-bottom:55px;
  }

  .hero-inner{
    position:relative;
  }

  .dental-cube-wrap{
    position:relative;
    right:auto;
    top:auto;
    transform:none;

    width:220px;
    height:220px;

    margin:38px auto 0;

    opacity:1;
  }

  .dental-cube{
    width:130px;
    height:130px;
  }

  .cube-front{
    transform:translateZ(65px);
  }

  .cube-back{
    transform:rotateY(180deg) translateZ(65px);
  }

  .cube-right{
    transform:rotateY(90deg) translateZ(65px);
  }

  .cube-left{
    transform:rotateY(-90deg) translateZ(65px);
  }

  .cube-top{
    transform:rotateX(90deg) translateZ(65px);
  }

  .cube-bottom{
    transform:rotateX(-90deg) translateZ(65px);
  }

  .cube-face{
    font-size:11px;
    letter-spacing:.8px;
    padding:9px;
  }

  .cube-face::before{
    top:8px;
    font-size:10px;
  }

  .dental-cube-shadow{
    width:145px;
    height:23px;
    bottom:25px;
  }

}


/* =========================================================
   REDUCED MOTION
========================================================= */

@media(prefers-reduced-motion:reduce){

  .dental-cube{
    animation:none;

    transform:
      rotateX(-10deg)
      rotateY(-25deg);
  }

}

'@

# ============================================================
# 3D CUBE HTML
# ============================================================

$cubeHTML = @'

    <!-- HOLY BETEL - ROTATING 3D DENTAL CUBE -->

    <div
      class="dental-cube-wrap"
      aria-label="Holy Betel dental services rotating 3D cube">

      <div class="dental-cube-shadow"></div>

      <div
        class="dental-cube"
        id="dentalCube">

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
# 3D CUBE JAVASCRIPT
# ============================================================

$cubeJS = @'

/* HOLY BETEL - 3D DENTAL CUBE */

(function(){

  "use strict";

  const dentalCube =
    document.getElementById("dentalCube");

  if(!dentalCube){
    return;
  }

  dentalCube.classList.add("holy-betel-cube-ready");

  console.log(
    "Holy Betel 3D dental cube loaded successfully."
  );

})();

'@

# ============================================================
# INSERT CSS
# ============================================================

if ($html -notmatch "HOLY BETEL - 3D DENTAL CUBE") {

    $html = $html -replace `
        '</style>', `
        ($cubeCSS + "`r`n</style>")

}

# ============================================================
# INSERT HTML INTO HERO
# ============================================================

if ($html -notmatch 'id="dentalCube"') {

    $heroStart = $html.IndexOf('<section class="hero" id="home">')

    if ($heroStart -lt 0) {

        Write-Host "ERROR: Hero section was not found." -ForegroundColor Red
        Write-Host "Your original index.html was NOT changed." -ForegroundColor Red

        Copy-Item $Backup $File -Force

        exit
    }

    $heroEnd = $html.IndexOf('</section>', $heroStart)

    if ($heroEnd -lt 0) {

        Write-Host "ERROR: Hero closing section was not found." -ForegroundColor Red
        Write-Host "Your original index.html was NOT changed." -ForegroundColor Red

        Copy-Item $Backup $File -Force

        exit
    }

    $insertPosition = $heroEnd

    $html =
        $html.Substring(0, $insertPosition) +
        $cubeHTML +
        $html.Substring($insertPosition)

}

# ============================================================
# INSERT JAVASCRIPT
# ============================================================

if ($html -notmatch "Holy Betel 3D dental cube loaded successfully") {

    $lastScript = $html.LastIndexOf("</script>")

    if ($lastScript -ge 0) {

        $html =
            $html.Substring(0, $lastScript) +
            $cubeJS +
            "`r`n" +
            $html.Substring($lastScript)

    }
}

# ============================================================
# SAVE
# ============================================================

Set-Content `
    -Path $File `
    -Value $html `
    -Encoding UTF8

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " HOLY BETEL 3D DENTAL CUBE INSTALLED" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup created:" -ForegroundColor Yellow
Write-Host $Backup
Write-Host ""
Write-Host "Website updated:" -ForegroundColor Yellow
Write-Host $File
Write-Host ""
Write-Host "Cube faces:" -ForegroundColor Cyan
Write-Host "  DENTAL CARE"
Write-Host "  SMILE"
Write-Host "  IMPLANTS"
Write-Host "  BRACES"
Write-Host "  WHITENING"
Write-Host "  HEALTHY TEETH"
Write-Host ""
Write-Host "Existing website content was preserved." -ForegroundColor Green
Write-Host ""
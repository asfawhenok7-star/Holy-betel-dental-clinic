$File = "C:\Users\HP\dental-clinic\frontend\index.html"

if (!(Test-Path $File)) {
    Write-Host "ERROR: index.html not found." -ForegroundColor Red
    exit
}

$Backup = "$File.before-cube-below"

Copy-Item $File $Backup -Force

$html = Get-Content $File -Raw -Encoding UTF8

$css = @'

/* ============================================================
   HOLY BETEL - 3D CUBE BELOW HERO CONTENT
============================================================ */

.hero-inner{
  display:flex !important;
  flex-direction:column !important;
  align-items:center !important;
  width:100% !important;
  max-width:1240px !important;
  margin:0 auto !important;
}

/* Existing hero text remains at the top */
.hero-content{
  width:100% !important;
  max-width:760px !important;
  margin:0 auto !important;
  text-align:left !important;
  position:relative !important;
  z-index:2 !important;
}

/* Cube gets its own space BELOW everything */
.dental-cube-wrap{
  position:relative !important;

  top:auto !important;
  right:auto !important;
  bottom:auto !important;
  left:auto !important;

  transform:none !important;

  width:100% !important;
  height:360px !important;

  margin:35px auto 0 !important;

  display:flex !important;
  align-items:center !important;
  justify-content:center !important;

  perspective:1400px !important;

  z-index:5 !important;
  pointer-events:none !important;
}

/* Large cube */
.dental-cube{
  position:relative !important;

  width:240px !important;
  height:240px !important;

  transform-style:preserve-3d !important;

  will-change:transform !important;
}

/* Cube faces */
.cube-face{
  width:240px !important;
  height:240px !important;

  display:flex !important;
  align-items:center !important;
  justify-content:center !important;

  box-sizing:border-box !important;
  padding:25px !important;

  font-size:20px !important;
  font-weight:900 !important;
  letter-spacing:1.2px !important;

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

/* 3D depth */
.cube-front{
  transform:translateZ(120px) !important;
}

.cube-back{
  transform:rotateY(180deg) translateZ(120px) !important;
}

.cube-right{
  transform:rotateY(90deg) translateZ(120px) !important;
}

.cube-left{
  transform:rotateY(-90deg) translateZ(120px) !important;
}

.cube-top{
  transform:rotateX(90deg) translateZ(120px) !important;
}

.cube-bottom{
  transform:rotateX(-90deg) translateZ(120px) !important;
}


/* ============================================================
   TABLET
============================================================ */

@media(max-width:900px){

  .hero-content{
    max-width:700px !important;
  }

  .dental-cube-wrap{
    height:320px !important;
    margin-top:25px !important;
  }

  .dental-cube{
    width:210px !important;
    height:210px !important;
  }

  .cube-face{
    width:210px !important;
    height:210px !important;
    font-size:17px !important;
  }

  .cube-front{
    transform:translateZ(105px) !important;
  }

  .cube-back{
    transform:rotateY(180deg) translateZ(105px) !important;
  }

  .cube-right{
    transform:rotateY(90deg) translateZ(105px) !important;
  }

  .cube-left{
    transform:rotateY(-90deg) translateZ(105px) !important;
  }

  .cube-top{
    transform:rotateX(90deg) translateZ(105px) !important;
  }

  .cube-bottom{
    transform:rotateX(-90deg) translateZ(105px) !important;
  }

}


/* ============================================================
   MOBILE
============================================================ */

@media(max-width:650px){

  .hero-inner{
    display:flex !important;
    flex-direction:column !important;
    align-items:center !important;
  }

  .hero-content{
    width:100% !important;
    max-width:100% !important;
    text-align:left !important;
  }

  .dental-cube-wrap{
    width:100% !important;
    height:250px !important;
    margin:20px auto 0 !important;
  }

  .dental-cube{
    width:150px !important;
    height:150px !important;
  }

  .cube-face{
    width:150px !important;
    height:150px !important;
    font-size:12px !important;
    padding:14px !important;
  }

  .cube-front{
    transform:translateZ(75px) !important;
  }

  .cube-back{
    transform:rotateY(180deg) translateZ(75px) !important;
  }

  .cube-right{
    transform:rotateY(90deg) translateZ(75px) !important;
  }

  .cube-left{
    transform:rotateY(-90deg) translateZ(75px) !important;
  }

  .cube-top{
    transform:rotateX(90deg) translateZ(75px) !important;
  }

  .cube-bottom{
    transform:rotateX(-90deg) translateZ(75px) !important;
  }

}

'@

$stylePos = $html.LastIndexOf("</style>")

if ($stylePos -lt 0) {
    Write-Host "ERROR: style section not found." -ForegroundColor Red
    Copy-Item $Backup $File -Force
    exit
}

$html =
    $html.Substring(0,$stylePos) +
    $css +
    "`r`n" +
    $html.Substring($stylePos)

Set-Content -Path $File -Value $html -Encoding UTF8

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " CUBE MOVED BELOW HERO CONTENT" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Hero text: TOP" -ForegroundColor Green
Write-Host "Buttons: BELOW TEXT" -ForegroundColor Green
Write-Host "3D cube: BELOW BUTTONS" -ForegroundColor Green
Write-Host "Cube is centered." -ForegroundColor Green
Write-Host ""
Write-Host "Backup:" -ForegroundColor Yellow
Write-Host $Backup
Write-Host ""
$File = "C:\Users\HP\dental-clinic\frontend\index.html"

if (!(Test-Path $File)) {
    Write-Host "ERROR: index.html not found." -ForegroundColor Red
    exit
}

$Backup = "$File.before-cube-position"

Copy-Item $File $Backup -Force

$html = Get-Content $File -Raw -Encoding UTF8

# ============================================================
# DESKTOP - LARGE CUBE ON RIGHT SIDE OF HERO
# ============================================================

$html = $html -replace `
'dental-cube-wrap\{[^}]*\}', `
'dental-cube-wrap{
  position:absolute;
  top:50%;
  right:2%;
  width:430px;
  height:430px;
  transform:translateY(-50%);
  display:flex;
  align-items:center;
  justify-content:center;
  perspective:1400px;
  z-index:5;
  pointer-events:none;
}'

$html = $html -replace `
'dental-cube\{[^}]*\}', `
'dental-cube{
  position:relative;
  width:250px;
  height:250px;
  transform-style:preserve-3d;
  transform:rotateX(-12deg) rotateY(0deg);
  will-change:transform;
}'

# ============================================================
# LARGE CUBE FACES
# ============================================================

$html = $html -replace `
'\.cube-face\{[^}]*\}', `
'.cube-face{
  position:absolute;
  width:250px;
  height:250px;

  display:flex;
  align-items:center;
  justify-content:center;

  box-sizing:border-box;
  padding:28px;

  text-align:center;

  font-size:21px;
  font-weight:900;
  letter-spacing:1.4px;

  color:var(--navy);

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.98),
      rgba(234,247,251,.95)
    );

  border:2px solid rgba(8,126,165,.28);

  box-shadow:
    inset 0 0 30px rgba(18,191,211,.08),
    0 18px 40px rgba(7,91,120,.15);

  backface-visibility:hidden;
  -webkit-backface-visibility:hidden;
}'

# ============================================================
# 3D DEPTH - 125PX
# ============================================================

$html = $html -replace 'translateZ\(85px\)', 'translateZ(125px)'
$html = $html -replace 'translateZ\(-85px\)', 'translateZ(-125px)'

# ============================================================
# TABLET
# ============================================================

$html = $html -replace `
'@media\(max-width:1100px\)\{[\s\S]*?\n\}', `
'@media(max-width:1100px){

  .dental-cube-wrap{
    right:1%;
    width:330px;
    height:330px;
  }

  .dental-cube{
    width:190px;
    height:190px;
  }

  .cube-face{
    width:190px;
    height:190px;
    font-size:16px;
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

}'

# ============================================================
# MOBILE - KEEP IT BELOW HERO TEXT
# ============================================================

$html = $html -replace `
'@media\(max-width:650px\)\{[\s\S]*?\n\}', `
'@media(max-width:650px){

  .dental-cube-wrap{
    position:relative;
    top:auto;
    right:auto;

    width:260px;
    height:260px;

    margin:35px auto 0;

    transform:none;
  }

  .dental-cube{
    width:155px;
    height:155px;
  }

  .cube-face{
    width:155px;
    height:155px;

    font-size:12px;
    letter-spacing:.8px;
    padding:14px;
  }

  .cube-front{
    transform:translateZ(77.5px);
  }

  .cube-back{
    transform:rotateY(180deg) translateZ(77.5px);
  }

  .cube-right{
    transform:rotateY(90deg) translateZ(77.5px);
  }

  .cube-left{
    transform:rotateY(-90deg) translateZ(77.5px);
  }

  .cube-top{
    transform:rotateX(90deg) translateZ(77.5px);
  }

  .cube-bottom{
    transform:rotateX(-90deg) translateZ(77.5px);
  }

  .dental-cube-shadow{
    width:175px;
    height:25px;
    bottom:28px;
  }

}'

Set-Content -Path $File -Value $html -Encoding UTF8

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " CUBE POSITION AND SIZE UPDATED" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Large desktop cube: RIGHT SIDE OF HERO" -ForegroundColor Green
Write-Host "Cube size: 250px" -ForegroundColor Green
Write-Host "Mobile layout preserved." -ForegroundColor Green
Write-Host ""
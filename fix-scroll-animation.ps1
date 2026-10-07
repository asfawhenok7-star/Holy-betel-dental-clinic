$ErrorActionPreference = "Stop"

$path = "C:\Users\HP\dental-clinic\frontend\index.html"
$backup = "C:\Users\HP\dental-clinic\frontend\index.html.before-scroll-fix-v2"

if (!(Test-Path $path)) {
    Write-Host "index.html not found." -ForegroundColor Red
    exit 1
}

$encoding = New-Object System.Text.UTF8Encoding($false)
$html = [System.IO.File]::ReadAllText($path, $encoding)

Copy-Item $path $backup -Force

# ============================================================
# FIND THE EXISTING SCROLL JAVASCRIPT BY FUNCTION NAME
# ============================================================

$functionMarker = "function initHolyBetelScroll"

$functionPos = $html.IndexOf($functionMarker)

if ($functionPos -lt 0) {
    Write-Host "Could not find initHolyBetelScroll." -ForegroundColor Red
    Write-Host "No changes were made to index.html." -ForegroundColor Yellow
    exit 1
}

# Find the opening IIFE comment before the function
$jsStart = $html.LastIndexOf(
    "/*",
    $functionPos
)

if ($jsStart -lt 0) {
    Write-Host "Could not locate scroll JavaScript beginning." -ForegroundColor Red
    exit 1
}

# ============================================================
# FIND THE 3D CUBE SCRIPT
# ============================================================

$cubeMarker = "const cube = document.getElementById"

$cubePos = $html.IndexOf(
    $cubeMarker,
    $functionPos
)

if ($cubePos -lt 0) {
    Write-Host "Could not find the 3D cube JavaScript." -ForegroundColor Red
    Write-Host "No changes were made to index.html." -ForegroundColor Yellow
    exit 1
}

# The cube comment is immediately before the cube code.
$jsEnd = $html.LastIndexOf(
    "/*",
    $cubePos
)

if ($jsEnd -le $jsStart) {
    Write-Host "Could not determine scroll JavaScript ending." -ForegroundColor Red
    exit 1
}

# ============================================================
# NEW SCROLL JAVASCRIPT
# ============================================================

$newJS = @'
/* =========================================================
   HOLY BETEL - PREMIUM SCROLL ANIMATION ENGINE
========================================================= */

(function(){

  "use strict";

  let idleTimer = null;


  function initHolyBetelScroll(){

    const elements =
      document.querySelectorAll(
        ".bs-scroll-left, " +
        ".bs-scroll-right, " +
        ".bs-scroll-reveal, " +
        ".bs-scroll-image, " +
        ".bs-stagger, " +
        ".auto-scroll"
      );


    console.log(
      "Holy Betel scroll elements:",
      elements.length
    );


    if(!elements.length){
      return;
    }


    /*
      -------------------------------------------------------
      SCROLL STOP DETECTION
      -------------------------------------------------------
    */

    window.addEventListener(
      "scroll",
      function(){

        document.body.classList.add(
          "hb-is-scrolling"
        );

        clearTimeout(idleTimer);

        idleTimer = setTimeout(
          function(){

            document.body.classList.remove(
              "hb-is-scrolling"
            );

            startIdleMotion();

          },
          350
        );

      },
      {
        passive:true
      }
    );


    /*
      -------------------------------------------------------
      INTERSECTION OBSERVER
      -------------------------------------------------------
    */

    function reveal(element){

      element.classList.add(
        "bs-scroll-visible"
      );

    }


    if("IntersectionObserver" in window){

      const observer =
        new IntersectionObserver(
          function(entries){

            entries.forEach(
              function(entry){

                if(
                  entry.isIntersecting
                ){

                  reveal(
                    entry.target
                  );

                  observer.unobserve(
                    entry.target
                  );

                }

              }
            );

          },
          {
            threshold:0.08,
            rootMargin:
              "0px 0px -50px 0px"
          }
        );


      elements.forEach(
        function(element){

          const rect =
            element.getBoundingClientRect();


          if(
            rect.top < window.innerHeight &&
            rect.bottom > 0
          ){

            reveal(element);

          }


          observer.observe(
            element
          );

        }
      );

    }

    else{

      elements.forEach(
        function(element){

          reveal(element);

        }
      );

    }


    /*
      -------------------------------------------------------
      START GENTLE MOTION
      -------------------------------------------------------
    */

    setTimeout(
      function(){

        startIdleMotion();

      },
      1200
    );

  }


  function startIdleMotion(){

    if(
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ){

      return;

    }


    document
      .querySelectorAll(
        ".bs-scroll-visible"
      )
      .forEach(
        function(element){

          if(
            element.classList.contains(
              "bs-stagger"
            )
          ){

            return;

          }


          element.classList.add(
            "hb-idle-motion"
          );

        }
      );

  }


  /*
    ---------------------------------------------------------
    START
    ---------------------------------------------------------
  */

  if(
    document.readyState === "loading"
  ){

    document.addEventListener(
      "DOMContentLoaded",
      initHolyBetelScroll
    );

  }
  else{

    initHolyBetelScroll();

  }

})();
'@


# ============================================================
# REPLACE ONLY THE OLD SCROLL JAVASCRIPT
# ============================================================

$html =
    $html.Substring(0, $jsStart) +
    $newJS +
    $html.Substring($jsEnd)


# ============================================================
# ADD NEW ANIMATION CSS BEFORE ACCESSIBILITY
# ============================================================

$accessibilityPos =
    $html.IndexOf(
        "ACCESSIBILITY"
    )

if($accessibilityPos -lt 0){

    Write-Host "Could not find ACCESSIBILITY CSS section." -ForegroundColor Red
    exit 1

}

$cssInsert =
    $html.LastIndexOf(
        "/*",
        $accessibilityPos
    )


$newCSS = @'
/* =========================================================
   HOLY BETEL - ENHANCED SCROLL MOTION
========================================================= */

.bs-scroll-left{
  transform:translateX(-110px);
}

.bs-scroll-right{
  transform:translateX(110px);
}

.bs-scroll-reveal{
  transform:translateY(65px);
}

.bs-scroll-image{
  transform:translateX(110px) scale(.96);
}

.bs-scroll-visible{
  opacity:1 !important;
  transform:translate3d(0,0,0) scale(1) !important;
}


/* =========================================================
   ALTERNATING CARD MOTION
========================================================= */

.bs-stagger > *{
  opacity:0;
  transform:translateY(55px);
  transition:
    opacity .7s ease,
    transform .75s cubic-bezier(.22,1,.36,1);
}

.bs-stagger.bs-scroll-visible > *{
  opacity:1;
  transform:translateY(0);
}

.bs-stagger.bs-scroll-visible > *:nth-child(1){
  transition-delay:.05s;
}

.bs-stagger.bs-scroll-visible > *:nth-child(2){
  transition-delay:.12s;
}

.bs-stagger.bs-scroll-visible > *:nth-child(3){
  transition-delay:.19s;
}

.bs-stagger.bs-scroll-visible > *:nth-child(4){
  transition-delay:.26s;
}

.bs-stagger.bs-scroll-visible > *:nth-child(5){
  transition-delay:.33s;
}

.bs-stagger.bs-scroll-visible > *:nth-child(6){
  transition-delay:.40s;
}


/* =========================================================
   GENTLE LEFT / RIGHT MOTION
========================================================= */

.hb-idle-motion{

  animation:
    holyBetelGentleSide
    6s
    ease-in-out
    infinite
    alternate;

}

@keyframes holyBetelGentleSide{

  0%{
    transform:translateX(-3px);
  }

  50%{
    transform:translateX(0);
  }

  100%{
    transform:translateX(3px);
  }

}


/* Pause gentle movement while actively scrolling */

body.hb-is-scrolling
.hb-idle-motion{

  animation-play-state:paused;

}


/* =========================================================
   MOBILE
========================================================= */

@media(max-width:650px){

  .bs-scroll-left{
    transform:translateX(-55px);
  }

  .bs-scroll-right{
    transform:translateX(55px);
  }

  .bs-scroll-reveal{
    transform:translateY(35px);
  }

  .bs-scroll-image{
    transform:translateX(55px) scale(.98);
  }

  .hb-idle-motion{
    animation-duration:7s;
  }

}

'@


$html =
    $html.Substring(0,$cssInsert) +
    $newCSS +
    $html.Substring($cssInsert)


# ============================================================
# SAVE
# ============================================================

[System.IO.File]::WriteAllText(
    $path,
    $html,
    $encoding
)


Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " HOLY BETEL SCROLL FIX INSTALLED" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Scroll JavaScript replaced successfully." -ForegroundColor Green
Write-Host "Enhanced scroll CSS added successfully." -ForegroundColor Green
Write-Host "3D cube JavaScript preserved." -ForegroundColor Green
Write-Host "Existing website content preserved." -ForegroundColor Green
Write-Host ""
Write-Host "Backup:" -ForegroundColor Yellow
Write-Host $backup -ForegroundColor Yellow
Write-Host ""
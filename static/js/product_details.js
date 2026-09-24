/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS + VIRTUAL TRY-ON
   ========================================================= */

import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304";


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {


  /* =======================================================
     ELEMENTS
     ======================================================= */

  const tryOnBtn =
    document.getElementById("tryOnBtn");

  const tryOnModal =
    document.getElementById("tryOnModal");

  const tryOnClose =
    document.getElementById("tryOnClose");

  const startCameraBtn =
    document.getElementById("startCameraBtn");

  const uploadImageBtn =
    document.getElementById("uploadImageBtn");

  const imageInput =
    document.getElementById("tryOnImageInput");

  const switchCameraBtn =
    document.getElementById("switchCameraBtn");

  const stopCameraBtn =
    document.getElementById("stopCameraBtn");

  const video =
    document.getElementById("tryOnVideo");

  const uploadedImage =
    document.getElementById("tryOnImage");

  const canvas =
    document.getElementById("tryOnCanvas");

  const placeholder =
    document.getElementById("tryOnPlaceholder");

  const status =
    document.getElementById("tryOnStatus");

  const statusText =
    document.getElementById("tryOnStatusText");

  const errorBox =
    document.getElementById("tryOnError");

  const loginToCartBtn =
    document.getElementById("loginToCartBtn");



  /* =======================================================
     PRODUCT INFORMATION
     ======================================================= */

  const product =
    window.GLAMORA_TRYON_PRODUCT || {};



  /* =======================================================
     CANVAS
     ======================================================= */

  const ctx =
    canvas.getContext("2d");



  /* =======================================================
     CAMERA VARIABLES
     ======================================================= */

  let cameraStream = null;

  let currentCamera = "user";

  let animationFrameId = null;

  let faceLandmarker = null;

  let modelLoadingPromise = null;

  let isDetecting = false;

  let lastVideoTime = -1;

  let currentMode = null;



  /* =======================================================
     MEDIAPIPE CONFIGURATION
     ======================================================= */

  const WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";


  const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";



  /* =======================================================
     LIP LANDMARKS
     ======================================================= */

  /*
   * MediaPipe Face Landmarker lip landmarks.
   */

  const OUTER_LIPS = [

    61,
    146,
    91,
    181,
    84,
    17,
    314,
    405,
    321,
    375,
    291,
    409,
    270,
    269,
    267,
    0,
    37,
    39,
    40,
    185

  ];


  const INNER_LIPS = [

    78,
    95,
    88,
    178,
    87,
    14,
    317,
    402,
    318,
    324,
    308,
    415,
    310,
    311,
    312,
    13,
    82,
    81,
    80,
    191

  ];



  /* =======================================================
     EYE LANDMARKS
     ======================================================= */

  const LEFT_EYE = [

    33,
    7,
    163,
    144,
    145,
    153,
    154,
    155,
    133

  ];


  const RIGHT_EYE = [

    362,
    382,
    381,
    380,
    374,
    373,
    390,
    249,
    263

  ];



  /* =======================================================
     OPEN TRY-ON
     ======================================================= */

  async function openTryOn() {

    if (!tryOnModal) {
      return;
    }


    tryOnModal.classList.add("active");

    tryOnModal.setAttribute(
      "aria-hidden",
      "false"
    );


    document.body.style.overflow = "hidden";


    resetTryOnView();

    clearTryOnError();


    status.classList.add("active");

    statusText.textContent =
      "Starting camera...";


    /*
     * Automatically start the camera.
     *
     * This is the main change from
     * your previous version.
     */

    await startCamera();

  }



  /* =======================================================
     CLOSE TRY-ON
     ======================================================= */

  function closeTryOn() {

    stopCamera();

    clearCanvas();

    resetTryOnView();


    if (tryOnModal) {

      tryOnModal.classList.remove("active");

      tryOnModal.setAttribute(
        "aria-hidden",
        "true"
      );

    }


    document.body.style.overflow = "";

    clearTryOnError();

  }



  /* =======================================================
     RESET VIEW
     ======================================================= */

  function resetTryOnView() {

    stopDetectionLoop();

    clearCanvas();


    video.classList.remove("active");

    video.classList.remove("mirrored");


    uploadedImage.classList.remove("active");

    uploadedImage.removeAttribute("src");


    canvas.classList.remove("active");

    canvas.classList.remove("mirrored");


    placeholder.style.display = "flex";


    status.classList.remove("active");


    stopCameraBtn.hidden = true;

    switchCameraBtn.hidden = true;


    currentMode = null;

  }



  /* =======================================================
     ERROR
     ======================================================= */

  function clearTryOnError() {

    errorBox.textContent = "";

    errorBox.classList.remove("active");

  }


  function showTryOnError(message) {

    errorBox.textContent = message;

    errorBox.classList.add("active");

  }



  /* =======================================================
     LOAD FACE LANDMARKER
     ======================================================= */

  async function loadFaceLandmarker() {

    if (faceLandmarker) {
      return faceLandmarker;
    }


    if (modelLoadingPromise) {
      return modelLoadingPromise;
    }


    modelLoadingPromise =
      (async function () {

        try {

          status.classList.add("active");

          statusText.textContent =
            "Loading AR face tracking...";


          const vision =
            await FilesetResolver.forVisionTasks(
              WASM_URL
            );


          /*
           * Try GPU first.
           */

          try {

            faceLandmarker =
              await FaceLandmarker.createFromOptions(
                vision,
                {

                  baseOptions: {

                    modelAssetPath:
                      MODEL_URL,

                    delegate:
                      "GPU"

                  },

                  runningMode:
                    "VIDEO",

                  numFaces:
                    1,

                  minFaceDetectionConfidence:
                    0.5,

                  minFacePresenceConfidence:
                    0.5,

                  minTrackingConfidence:
                    0.5

                }
              );

          } catch (gpuError) {

            console.warn(
              "GPU face tracker failed. Trying CPU.",
              gpuError
            );


            /*
             * CPU fallback.
             */

            faceLandmarker =
              await FaceLandmarker.createFromOptions(
                vision,
                {

                  baseOptions: {

                    modelAssetPath:
                      MODEL_URL,

                    delegate:
                      "CPU"

                  },

                  runningMode:
                    "VIDEO",

                  numFaces:
                    1,

                  minFaceDetectionConfidence:
                    0.5,

                  minFacePresenceConfidence:
                    0.5,

                  minTrackingConfidence:
                    0.5

                }
              );

          }


          statusText.textContent =
            "Face tracking ready";


          return faceLandmarker;

        } catch (error) {

          console.error(
            "Face Landmarker error:",
            error
          );


          faceLandmarker = null;

          modelLoadingPromise = null;


          throw error;

        }

      })();


    return modelLoadingPromise;

  }



  /* =======================================================
     START CAMERA
     ======================================================= */

  async function startCamera() {

    clearTryOnError();


    /*
     * Browser camera support.
     */

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {

      showTryOnError(
        "Your browser does not support camera access. Please use a modern browser or upload an image instead."
      );

      return;

    }


    /*
     * Stop previous camera.
     */

    stopCamera();


    try {

      status.classList.add("active");

      statusText.textContent =
        "Requesting camera...";


      /*
       * Load AR model while requesting camera.
       */

      const modelPromise =
        loadFaceLandmarker();


      const constraints = {

        video: {

          facingMode: {

            ideal:
              currentCamera

          },

          width: {

            ideal:
              1280

          },

          height: {

            ideal:
              720

          }

        },

        audio: false

      };


      cameraStream =
        await navigator.mediaDevices.getUserMedia(
          constraints
        );


      /*
       * Attach camera.
       */

      video.srcObject =
        cameraStream;


      video.classList.add("active");


      uploadedImage.classList.remove(
        "active"
      );


      placeholder.style.display =
        "none";


      canvas.classList.add("active");


      currentMode =
        "camera";


      /*
       * Mirror front camera.
       */

      if (currentCamera === "user") {

        video.classList.add("mirrored");

        canvas.classList.add("mirrored");

      } else {

        video.classList.remove("mirrored");

        canvas.classList.remove("mirrored");

      }


      /*
       * Wait for video metadata.
       */

      await waitForVideo();


      /*
       * Start video.
       */

      try {

        await video.play();

      } catch (playError) {

        console.warn(
          "Video play warning:",
          playError
        );

      }


      /*
       * Wait for AR model.
       */

      try {

        await modelPromise;

      } catch (modelError) {

        console.error(
          "AR model failed:",
          modelError
        );


        showTryOnError(
          "The AR face-tracking model could not be loaded. Check your internet connection and reload the page."
        );


        statusText.textContent =
          "Camera active";

        return;

      }


      status.classList.add("active");

      statusText.textContent =
        "Looking for your face...";


      stopDetectionLoop();

      startDetectionLoop();


      stopCameraBtn.hidden = false;

      switchCameraBtn.hidden = false;


    } catch (error) {

      console.error(
        "Camera error:",
        error
      );


      let message =
        "Unable to access your camera.";


      if (
        error.name ===
        "NotAllowedError"
      ) {

        message =
          "Camera permission was denied. Please allow camera access in your browser settings, then try again.";

      } else if (
        error.name ===
        "NotFoundError"
      ) {

        message =
          "No camera was found on this device. You can upload an image instead.";

      } else if (
        error.name ===
        "NotReadableError"
      ) {

        message =
          "Your camera is already being used by another application. Close it and try again.";

      } else if (
        error.name ===
        "SecurityError"
      ) {

        message =
          "Camera access was blocked for security reasons. Use localhost or HTTPS.";

      }


      showTryOnError(message);


      status.classList.remove("active");

      stopCameraBtn.hidden = true;

      switchCameraBtn.hidden = true;

    }

  }



  /* =======================================================
     WAIT FOR VIDEO
     ======================================================= */

  function waitForVideo() {

    return new Promise(function (resolve) {

      if (
        video.readyState >= 2 &&
        video.videoWidth > 0
      ) {

        resolve();

        return;

      }


      function checkVideo() {

        if (
          video.readyState >= 2 &&
          video.videoWidth > 0
        ) {

          resolve();

        } else {

          requestAnimationFrame(
            checkVideo
          );

        }

      }


      checkVideo();

    });

  }



  /* =======================================================
     STOP CAMERA
     ======================================================= */

  function stopCamera() {

    stopDetectionLoop();


    if (cameraStream) {

      cameraStream
        .getTracks()
        .forEach(function (track) {

          track.stop();

        });


      cameraStream = null;

    }


    video.pause();

    video.srcObject = null;


    video.classList.remove("active");

    video.classList.remove("mirrored");


    canvas.classList.remove("active");

    canvas.classList.remove("mirrored");


    status.classList.remove("active");


    stopCameraBtn.hidden = true;

    switchCameraBtn.hidden = true;


    currentMode = null;

    lastVideoTime = -1;

  }



  /* =======================================================
     DETECTION LOOP
     ======================================================= */

  function startDetectionLoop() {

    if (isDetecting) {
      return;
    }


    isDetecting = true;


    async function detectFrame() {

      if (!isDetecting) {
        return;
      }


      if (
        currentMode !== "camera" ||
        !cameraStream ||
        !faceLandmarker
      ) {

        animationFrameId =
          requestAnimationFrame(
            detectFrame
          );

        return;

      }


      if (
        video.readyState >= 2 &&
        video.videoWidth > 0
      ) {

        /*
         * Resize canvas to exact video dimensions.
         */

        if (
          canvas.width !== video.videoWidth ||
          canvas.height !== video.videoHeight
        ) {

          canvas.width =
            video.videoWidth;

          canvas.height =
            video.videoHeight;

        }


        /*
         * Detect only when video frame changes.
         */

        if (
          video.currentTime !==
          lastVideoTime
        ) {

          lastVideoTime =
            video.currentTime;


          try {

            const results =
              faceLandmarker.detectForVideo(
                video,
                performance.now()
              );


            drawTryOn(
              results.faceLandmarks
                ? results.faceLandmarks[0]
                : null
            );

          } catch (error) {

            console.error(
              "Face detection error:",
              error
            );

          }

        }

      }


      animationFrameId =
        requestAnimationFrame(
          detectFrame
        );

    }


    detectFrame();

  }



  /* =======================================================
     STOP DETECTION LOOP
     ======================================================= */

  function stopDetectionLoop() {

    isDetecting = false;


    if (animationFrameId !== null) {

      cancelAnimationFrame(
        animationFrameId
      );

      animationFrameId = null;

    }


    lastVideoTime = -1;

  }



  /* =======================================================
     DRAW TRY-ON
     ======================================================= */

  function drawTryOn(landmarks) {

    clearCanvas();


    if (!landmarks) {

      status.classList.add("active");

      statusText.textContent =
        "Move your face into the frame";

      return;

    }


    status.classList.add("active");


    const productType =
      normalizeProductType(
        product.type
      );


    /*
     * Product-specific virtual makeup.
     */

    if (productType === "lipstick") {

      drawLipstick(
        landmarks
      );


      statusText.textContent =
        "Face detected • Lipstick applied";


    } else if (productType === "blush") {

      drawBlush(
        landmarks
      );


      statusText.textContent =
        "Face detected • Blush applied";


    } else if (productType === "eyeshadow") {

      drawEyeshadow(
        landmarks
      );


      statusText.textContent =
        "Face detected • Eyeshadow applied";


    } else if (productType === "eyeliner") {

      drawEyeliner(
        landmarks
      );


      statusText.textContent =
        "Face detected • Eyeliner applied";


    } else {

      statusText.textContent =
        "Face detected • Try-on for this product is being prepared";

    }

  }



  /* =======================================================
     NORMALIZE PRODUCT TYPE
     ======================================================= */

  function normalizeProductType(value) {

    const text =
      String(value || "")
        .toLowerCase()
        .trim();


    if (
      text.includes("lip")
    ) {

      return "lipstick";

    }


    if (
      text.includes("shadow") ||
      (
        text.includes("eye") &&
        text.includes("makeup")
      )
    ) {

      return "eyeshadow";

    }


    if (
      text.includes("blush")
    ) {

      return "blush";

    }


    if (
      text.includes("liner")
    ) {

      return "eyeliner";

    }


    if (
      text.includes("mascara")
    ) {

      return "mascara";

    }


    if (
      text.includes("foundation")
    ) {

      return "foundation";

    }


    if (
      text.includes("highlighter") ||
      text.includes("highlight")
    ) {

      return "highlighter";

    }


    return text;

  }



  /* =======================================================
     GET PRODUCT COLOR
     ======================================================= */

  function getProductColor() {

    const explicitColor =
      String(product.color || "")
        .trim();


    /*
     * If database color is already a hex
     * color, use it directly.
     */

    if (
      /^#[0-9a-f]{6}$/i.test(
        explicitColor
      )
    ) {

      return explicitColor;

    }


    const text = [

      product.name || "",

      product.shade || "",

      product.color || ""

    ]
      .join(" ")
      .toLowerCase();


    /*
     * Shade/color matching.
     */

    if (
      text.includes("burgundy")
    ) {

      return "#741f3b";

    }


    if (
      text.includes("wine")
    ) {

      return "#72243d";

    }


    if (
      text.includes("berry")
    ) {

      return "#8f294b";

    }


    if (
      text.includes("plum")
    ) {

      return "#6b294f";

    }


    if (
      text.includes("mauve")
    ) {

      return "#a84f6e";

    }


    if (
      text.includes("coral")
    ) {

      return "#e67b66";

    }


    if (
      text.includes("orange")
    ) {

      return "#e46d39";

    }


    if (
      text.includes("brown")
    ) {

      return "#7a4b3a";

    }


    if (
      text.includes("nude")
    ) {

      return "#b96f68";

    }


    if (
      text.includes("rose")
    ) {

      return "#c95b77";

    }


    if (
      text.includes("pink")
    ) {

      return "#d96b8a";

    }


    if (
      text.includes("red")
    ) {

      return "#c6284f";

    }


    if (
      text.includes("black")
    ) {

      return "#24181d";

    }


    /*
     * Default Glamora lipstick shade.
     */

    return "#c85f7a";

  }



  /* =======================================================
     DRAW LIPSTICK
     ======================================================= */

  function drawLipstick(landmarks) {

    if (!landmarks) {
      return;
    }


    const outerPoints =
      getLandmarkPoints(
        landmarks,
        OUTER_LIPS
      );


    const innerPoints =
      getLandmarkPoints(
        landmarks,
        INNER_LIPS
      );


    if (
      outerPoints.length < 5 ||
      innerPoints.length < 5
    ) {

      return;

    }


    const color =
      getProductColor();


    /*
     * Calculate lip center.
     */

    const center =
      getAveragePoint(
        outerPoints
      );


    /*
     * Lipstick gradient.
     */

    const gradient =
      ctx.createLinearGradient(
        center.x,
        center.y - 40,
        center.x,
        center.y + 40
      );


    gradient.addColorStop(
      0,
      hexToRgba(color, 0.72)
    );


    gradient.addColorStop(
      0.5,
      hexToRgba(color, 0.58)
    );


    gradient.addColorStop(
      1,
      hexToRgba(color, 0.72)
    );


    /*
     * Draw outer lips.
     */

    ctx.save();


    ctx.beginPath();

    drawSmoothClosedPath(
      ctx,
      outerPoints
    );

    ctx.closePath();


    ctx.fillStyle =
      gradient;

    ctx.fill();


    /*
     * Remove inner mouth area.
     */

    ctx.globalCompositeOperation =
      "destination-out";


    ctx.beginPath();

    drawSmoothClosedPath(
      ctx,
      innerPoints
    );

    ctx.closePath();

    ctx.fill();


    /*
     * Restore normal drawing.
     */

    ctx.globalCompositeOperation =
      "source-over";


    /*
     * Add a subtle lip shine.
     */

    const lipWidth =
      distanceBetweenPoints(
        outerPoints[0],
        outerPoints[Math.floor(
          outerPoints.length / 2
        )]
      );


    ctx.globalAlpha = 0.20;

    ctx.fillStyle = "#ffffff";


    ctx.beginPath();


    ctx.ellipse(
      center.x,
      center.y - 7,
      Math.max(5, lipWidth * 0.12),
      Math.max(2, lipWidth * 0.035),
      0,
      0,
      Math.PI * 2
    );


    ctx.fill();


    ctx.restore();

  }



  /* =======================================================
     DRAW BLUSH
     ======================================================= */

  function drawBlush(landmarks) {

    const leftCheek =
      getPoint(
        landmarks,
        50
      );


    const rightCheek =
      getPoint(
        landmarks,
        280
      );


    if (
      !leftCheek ||
      !rightCheek
    ) {

      return;

    }


    const color =
      getProductColor();


    drawSoftCircle(
      leftCheek.x,
      leftCheek.y + 8,
      55,
      color,
      0.22
    );


    drawSoftCircle(
      rightCheek.x,
      rightCheek.y + 8,
      55,
      color,
      0.22
    );

  }



  /* =======================================================
     DRAW EYESHADOW
     ======================================================= */

  function drawEyeshadow(landmarks) {

    const color =
      getProductColor();


    const leftEye =
      getLandmarkPoints(
        landmarks,
        LEFT_EYE
      );


    const rightEye =
      getLandmarkPoints(
        landmarks,
        RIGHT_EYE
      );


    if (
      leftEye.length < 5 ||
      rightEye.length < 5
    ) {

      return;

    }


    drawEyeMakeup(
      leftEye,
      color
    );


    drawEyeMakeup(
      rightEye,
      color
    );

  }



  /* =======================================================
     EYE MAKEUP
     ======================================================= */

  function drawEyeMakeup(
    points,
    color
  ) {

    const center =
      getAveragePoint(
        points
      );


    const gradient =
      ctx.createRadialGradient(
        center.x,
        center.y,
        2,
        center.x,
        center.y,
        45
      );


    gradient.addColorStop(
      0,
      hexToRgba(color, 0.38)
    );


    gradient.addColorStop(
      1,
      hexToRgba(color, 0)
    );


    ctx.save();


    ctx.beginPath();

    drawSmoothClosedPath(
      ctx,
      points
    );

    ctx.closePath();


    ctx.fillStyle =
      gradient;

    ctx.fill();


    ctx.restore();

  }



  /* =======================================================
     DRAW EYELINER
     ======================================================= */

  function drawEyeliner(landmarks) {

    const color =
      getProductColor();


    drawEyeLine(
      landmarks,
      [
        33,
        133
      ],
      color
    );


    drawEyeLine(
      landmarks,
      [
        362,
        263
      ],
      color
    );

  }



  /* =======================================================
     EYE LINE
     ======================================================= */

  function drawEyeLine(
    landmarks,
    indexes,
    color
  ) {

    const start =
      getPoint(
        landmarks,
        indexes[0]
      );


    const end =
      getPoint(
        landmarks,
        indexes[1]
      );


    if (!start || !end) {
      return;
    }


    ctx.save();


    ctx.strokeStyle =
      color;


    ctx.lineWidth =
      Math.max(
        2,
        canvas.width * 0.003
      );


    ctx.lineCap =
      "round";


    ctx.beginPath();

    ctx.moveTo(
      start.x,
      start.y
    );

    ctx.lineTo(
      end.x,
      end.y
    );

    ctx.stroke();


    ctx.restore();

  }



  /* =======================================================
     LANDMARK → PIXEL
     ======================================================= */

  function getPoint(
    landmarks,
    index
  ) {

    if (
      !landmarks ||
      !landmarks[index]
    ) {

      return null;

    }


    return {

      x:
        landmarks[index].x *
        canvas.width,

      y:
        landmarks[index].y *
        canvas.height

    };

  }



  /* =======================================================
     MULTIPLE LANDMARKS
     ======================================================= */

  function getLandmarkPoints(
    landmarks,
    indexes
  ) {

    const points = [];


    indexes.forEach(
      function (index) {

        const point =
          getPoint(
            landmarks,
            index
          );


        if (point) {

          points.push(point);

        }

      }
    );


    return points;

  }



  /* =======================================================
     AVERAGE POINT
     ======================================================= */

  function getAveragePoint(
    points
  ) {

    if (
      !points ||
      points.length === 0
    ) {

      return {
        x: 0,
        y: 0
      };

    }


    let x = 0;

    let y = 0;


    points.forEach(
      function (point) {

        x += point.x;

        y += point.y;

      }
    );


    return {

      x:
        x / points.length,

      y:
        y / points.length

    };

  }



  /* =======================================================
     SMOOTH CLOSED PATH
     ======================================================= */

  function drawSmoothClosedPath(
    context,
    points
  ) {

    if (
      !points ||
      points.length < 2
    ) {

      return;

    }


    context.moveTo(
      points[0].x,
      points[0].y
    );


    for (
      let i = 0;
      i < points.length;
      i++
    ) {

      const current =
        points[i];

      const next =
        points[
          (i + 1) %
          points.length
        ];


      const midpointX =
        (current.x + next.x) / 2;


      const midpointY =
        (current.y + next.y) / 2;


      context.quadraticCurveTo(
        current.x,
        current.y,
        midpointX,
        midpointY
      );

    }

  }



  /* =======================================================
     SOFT CIRCLE
     ======================================================= */

  function drawSoftCircle(
    x,
    y,
    radius,
    color,
    alpha
  ) {

    const gradient =
      ctx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        radius
      );


    gradient.addColorStop(
      0,
      hexToRgba(
        color,
        alpha
      )
    );


    gradient.addColorStop(
      0.55,
      hexToRgba(
        color,
        alpha * 0.45
      )
    );


    gradient.addColorStop(
      1,
      hexToRgba(
        color,
        0
      )
    );


    ctx.save();


    ctx.fillStyle =
      gradient;


    ctx.beginPath();

    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    ctx.fill();


    ctx.restore();

  }



  /* =======================================================
     HEX → RGBA
     ======================================================= */

  function hexToRgba(
    hex,
    alpha
  ) {

    let clean =
      String(hex || "")
        .replace("#", "");


    if (
      clean.length === 3
    ) {

      clean =
        clean
          .split("")
          .map(
            function (char) {

              return char + char;

            }
          )
          .join("");

    }


    const number =
      parseInt(
        clean,
        16
      );


    const red =
      (number >> 16) & 255;


    const green =
      (number >> 8) & 255;


    const blue =
      number & 255;


    return (
      "rgba(" +
      red +
      "," +
      green +
      "," +
      blue +
      "," +
      alpha +
      ")"
    );

  }



  /* =======================================================
     DISTANCE BETWEEN POINTS
     ======================================================= */

  function distanceBetweenPoints(
    a,
    b
  ) {

    if (!a || !b) {
      return 0;
    }


    return Math.sqrt(

      Math.pow(
        a.x - b.x,
        2
      )

      +

      Math.pow(
        a.y - b.y,
        2
      )

    );

  }



  /* =======================================================
     CLEAR CANVAS
     ======================================================= */

  function clearCanvas() {

    if (!ctx) {
      return;
    }


    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

  }



  /* =======================================================
     UPLOAD IMAGE
     ======================================================= */

  function openImagePicker() {

    clearTryOnError();

    imageInput.click();

  }



  /* =======================================================
     HANDLE IMAGE UPLOAD
     ======================================================= */

  async function handleImageUpload(
    event
  ) {

    clearTryOnError();


    const file =
      event.target.files &&
      event.target.files[0];


    if (!file) {
      return;
    }


    if (
      !file.type.startsWith("image/")
    ) {

      showTryOnError(
        "Please select a valid image file."
      );


      imageInput.value = "";

      return;

    }


    const maxSize =
      10 * 1024 * 1024;


    if (
      file.size > maxSize
    ) {

      showTryOnError(
        "Please choose an image smaller than 10 MB."
      );


      imageInput.value = "";

      return;

    }


    /*
     * Stop camera.
     */

    stopCamera();


    /*
     * Load AR model.
     */

    try {

      status.classList.add("active");

      statusText.textContent =
        "Loading AR face tracking...";


      await loadFaceLandmarker();

    } catch (error) {

      console.error(
        error
      );


      showTryOnError(
        "Unable to load the face-tracking model. Check your internet connection."
      );


      return;

    }


    const reader =
      new FileReader();


    reader.onload =
      function (e) {

        uploadedImage.onload =
          function () {

            /*
             * Use natural image size
             * for exact landmark alignment.
             */

            canvas.width =
              uploadedImage.naturalWidth;

            canvas.height =
              uploadedImage.naturalHeight;


            uploadedImage.classList.add(
              "active"
            );


            canvas.classList.add(
              "active"
            );


            video.classList.remove(
              "active"
            );


            canvas.classList.remove(
              "mirrored"
            );


            placeholder.style.display =
              "none";


            currentMode =
              "image";


            status.classList.add(
              "active"
            );


            statusText.textContent =
              "Detecting face...";


            detectUploadedImage();

          };


        uploadedImage.src =
          e.target.result;

      };


    reader.onerror =
      function () {

        showTryOnError(
          "Unable to read this image. Please choose another image."
        );

      };


    reader.readAsDataURL(
      file
    );

  }



  /* =======================================================
     DETECT UPLOADED IMAGE
     ======================================================= */

  function detectUploadedImage() {

    if (
      !faceLandmarker ||
      !uploadedImage.complete ||
      uploadedImage.naturalWidth === 0
    ) {

      return;

    }


    try {

      const results =
        faceLandmarker.detect(
          uploadedImage
        );


      const landmarks =
        results.faceLandmarks
          ? results.faceLandmarks[0]
          : null;


      drawTryOn(
        landmarks
      );

    } catch (error) {

      console.error(
        "Uploaded image detection error:",
        error
      );


      showTryOnError(
        "Unable to detect a face in this image."
      );

    }

  }



  /* =======================================================
     SWITCH CAMERA
     ======================================================= */

  async function switchCamera() {

    if (!cameraStream) {
      return;
    }


    if (
      currentCamera === "user"
    ) {

      currentCamera =
        "environment";

    } else {

      currentCamera =
        "user";

    }


    await startCamera();

  }



  /* =======================================================
     LOGIN TO CART
     ======================================================= */

  if (loginToCartBtn) {

    loginToCartBtn.addEventListener(
      "click",
      function () {

        const loginUrl =
          "/login?next=" +
          encodeURIComponent(
            window.location.pathname
          );


        /*
         * If your existing main.js provides
         * showLoginPopup(), use it.
         */

        if (
          typeof window.showLoginPopup ===
          "function"
        ) {

          window.showLoginPopup();

        } else {

          window.location.href =
            loginUrl;

        }

      }
    );

  }



  /* =======================================================
     BUTTON EVENTS
     ======================================================= */

  if (tryOnBtn) {

    tryOnBtn.addEventListener(
      "click",
      openTryOn
    );

  }


  if (tryOnClose) {

    tryOnClose.addEventListener(
      "click",
      closeTryOn
    );

  }


  if (startCameraBtn) {

    startCameraBtn.addEventListener(
      "click",
      startCamera
    );

  }


  if (uploadImageBtn) {

    uploadImageBtn.addEventListener(
      "click",
      openImagePicker
    );

  }


  if (imageInput) {

    imageInput.addEventListener(
      "change",
      handleImageUpload
    );

  }


  if (switchCameraBtn) {

    switchCameraBtn.addEventListener(
      "click",
      switchCamera
    );

  }


  if (stopCameraBtn) {

    stopCameraBtn.addEventListener(
      "click",
      stopCamera
    );

  }



  /* =======================================================
     CLICK OUTSIDE MODAL
     ======================================================= */

  if (tryOnModal) {

    tryOnModal.addEventListener(
      "click",
      function (event) {

        if (
          event.target === tryOnModal
        ) {

          closeTryOn();

        }

      }
    );

  }



  /* =======================================================
     ESCAPE KEY
     ======================================================= */

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape" &&
        tryOnModal &&
        tryOnModal.classList.contains(
          "active"
        )
      ) {

        closeTryOn();

      }

    }
  );



  /* =======================================================
     CLEAN CAMERA WHEN LEAVING PAGE
     ======================================================= */

  window.addEventListener(
    "beforeunload",
    function () {

      stopCamera();


      if (
        faceLandmarker &&
        typeof faceLandmarker.close ===
        "function"
      ) {

        faceLandmarker.close();

      }

    }
  );

});
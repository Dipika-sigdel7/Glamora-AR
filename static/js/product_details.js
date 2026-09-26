/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS - VIRTUAL TRY ON

   CAMERA
   LOCAL MEDIAPIPE
   LOCAL WASM
   LOCAL FACE LANDMARK MODEL

   IMPORTANT:
   CAMERA IS NOT MIRRORED / INVERTED
   ========================================================= */

(() => {

    "use strict";

    console.log("========================================");
    console.log("GLAMORA AR - PRODUCT DETAILS JS");
    console.log("========================================");


    /* =====================================================
       DOM ELEMENTS
       ===================================================== */

    const tryOnBtn = document.getElementById("tryOnBtn");
    const tryOnModal = document.getElementById("tryOnModal");
    const tryOnClose = document.getElementById("tryOnClose");

    const tryOnVideo = document.getElementById("tryOnVideo");
    const tryOnCanvas = document.getElementById("tryOnCanvas");

    const tryOnImage = document.getElementById("tryOnImage");
    const tryOnPlaceholder = document.getElementById("tryOnPlaceholder");

    const tryOnStatus = document.getElementById("tryOnStatus");
    const tryOnStatusText = document.getElementById("tryOnStatusText");

    const tryOnError = document.getElementById("tryOnError");

    const startCameraBtn = document.getElementById("startCameraBtn");
    const uploadImageBtn = document.getElementById("uploadImageBtn");
    const tryOnImageInput = document.getElementById("tryOnImageInput");

    const switchCameraBtn = document.getElementById("switchCameraBtn");
    const stopCameraBtn = document.getElementById("stopCameraBtn");


    /* =====================================================
       CHECK DOM
       ===================================================== */

    if (!tryOnBtn || !tryOnModal) {

        console.error(
            "Glamora AR: Try-On button or modal not found."
        );

        return;
    }


    /* =====================================================
       PRODUCT INFORMATION
       ===================================================== */

    const body = document.body;

    const productId =
        body.dataset.productId || "";

    const productName =
        body.dataset.productName || "Beauty Product";

    const productType =
        body.dataset.productType || "";

    const productShade =
        body.dataset.productShade || "";

    const productColor =
        body.dataset.productColor || "";


    console.log("Product:", {
        id: productId,
        name: productName,
        type: productType,
        shade: productShade,
        color: productColor
    });


    /* =====================================================
       PRODUCT TYPE NORMALIZATION
       ===================================================== */

    function normalizeProductType(type) {

        return String(type || "")
            .trim()
            .toLowerCase()
            .replace(/[_\s-]+/g, "");

    }


    const normalizedProductType =
        normalizeProductType(productType);


    /* =====================================================
       STATE
       ===================================================== */

    let faceLandmarker = null;

    let mediaStream = null;

    let animationFrame = null;

    let cameraRunning = false;

    let cameraFacingMode = "user";

    let mediaPipeLoading = false;

    let mediaPipeReady = false;

    let cameraStartAttempts = 0;

    let currentVideoWidth = 0;

    let currentVideoHeight = 0;


    /* =====================================================
       PREVIEW ORIENTATION
       
       VERY IMPORTANT:
       NEVER MIRROR THE CAMERA.
       ===================================================== */

    function resetPreviewOrientation() {

        if (tryOnVideo) {

            tryOnVideo.style.transform = "none";

            tryOnVideo.style.webkitTransform = "none";

        }

        if (tryOnCanvas) {

            tryOnCanvas.style.transform = "none";

            tryOnCanvas.style.webkitTransform = "none";

        }

        if (tryOnImage) {

            tryOnImage.style.transform = "none";

            tryOnImage.style.webkitTransform = "none";

        }

    }


    /* =====================================================
       STATUS
       ===================================================== */

    function setStatus(message) {

        if (!tryOnStatusText) {
            return;
        }

        tryOnStatusText.textContent = message;

    }


    function showStatus() {

        if (tryOnStatus) {

            tryOnStatus.style.display = "flex";

        }

    }


    function hideStatus() {

        if (tryOnStatus) {

            tryOnStatus.style.display = "none";

        }

    }


    /* =====================================================
       ERROR
       ===================================================== */

    function showError(message) {

        console.error("Glamora AR:", message);

        if (tryOnError) {

            tryOnError.textContent = message;

            tryOnError.style.display = "block";

        }

    }


    function clearError() {

        if (tryOnError) {

            tryOnError.textContent = "";

            tryOnError.style.display = "none";

        }

    }


    /* =====================================================
       OPEN TRY ON
       ===================================================== */

    async function openTryOn() {

        console.log("Opening Glamora AR Try-On...");

        clearError();

        resetPreviewOrientation();

        tryOnModal.classList.add("active");

        tryOnModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "tryon-open"
        );

        if (tryOnPlaceholder) {

            tryOnPlaceholder.style.display = "flex";

        }

        if (tryOnImage) {

            tryOnImage.style.display = "none";

        }

        if (tryOnCanvas) {

            tryOnCanvas.style.display = "none";

        }

        if (tryOnVideo) {

            tryOnVideo.style.display = "none";

        }

        setStatus("Requesting camera permission...");

        showStatus();

        await startCamera();

    }


    /* =====================================================
       CLOSE TRY ON
       ===================================================== */

    function closeTryOn() {

        console.log("Closing Glamora AR Try-On.");

        stopCamera();

        if (tryOnModal) {

            tryOnModal.classList.remove("active");

            tryOnModal.setAttribute(
                "aria-hidden",
                "true"
            );

        }

        document.body.classList.remove(
            "tryon-open"
        );

        clearError();

        clearCanvas();

        if (tryOnVideo) {

            tryOnVideo.style.display = "none";

            tryOnVideo.pause();

            tryOnVideo.srcObject = null;

        }

        if (tryOnImage) {

            tryOnImage.style.display = "none";

            tryOnImage.removeAttribute("src");

        }

        if (tryOnCanvas) {

            tryOnCanvas.style.display = "none";

        }

        if (tryOnPlaceholder) {

            tryOnPlaceholder.style.display = "flex";

        }

        resetPreviewOrientation();

        setStatus("Ready");

    }


    /* =====================================================
       CAMERA SUPPORT
       ===================================================== */

    function checkCameraSupport() {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            showError(
                "Your browser does not support camera access. Please use a modern version of Chrome, Edge, or Firefox."
            );

            return false;

        }

        return true;

    }


    /* =====================================================
       START CAMERA
       ===================================================== */

    async function startCamera() {

        if (!checkCameraSupport()) {

            return;

        }


        /* -----------------------------------------------
           STOP EXISTING CAMERA
           ----------------------------------------------- */

        if (mediaStream) {

            stopCamera();

        }


        cameraStartAttempts++;

        console.log(
            "Starting camera. Attempt:",
            cameraStartAttempts
        );


        clearError();

        setStatus(
            "Requesting camera permission..."
        );


        /* -----------------------------------------------
           CAMERA CONSTRAINTS
           
           We use the user's camera but DO NOT mirror it.
           ----------------------------------------------- */

        const constraints = {

            audio: false,

            video: {

                facingMode: {
                    ideal: cameraFacingMode
                },

                width: {
                    ideal: 1280
                },

                height: {
                    ideal: 720
                }

            }

        };


        try {

            console.log(
                "Calling navigator.mediaDevices.getUserMedia..."
            );

            mediaStream =
                await navigator.mediaDevices.getUserMedia(
                    constraints
                );


            console.log(
                "Camera permission granted."
            );


            /* -------------------------------------------
               VERIFY STREAM
               ------------------------------------------- */

            if (!mediaStream) {

                throw new Error(
                    "Camera stream was not created."
                );

            }


            const tracks =
                mediaStream.getVideoTracks();


            if (!tracks.length) {

                throw new Error(
                    "No video track was returned by the camera."
                );

            }


            console.log(
                "Camera track:",
                tracks[0].label
            );


            /* -------------------------------------------
               TRACK END HANDLER
               ------------------------------------------- */

            tracks[0].addEventListener(
                "ended",
                () => {

                    console.warn(
                        "Camera track ended."
                    );

                    cameraRunning = false;

                    setStatus(
                        "Camera stopped."
                    );

                }
            );


            /* -------------------------------------------
               CONFIGURE VIDEO
               ------------------------------------------- */

            tryOnVideo.autoplay = true;

            tryOnVideo.playsInline = true;

            tryOnVideo.muted = true;

            tryOnVideo.setAttribute(
                "playsinline",
                ""
            );

            tryOnVideo.setAttribute(
                "autoplay",
                ""
            );

            tryOnVideo.muted = true;


            /* -------------------------------------------
               IMPORTANT:
               REMOVE ALL MIRRORING
               ------------------------------------------- */

            resetPreviewOrientation();


            /* -------------------------------------------
               ATTACH CAMERA STREAM
               ------------------------------------------- */

            tryOnVideo.srcObject =
                mediaStream;


            /* -------------------------------------------
               VIDEO EVENTS
               ------------------------------------------- */

            tryOnVideo.onloadedmetadata = () => {

                console.log(
                    "Camera video metadata loaded:",
                    tryOnVideo.videoWidth,
                    "x",
                    tryOnVideo.videoHeight
                );

            };


            /* -------------------------------------------
               SHOW CAMERA SOURCE
               
               Video itself is hidden visually.
               Canvas is the visible AR preview.
               ------------------------------------------- */

            tryOnVideo.style.display = "none";


            if (tryOnPlaceholder) {

                tryOnPlaceholder.style.display =
                    "none";

            }

            if (tryOnImage) {

                tryOnImage.style.display =
                    "none";

            }

            if (tryOnCanvas) {

                tryOnCanvas.style.display =
                    "block";

            }


            /* -------------------------------------------
               PLAY VIDEO
               ------------------------------------------- */

            try {

                await tryOnVideo.play();

            } catch (playError) {

                console.warn(
                    "Initial video.play() failed:",
                    playError
                );


                await new Promise(
                    resolve => setTimeout(
                        resolve,
                        300
                    )
                );


                try {

                    await tryOnVideo.play();

                } catch (secondPlayError) {

                    console.error(
                        "Camera video could not start:",
                        secondPlayError
                    );

                    throw secondPlayError;

                }

            }


            /* -------------------------------------------
               WAIT FOR VIDEO DIMENSIONS
               ------------------------------------------- */

            await waitForVideoDimensions();


            /* -------------------------------------------
               RESIZE CANVAS
               ------------------------------------------- */

            resizeCanvas();


            /* -------------------------------------------
               CAMERA READY
               ------------------------------------------- */

            cameraRunning = true;

            setStatus(
                "Camera ready. Position your face in the frame."
            );


            if (switchCameraBtn) {

                switchCameraBtn.hidden = false;

            }

            if (stopCameraBtn) {

                stopCameraBtn.hidden = false;

            }


            /* -------------------------------------------
               START RENDER LOOP
               ------------------------------------------- */

            if (animationFrame) {

                cancelAnimationFrame(
                    animationFrame
                );

            }

            renderCameraFrame();


            /* -------------------------------------------
               LOAD MEDIAPIPE
               ------------------------------------------- */

            if (!mediaPipeReady) {

                loadMediaPipe()
                    .catch(error => {

                        console.error(
                            "MediaPipe loading failed:",
                            error
                        );

                        showError(
                            "Face tracking is unavailable. You can still use the camera, but face makeup cannot be applied until the face tracker loads."
                        );

                    });

            }

        } catch (error) {

            console.error(
                "Camera startup failed:",
                error
            );


            handleCameraError(error);


            /* -------------------------------------------
               RETRY ABORT ERROR ONCE
               ------------------------------------------- */

            if (
                error &&
                error.name === "AbortError" &&
                cameraStartAttempts < 2
            ) {

                console.log(
                    "Retrying camera startup..."
                );


                await new Promise(
                    resolve => setTimeout(
                        resolve,
                        700
                    )
                );


                return startCamera();

            }

        }

    }


    /* =====================================================
       WAIT FOR VIDEO DIMENSIONS
       ===================================================== */

    function waitForVideoDimensions() {

        return new Promise(
            (resolve, reject) => {

                const timeout =
                    setTimeout(
                        () => {

                            if (
                                tryOnVideo.videoWidth > 0 &&
                                tryOnVideo.videoHeight > 0
                            ) {

                                resolve();

                            } else {

                                reject(
                                    new Error(
                                        "Camera started but video dimensions are unavailable."
                                    )
                                );

                            }

                        },
                        8000
                    );


                const check = () => {

                    if (
                        tryOnVideo.videoWidth > 0 &&
                        tryOnVideo.videoHeight > 0
                    ) {

                        clearTimeout(timeout);

                        resolve();

                        return;

                    }

                    requestAnimationFrame(
                        check
                    );

                };


                check();

            }
        );

    }


    /* =====================================================
       CAMERA ERROR HANDLER
       ===================================================== */

    function handleCameraError(error) {

        let message =
            "Unable to start the camera.";

        if (!error) {

            showError(message);

            return;

        }


        switch (error.name) {

            case "NotAllowedError":

            case "PermissionDeniedError":

                message =
                    "Camera permission was denied. Please allow camera access for 127.0.0.1:5000 in your browser and then click Use Camera again.";

                break;


            case "NotFoundError":

            case "DevicesNotFoundError":

                message =
                    "No camera was found on this device.";

                break;


            case "NotReadableError":

            case "TrackStartError":

                message =
                    "The camera is already being used by another application. Close other camera applications and try again.";

                break;


            case "OverconstrainedError":

                message =
                    "The selected camera does not support the requested settings. Please try another camera.";

                break;


            case "SecurityError":

                message =
                    "The browser blocked camera access for security reasons.";

                break;


            case "AbortError":

                message =
                    "Camera startup was interrupted. Please click Use Camera again.";

                break;


            default:

                if (error.message) {

                    message =
                        "Camera error: " +
                        error.message;

                }

                break;

        }


        showError(message);

        setStatus(
            "Camera unavailable"
        );

    }


    /* =====================================================
       STOP CAMERA
       ===================================================== */

    function stopCamera() {

        console.log(
            "Stopping camera..."
        );


        cameraRunning = false;


        if (animationFrame) {

            cancelAnimationFrame(
                animationFrame
            );

            animationFrame = null;

        }


        if (mediaStream) {

            mediaStream
                .getTracks()
                .forEach(track => {

                    try {

                        track.stop();

                    } catch (error) {

                        console.warn(
                            "Unable to stop track:",
                            error
                        );

                    }

                });

            mediaStream = null;

        }


        if (tryOnVideo) {

            tryOnVideo.pause();

            tryOnVideo.srcObject = null;

        }


        if (switchCameraBtn) {

            switchCameraBtn.hidden = true;

        }

        if (stopCameraBtn) {

            stopCameraBtn.hidden = true;

        }


        console.log(
            "Camera stopped."
        );

    }


    /* =====================================================
       LOAD LOCAL MEDIAPIPE
       ===================================================== */

    async function loadMediaPipe() {

        if (mediaPipeReady) {

            return faceLandmarker;

        }


        if (mediaPipeLoading) {

            while (mediaPipeLoading) {

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            100
                        )
                );

            }

            return faceLandmarker;

        }


        mediaPipeLoading = true;


        try {

            console.log(
                "Loading local MediaPipe..."
            );


            /* -------------------------------------------
               LOCAL MODULE
               ------------------------------------------- */

            const visionModule =
                await import(
                    "/static/mediapipe/vision_bundle.mjs"
                );


            const FaceLandmarker =
                visionModule.FaceLandmarker;


            const FilesetResolver =
                visionModule.FilesetResolver;


            if (
                !FaceLandmarker ||
                !FilesetResolver
            ) {

                throw new Error(
                    "FaceLandmarker or FilesetResolver was not found in vision_bundle.mjs."
                );

            }


            /* -------------------------------------------
               LOCAL WASM
               ------------------------------------------- */

            console.log(
                "Loading local MediaPipe WASM..."
            );


            const vision =
                await FilesetResolver.forVisionTasks(
                    "/static/mediapipe/wasm"
                );


            /* -------------------------------------------
               LOCAL FACE MODEL
               ------------------------------------------- */

            const modelPath =
                "/static/models/face_landmarker.task";


            console.log(
                "Loading local face model:",
                modelPath
            );


            /* -------------------------------------------
               TRY GPU FIRST
               ------------------------------------------- */

            try {

                faceLandmarker =
                    await FaceLandmarker.createFromOptions(
                        vision,
                        {

                            baseOptions: {

                                modelAssetPath:
                                    modelPath,

                                delegate:
                                    "GPU"

                            },

                            runningMode:
                                "VIDEO",

                            numFaces:
                                1,

                            minFaceDetectionConfidence:
                                0.45,

                            minFacePresenceConfidence:
                                0.45,

                            minTrackingConfidence:
                                0.45

                        }
                    );


                console.log(
                    "MediaPipe initialized using GPU."
                );

            } catch (gpuError) {

                console.warn(
                    "GPU MediaPipe failed. Trying CPU...",
                    gpuError
                );


                /* ---------------------------------------
                   CPU FALLBACK
                   --------------------------------------- */

                faceLandmarker =
                    await FaceLandmarker.createFromOptions(
                        vision,
                        {

                            baseOptions: {

                                modelAssetPath:
                                    modelPath,

                                delegate:
                                    "CPU"

                            },

                            runningMode:
                                "VIDEO",

                            numFaces:
                                1,

                            minFaceDetectionConfidence:
                                0.45,

                            minFacePresenceConfidence:
                                0.45,

                            minTrackingConfidence:
                                0.45

                        }
                    );


                console.log(
                    "MediaPipe initialized using CPU."
                );

            }


            mediaPipeReady = true;

            console.log(
                "MediaPipe face tracking is ready."
            );


            if (cameraRunning) {

                setStatus(
                    "Face tracking ready. Position your face in the frame."
                );

            }


            return faceLandmarker;

        } catch (error) {

            mediaPipeReady = false;

            faceLandmarker = null;

            console.error(
                "MediaPipe initialization failed:",
                error
            );

            throw error;

        } finally {

            mediaPipeLoading = false;

        }

    }


    /* =====================================================
       CANVAS RESIZE
       ===================================================== */

    function resizeCanvas() {

        if (
            !tryOnCanvas ||
            !tryOnVideo
        ) {

            return;

        }


        const width =
            tryOnVideo.videoWidth ||
            currentVideoWidth ||
            640;


        const height =
            tryOnVideo.videoHeight ||
            currentVideoHeight ||
            480;


        currentVideoWidth =
            width;

        currentVideoHeight =
            height;


        tryOnCanvas.width =
            width;

        tryOnCanvas.height =
            height;


        /* -------------------------------------------
           VERY IMPORTANT:
           NO MIRRORING
           ------------------------------------------- */

        tryOnCanvas.style.transform =
            "none";

        tryOnCanvas.style.webkitTransform =
            "none";


        console.log(
            "Canvas resized:",
            width,
            "x",
            height
        );

    }


    /* =====================================================
       CLEAR CANVAS
       ===================================================== */

    function clearCanvas() {

        if (!tryOnCanvas) {

            return;

        }


        const ctx =
            tryOnCanvas.getContext(
                "2d"
            );


        if (!ctx) {

            return;

        }


        ctx.clearRect(
            0,
            0,
            tryOnCanvas.width,
            tryOnCanvas.height
        );

    }


    /* =====================================================
       LANDMARK POINT
       ===================================================== */

    function point(
        landmarks,
        index,
        width,
        height
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
                width,

            y:
                landmarks[index].y *
                height

        };

    }


    /* =====================================================
       PRODUCT COLOR
       ===================================================== */

    function getProductColor() {

        const text =
            (
                productColor ||
                productShade ||
                productName ||
                ""
            )
            .toLowerCase()
            .trim();


        /* -------------------------------------------
           HEX COLOR
           ------------------------------------------- */

        const hexMatch =
            text.match(
                /#[0-9a-f]{3,8}/i
            );


        if (hexMatch) {

            return hexMatch[0];

        }


        /* -------------------------------------------
           RGB COLOR
           ------------------------------------------- */

        const rgbMatch =
            text.match(
                /rgb\s*\([^)]+\)/i
            );


        if (rgbMatch) {

            return rgbMatch[0];

        }


        /* -------------------------------------------
           BLACK
           ------------------------------------------- */

        if (
            text.includes("black") ||
            text.includes("jet")
        ) {

            return "#171116";

        }


        /* -------------------------------------------
           BURGUNDY / WINE
           ------------------------------------------- */

        if (
            text.includes("burgundy") ||
            text.includes("wine") ||
            text.includes("maroon")
        ) {

            return "#7A1835";

        }


        /* -------------------------------------------
           BERRY / PLUM
           ------------------------------------------- */

        if (
            text.includes("berry") ||
            text.includes("plum") ||
            text.includes("purple")
        ) {

            return "#8A2859";

        }


        /* -------------------------------------------
           MAUVE
           ------------------------------------------- */

        if (
            text.includes("mauve")
        ) {

            return "#9B5A72";

        }


        /* -------------------------------------------
           CORAL
           ------------------------------------------- */

        if (
            text.includes("coral")
        ) {

            return "#E8786D";

        }


        /* -------------------------------------------
           PEACH
           ------------------------------------------- */

        if (
            text.includes("peach")
        ) {

            return "#F2A08C";

        }


        /* -------------------------------------------
           ORANGE
           ------------------------------------------- */

        if (
            text.includes("orange")
        ) {

            return "#E8752A";

        }


        /* -------------------------------------------
           BROWN
           ------------------------------------------- */

        if (
            text.includes("brown") ||
            text.includes("chocolate")
        ) {

            return "#6B3928";

        }


        /* -------------------------------------------
           NUDE / BEIGE
           ------------------------------------------- */

        if (
            text.includes("nude") ||
            text.includes("beige")
        ) {

            return "#C78F7A";

        }


        /* -------------------------------------------
           ROSE
           ------------------------------------------- */

        if (
            text.includes("rose")
        ) {

            return "#C95F78";

        }


        /* -------------------------------------------
           PINK
           ------------------------------------------- */

        if (
            text.includes("pink")
        ) {

            return "#D96A86";

        }


        /* -------------------------------------------
           RED
           ------------------------------------------- */

        if (
            text.includes("red") ||
            text.includes("crimson")
        ) {

            return "#C62845";

        }


        /* -------------------------------------------
           DEFAULT GLAMORA COLOR
           ------------------------------------------- */

        return "#C85F7A";

    }


    /* =====================================================
       HEX TO RGBA
       ===================================================== */

    function hexToRgba(
        hex,
        alpha
    ) {

        let value =
            String(hex || "")
                .replace("#", "")
                .trim();


        if (value.length === 3) {

            value =
                value
                    .split("")
                    .map(char => char + char)
                    .join("");

        }


        const number =
            parseInt(
                value,
                16
            );


        if (
            Number.isNaN(number)
        ) {

            return (
                `rgba(200,95,122,${alpha})`
            );

        }


        const r =
            (number >> 16) & 255;


        const g =
            (number >> 8) & 255;


        const b =
            number & 255;


        return (
            `rgba(${r},${g},${b},${alpha})`
        );

    }


    /* =====================================================
       FACIAL LANDMARK ARRAYS
       ===================================================== */

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
        308,
        324,
        318,
        402,
        317,
        14,
        87,
        178,
        88,
        95,
        78,
        61

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
        291,
        375,
        321,
        405,
        314,
        17,
        84,
        181,
        91,
        146,
        61,
        78

    ];


    const LEFT_EYE = [

        263,
        249,
        390,
        373,
        374,
        380,
        381,
        382,
        362,
        466,
        388,
        387,
        386,
        385,
        384,
        398,
        263

    ];


    const RIGHT_EYE = [

        33,
        7,
        163,
        144,
        145,
        153,
        154,
        155,
        133,
        246,
        161,
        160,
        159,
        158,
        157,
        173,
        33

    ];


    /* =====================================================
       DRAW POLYGON
       ===================================================== */

    function drawPolygon(
        ctx,
        landmarks,
        indexes,
        width,
        height
    ) {

        if (
            !landmarks ||
            !indexes ||
            !indexes.length
        ) {

            return;

        }


        const first =
            point(
                landmarks,
                indexes[0],
                width,
                height
            );


        if (!first) {

            return;

        }


        ctx.beginPath();

        ctx.moveTo(
            first.x,
            first.y
        );


        for (
            let i = 1;
            i < indexes.length;
            i++
        ) {

            const p =
                point(
                    landmarks,
                    indexes[i],
                    width,
                    height
                );


            if (!p) {

                continue;

            }


            ctx.lineTo(
                p.x,
                p.y
            );

        }


        ctx.closePath();

    }


    /* =====================================================
       LIPSTICK
       ===================================================== */

    function drawLipstick(
        ctx,
        landmarks,
        width,
        height
    ) {

        const color =
            getProductColor();


        ctx.save();


        /* -------------------------------------------
           SOFT LIP COLOR
           ------------------------------------------- */

        drawPolygon(
            ctx,
            landmarks,
            OUTER_LIPS,
            width,
            height
        );


        ctx.fillStyle =
            hexToRgba(
                color,
                0.72
            );


        ctx.shadowColor =
            hexToRgba(
                color,
                0.25
            );


        ctx.shadowBlur = 4;

        ctx.fill();


        /* -------------------------------------------
           REMOVE INNER LIP AREA
           ------------------------------------------- */

        ctx.globalCompositeOperation =
            "destination-out";


        drawPolygon(
            ctx,
            landmarks,
            INNER_LIPS,
            width,
            height
        );


        ctx.fill();


        ctx.restore();

    }


    /* =====================================================
       EYESHADOW
       ===================================================== */

    function drawEyeShadow(
        ctx,
        landmarks,
        indexes,
        width,
        height
    ) {

        const points =
            indexes
                .map(
                    index =>
                        point(
                            landmarks,
                            index,
                            width,
                            height
                        )
                )
                .filter(Boolean);


        if (!points.length) {

            return;

        }


        let minX =
            Infinity;

        let maxX =
            -Infinity;

        let minY =
            Infinity;

        let maxY =
            -Infinity;


        points.forEach(p => {

            minX =
                Math.min(
                    minX,
                    p.x
                );

            maxX =
                Math.max(
                    maxX,
                    p.x
                );

            minY =
                Math.min(
                    minY,
                    p.y
                );

            maxY =
                Math.max(
                    maxY,
                    p.y
                );

        });


        const centerX =
            (minX + maxX) / 2;


        const centerY =
            (minY + maxY) / 2;


        const radiusX =
            Math.max(
                25,
                (maxX - minX) * 0.85
            );


        const radiusY =
            Math.max(
                14,
                (maxY - minY) * 1.2
            );


        const gradient =
            ctx.createRadialGradient(
                centerX,
                centerY,
                2,
                centerX,
                centerY,
                radiusX
            );


        const color =
            getProductColor();


        gradient.addColorStop(
            0,
            hexToRgba(
                color,
                0.45
            )
        );


        gradient.addColorStop(
            0.55,
            hexToRgba(
                color,
                0.22
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


        ctx.ellipse(
            centerX,
            centerY,
            radiusX,
            radiusY,
            0,
            0,
            Math.PI * 2
        );


        ctx.fill();


        ctx.restore();

    }


    /* =====================================================
       EYESHADOW
       ===================================================== */

    function drawEyeshadow(
        ctx,
        landmarks,
        width,
        height
    ) {

        drawEyeShadow(
            ctx,
            landmarks,
            LEFT_EYE,
            width,
            height
        );


        drawEyeShadow(
            ctx,
            landmarks,
            RIGHT_EYE,
            width,
            height
        );

    }


    /* =====================================================
       EYELINER
       ===================================================== */

    function drawEyeLine(
        ctx,
        landmarks,
        indexes,
        width,
        height
    ) {

        const points =
            indexes
                .map(
                    index =>
                        point(
                            landmarks,
                            index,
                            width,
                            height
                        )
                )
                .filter(Boolean);


        if (
            points.length < 3
        ) {

            return;

        }


        ctx.save();


        ctx.strokeStyle =
            "#211218";


        ctx.lineWidth = 3;

        ctx.lineCap =
            "round";

        ctx.lineJoin =
            "round";


        ctx.beginPath();


        ctx.moveTo(
            points[0].x,
            points[0].y
        );


        for (
            let i = 1;
            i < points.length;
            i++
        ) {

            ctx.lineTo(
                points[i].x,
                points[i].y
            );

        }


        ctx.stroke();


        ctx.restore();

    }


    /* =====================================================
       EYELINER
       ===================================================== */

    function drawEyeliner(
        ctx,
        landmarks,
        width,
        height
    ) {

        drawEyeLine(
            ctx,
            landmarks,
            LEFT_EYE,
            width,
            height
        );


        drawEyeLine(
            ctx,
            landmarks,
            RIGHT_EYE,
            width,
            height
        );

    }


    /* =====================================================
       MASCARA
       ===================================================== */

    function drawMascara(
        ctx,
        landmarks,
        width,
        height
    ) {

        drawEyeliner(
            ctx,
            landmarks,
            width,
            height
        );

    }


    /* =====================================================
       BLUSH
       ===================================================== */

    function drawBlush(
        ctx,
        landmarks,
        width,
        height
    ) {

        const color =
            getProductColor();


        const cheeks = [

            point(
                landmarks,
                50,
                width,
                height
            ),

            point(
                landmarks,
                280,
                width,
                height
            )

        ];


        ctx.save();


        cheeks.forEach(
            cheek => {

                if (!cheek) {

                    return;

                }


                const gradient =
                    ctx.createRadialGradient(
                        cheek.x,
                        cheek.y,
                        5,
                        cheek.x,
                        cheek.y,
                        55
                    );


                gradient.addColorStop(
                    0,
                    hexToRgba(
                        color,
                        0.32
                    )
                );


                gradient.addColorStop(
                    0.5,
                    hexToRgba(
                        color,
                        0.18
                    )
                );


                gradient.addColorStop(
                    1,
                    hexToRgba(
                        color,
                        0
                    )
                );


                ctx.fillStyle =
                    gradient;


                ctx.beginPath();


                ctx.arc(
                    cheek.x,
                    cheek.y,
                    55,
                    0,
                    Math.PI * 2
                );


                ctx.fill();

            }
        );


        ctx.restore();

    }


    /* =====================================================
       HIGHLIGHTER
       ===================================================== */

    function drawHighlighter(
        ctx,
        landmarks,
        width,
        height
    ) {

        const indexes = [

            1,
            116,
            345

        ];


        ctx.save();


        indexes.forEach(
            index => {

                const p =
                    point(
                        landmarks,
                        index,
                        width,
                        height
                    );


                if (!p) {

                    return;

                }


                const gradient =
                    ctx.createRadialGradient(
                        p.x,
                        p.y,
                        1,
                        p.x,
                        p.y,
                        22
                    );


                gradient.addColorStop(
                    0,
                    "rgba(255,245,230,0.60)"
                );


                gradient.addColorStop(
                    1,
                    "rgba(255,245,230,0)"
                );


                ctx.fillStyle =
                    gradient;


                ctx.beginPath();


                ctx.arc(
                    p.x,
                    p.y,
                    22,
                    0,
                    Math.PI * 2
                );


                ctx.fill();

            }
        );


        ctx.restore();

    }


    /* =====================================================
       FOUNDATION
       ===================================================== */

    function drawFoundation(
        ctx,
        landmarks,
        width,
        height
    ) {

        const nose =
            point(
                landmarks,
                1,
                width,
                height
            );


        if (!nose) {

            return;

        }


        const color =
            getProductColor();


        const gradient =
            ctx.createRadialGradient(
                nose.x,
                nose.y,
                15,
                nose.x,
                nose.y,
                150
            );


        gradient.addColorStop(
            0,
            hexToRgba(
                color,
                0.08
            )
        );


        gradient.addColorStop(
            0.65,
            hexToRgba(
                color,
                0.035
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
            nose.x,
            nose.y,
            150,
            0,
            Math.PI * 2
        );


        ctx.fill();


        ctx.restore();

    }


    /* =====================================================
       DRAW MAKEUP
       ===================================================== */

    function drawMakeup(
        ctx,
        landmarks,
        width,
        height
    ) {

        if (
            !landmarks ||
            !landmarks.length
        ) {

            return;

        }


        switch (
            normalizedProductType
        ) {

            case "lipstick":

                drawLipstick(
                    ctx,
                    landmarks,
                    width,
                    height
                );

                break;


            case "eyeshadow":

                drawEyeshadow(
                    ctx,
                    landmarks,
                    width,
                    height
                );

                break;


            case "eyeliner":

                drawEyeliner(
                    ctx,
                    landmarks,
                    width,
                    height
                );

                break;


            case "mascara":

                drawMascara(
                    ctx,
                    landmarks,
                    width,
                    height
                );

                break;


            case "blush":

                drawBlush(
                    ctx,
                    landmarks,
                    width,
                    height
                );

                break;


            case "highlighter":

                drawHighlighter(
                    ctx,
                    landmarks,
                    width,
                    height
                );

                break;


            case "foundation":

                drawFoundation(
                    ctx,
                    landmarks,
                    width,
                    height
                );

                break;


            default:

                console.warn(
                    "Unsupported product type:",
                    normalizedProductType
                );

                break;

        }

    }


    /* =====================================================
       RENDER CAMERA FRAME
       
       IMPORTANT:
       THERE IS ABSOLUTELY NO MIRRORING HERE.
       
       DO NOT ADD:
       
       ctx.translate(width, 0);
       ctx.scale(-1, 1);
       
       ===================================================== */

    function renderCameraFrame() {

        if (
            !cameraRunning ||
            !tryOnVideo ||
            !tryOnCanvas
        ) {

            return;

        }


        const ctx =
            tryOnCanvas.getContext(
                "2d",
                {
                    alpha: true
                }
            );


        if (!ctx) {

            return;

        }


        const width =
            tryOnCanvas.width;


        const height =
            tryOnCanvas.height;


        if (
            !width ||
            !height
        ) {

            animationFrame =
                requestAnimationFrame(
                    renderCameraFrame
                );

            return;

        }


        /* -------------------------------------------
           FORCE NORMAL ORIENTATION
           ------------------------------------------- */

        tryOnVideo.style.transform =
            "none";

        tryOnCanvas.style.transform =
            "none";


        /* -------------------------------------------
           CLEAR PREVIOUS FRAME
           ------------------------------------------- */

        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        /* -------------------------------------------
           DRAW CAMERA EXACTLY AS RECEIVED
           
           NO FLIP
           NO MIRROR
           NO SCALE(-1,1)
           ------------------------------------------- */

        ctx.save();


        ctx.globalCompositeOperation =
            "source-over";


        ctx.drawImage(
            tryOnVideo,
            0,
            0,
            width,
            height
        );


        ctx.restore();


        /* -------------------------------------------
           FACE DETECTION
           ------------------------------------------- */

        if (
            mediaPipeReady &&
            faceLandmarker
        ) {

            try {

                const results =
                    faceLandmarker.detectForVideo(
                        tryOnVideo,
                        performance.now()
                    );


                if (
                    results &&
                    results.faceLandmarks &&
                    results.faceLandmarks.length > 0
                ) {

                    const landmarks =
                        results.faceLandmarks[0];


                    /* --------------------------------
                       DRAW MAKEUP DIRECTLY IN THE SAME
                       NORMAL COORDINATE SYSTEM.

                       NO MIRRORING.
                       -------------------------------- */

                    drawMakeup(
                        ctx,
                        landmarks,
                        width,
                        height
                    );


                    setStatus(
                        "Face detected — virtual try-on active."
                    );

                } else {

                    setStatus(
                        "No face detected. Position your face in the frame."
                    );

                }

            } catch (error) {

                console.error(
                    "Face tracking error:",
                    error
                );


                setStatus(
                    "Face tracking is processing..."
                );

            }

        } else {

            setStatus(
                "Loading face tracking..."
            );

        }


        /* -------------------------------------------
           NEXT FRAME
           ------------------------------------------- */

        animationFrame =
            requestAnimationFrame(
                renderCameraFrame
            );

    }


    /* =====================================================
       SWITCH CAMERA
       ===================================================== */

    async function switchCamera() {

        if (!checkCameraSupport()) {

            return;

        }


        console.log(
            "Switching camera..."
        );


        cameraFacingMode =
            cameraFacingMode === "user"
                ? "environment"
                : "user";


        setStatus(
            "Switching camera..."
        );


        await startCamera();

    }


    /* =====================================================
       HANDLE IMAGE UPLOAD
       ===================================================== */

    async function handleImageUpload(
        event
    ) {

        const file =
            event.target.files &&
            event.target.files[0];


        if (!file) {

            return;

        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            showError(
                "Please select a valid image."
            );

            return;

        }


        console.log(
            "Uploaded image:",
            file.name
        );


        clearError();


        stopCamera();


        setStatus(
            "Loading image..."
        );


        showStatus();


        const objectUrl =
            URL.createObjectURL(
                file
            );


        try {

            const image =
                new Image();


            image.onload =
                async () => {

                    try {

                        if (
                            !mediaPipeReady
                        ) {

                            await loadMediaPipe();

                        }


                        if (
                            tryOnImage
                        ) {

                            tryOnImage.src =
                                objectUrl;

                            tryOnImage.style.display =
                                "none";

                            tryOnImage.style.transform =
                                "none";

                        }


                        if (
                            tryOnPlaceholder
                        ) {

                            tryOnPlaceholder.style.display =
                                "none";

                        }


                        if (
                            tryOnVideo
                        ) {

                            tryOnVideo.style.display =
                                "none";

                        }


                        if (
                            tryOnCanvas
                        ) {

                            tryOnCanvas.style.display =
                                "block";

                            tryOnCanvas.style.transform =
                                "none";

                        }


                        /* --------------------------------
                           RESIZE CANVAS
                           -------------------------------- */

                        const maxWidth =
                            1280;

                        const scale =
                            Math.min(
                                1,
                                maxWidth /
                                image.naturalWidth
                            );


                        const width =
                            Math.round(
                                image.naturalWidth *
                                scale
                            );


                        const height =
                            Math.round(
                                image.naturalHeight *
                                scale
                            );


                        tryOnCanvas.width =
                            width;

                        tryOnCanvas.height =
                            height;


                        const ctx =
                            tryOnCanvas.getContext(
                                "2d"
                            );


                        if (!ctx) {

                            throw new Error(
                                "Could not create canvas context."
                            );

                        }


                        ctx.clearRect(
                            0,
                            0,
                            width,
                            height
                        );


                        /* --------------------------------
                           DRAW IMAGE NORMALLY
                           
                           NO MIRRORING
                           -------------------------------- */

                        ctx.drawImage(
                            image,
                            0,
                            0,
                            width,
                            height
                        );


                        if (
                            mediaPipeReady &&
                            faceLandmarker
                        ) {

                            try {

                                /* -------------------------
                                   TEMPORARILY IMAGE MODE
                                   ------------------------- */

                                await faceLandmarker.setOptions(
                                    {
                                        runningMode:
                                            "IMAGE"
                                    }
                                );


                                const result =
                                    faceLandmarker.detect(
                                        image
                                    );


                                if (
                                    result &&
                                    result.faceLandmarks &&
                                    result.faceLandmarks.length
                                ) {

                                    drawMakeup(
                                        ctx,
                                        result.faceLandmarks[0],
                                        width,
                                        height
                                    );


                                    setStatus(
                                        "Face detected — virtual try-on active."
                                    );

                                } else {

                                    setStatus(
                                        "No face detected in the uploaded image."
                                    );

                                }


                                /* -------------------------
                                   RETURN TO VIDEO MODE
                                   ------------------------- */

                                await faceLandmarker.setOptions(
                                    {
                                        runningMode:
                                            "VIDEO"
                                    }
                                );

                            } catch (error) {

                                console.error(
                                    "Image face detection failed:",
                                    error
                                );


                                showError(
                                    "Could not detect a face in this image."
                                );

                            }

                        } else {

                            setStatus(
                                "Face tracking is unavailable."
                            );

                        }

                    } catch (error) {

                        console.error(
                            "Image try-on failed:",
                            error
                        );


                        showError(
                            "Unable to process the selected image."
                        );

                    }

                };


            image.onerror =
                () => {

                    URL.revokeObjectURL(
                        objectUrl
                    );


                    showError(
                        "Unable to load the selected image."
                    );

                };


            image.src =
                objectUrl;

        } catch (error) {

            URL.revokeObjectURL(
                objectUrl
            );


            console.error(
                "Upload error:",
                error
            );


            showError(
                "Unable to process the image."
            );

        }

    }


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

    tryOnBtn.addEventListener(
        "click",
        openTryOn
    );


    if (tryOnClose) {

        tryOnClose.addEventListener(
            "click",
            closeTryOn
        );

    }


    if (startCameraBtn) {

        startCameraBtn.addEventListener(
            "click",
            async () => {

                clearError();

                resetPreviewOrientation();

                await startCamera();

            }
        );

    }


    if (stopCameraBtn) {

        stopCameraBtn.addEventListener(
            "click",
            () => {

                stopCamera();

                clearCanvas();

                if (tryOnCanvas) {

                    tryOnCanvas.style.display =
                        "none";

                }

                if (tryOnVideo) {

                    tryOnVideo.style.display =
                        "none";

                }

                if (tryOnPlaceholder) {

                    tryOnPlaceholder.style.display =
                        "flex";

                }

                setStatus(
                    "Camera stopped."
                );

            }
        );

    }


    if (switchCameraBtn) {

        switchCameraBtn.addEventListener(
            "click",
            switchCamera
        );

    }


    if (uploadImageBtn) {

        uploadImageBtn.addEventListener(
            "click",
            () => {

                if (tryOnImageInput) {

                    tryOnImageInput.click();

                }

            }
        );

    }


    if (tryOnImageInput) {

        tryOnImageInput.addEventListener(
            "change",
            handleImageUpload
        );

    }


    /* =====================================================
       MODAL BACKDROP
       ===================================================== */

    tryOnModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                tryOnModal
            ) {

                closeTryOn();

            }

        }
    );


    /* =====================================================
       ESCAPE KEY
       ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                tryOnModal.classList.contains(
                    "active"
                )
            ) {

                closeTryOn();

            }

        }
    );


    /* =====================================================
       PAGE UNLOAD
       ===================================================== */

    window.addEventListener(
        "beforeunload",
        () => {

            stopCamera();

        }
    );


    /* =====================================================
       INITIAL ORIENTATION RESET
       ===================================================== */

    resetPreviewOrientation();


    console.log(
        "Glamora AR Product Details initialized."
    );


})();
/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS - VIRTUAL TRY ON

   CAMERA
   LOCAL MEDIAPIPE
   LOCAL WASM
   LOCAL FACE LANDMARK MODEL

   CAMERA IS NOT MIRRORED
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
    const tryOnPlaceholder =
        document.getElementById("tryOnPlaceholder");

    const tryOnStatus =
        document.getElementById("tryOnStatus");

    const tryOnStatusText =
        document.getElementById("tryOnStatusText");

    const tryOnError =
        document.getElementById("tryOnError");

    const startCameraBtn =
        document.getElementById("startCameraBtn");

    const uploadImageBtn =
        document.getElementById("uploadImageBtn");

    const tryOnImageInput =
        document.getElementById("tryOnImageInput");

    const switchCameraBtn =
        document.getElementById("switchCameraBtn");

    const stopCameraBtn =
        document.getElementById("stopCameraBtn");


    /* =====================================================
       DOM CHECK
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


    console.log("Product information:", {
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


    console.log(
        "Normalized product type:",
        normalizedProductType
    );


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

    let currentVideoWidth = 0;

    let currentVideoHeight = 0;

    let lastDetectionTime = 0;

    let lastFaceDetected = false;


    /* =====================================================
       ORIENTATION

       IMPORTANT:
       THERE IS NO MIRRORING ANYWHERE.
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

        if (tryOnStatusText) {

            tryOnStatusText.textContent = message;

        }

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

        console.error(
            "Glamora AR:",
            message
        );

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

        console.log(
            "Opening Glamora AR Try-On..."
        );

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

            tryOnPlaceholder.style.display =
                "flex";

        }

        if (tryOnImage) {

            tryOnImage.style.display =
                "none";

        }

        if (tryOnCanvas) {

            tryOnCanvas.style.display =
                "none";

        }

        if (tryOnVideo) {

            tryOnVideo.style.display =
                "none";

        }

        setStatus(
            "Loading face tracking..."
        );

        showStatus();

        /*
         * IMPORTANT:
         * Load MediaPipe FIRST.
         * Then start the camera.
         */

        try {

            await loadMediaPipe();

        } catch (error) {

            console.error(
                "MediaPipe could not load:",
                error
            );

            showError(
                "Face tracking could not be loaded. Check the local MediaPipe files in static/mediapipe and static/models."
            );

            setStatus(
                "Face tracking unavailable."
            );

            return;

        }

        await startCamera();

    }


    /* =====================================================
       CLOSE TRY ON
       ===================================================== */

    function closeTryOn() {

        console.log(
            "Closing Glamora AR Try-On."
        );

        stopCamera();

        if (tryOnModal) {

            tryOnModal.classList.remove(
                "active"
            );

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

            tryOnVideo.style.display =
                "none";

            tryOnVideo.pause();

            tryOnVideo.srcObject =
                null;

        }

        if (tryOnImage) {

            tryOnImage.style.display =
                "none";

            tryOnImage.removeAttribute(
                "src"
            );

        }

        if (tryOnCanvas) {

            tryOnCanvas.style.display =
                "none";

        }

        if (tryOnPlaceholder) {

            tryOnPlaceholder.style.display =
                "flex";

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
                "Your browser does not support camera access."
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
           STOP EXISTING STREAM
           ----------------------------------------------- */

        if (mediaStream) {

            stopCamera();

        }


        clearError();

        setStatus(
            "Requesting camera permission..."
        );


        /* -----------------------------------------------
           CAMERA CONSTRAINTS

           User camera.

           NO MIRRORING IS APPLIED.
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
                "Requesting camera..."
            );


            mediaStream =
                await navigator.mediaDevices.getUserMedia(
                    constraints
                );


            const tracks =
                mediaStream.getVideoTracks();


            if (!tracks.length) {

                throw new Error(
                    "No video track was returned."
                );

            }


            console.log(
                "Camera:",
                tracks[0].label
            );


            /* -------------------------------------------
               CAMERA TRACK ENDED
               ------------------------------------------- */

            tracks[0].addEventListener(
                "ended",
                () => {

                    cameraRunning = false;

                    setStatus(
                        "Camera stopped."
                    );

                }
            );


            /* -------------------------------------------
               VIDEO CONFIGURATION
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

            tryOnVideo.style.transform =
                "none";


            /* -------------------------------------------
               ATTACH STREAM
               ------------------------------------------- */

            tryOnVideo.srcObject =
                mediaStream;


            /* -------------------------------------------
               SHOW CANVAS
               ------------------------------------------- */

            tryOnVideo.style.display =
                "none";


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
               PLAY CAMERA
               ------------------------------------------- */

            await tryOnVideo.play();


            /* -------------------------------------------
               WAIT FOR VIDEO SIZE
               ------------------------------------------- */

            await waitForVideoDimensions();


            console.log(
                "Video dimensions:",
                tryOnVideo.videoWidth,
                "x",
                tryOnVideo.videoHeight
            );


            /* -------------------------------------------
               RESIZE CANVAS
               ------------------------------------------- */

            resizeCanvas();


            cameraRunning = true;


            setStatus(
                "Face tracking ready. Position your face in the frame."
            );


            if (switchCameraBtn) {

                switchCameraBtn.hidden =
                    false;

            }

            if (stopCameraBtn) {

                stopCameraBtn.hidden =
                    false;

            }


            /* -------------------------------------------
               START RENDER LOOP
               ------------------------------------------- */

            if (animationFrame) {

                cancelAnimationFrame(
                    animationFrame
                );

            }

            animationFrame =
                requestAnimationFrame(
                    renderCameraFrame
                );


        } catch (error) {

            console.error(
                "Camera startup failed:",
                error
            );

            stopCamera();

            handleCameraError(error);

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


                function check() {

                    if (
                        tryOnVideo.videoWidth > 0 &&
                        tryOnVideo.videoHeight > 0
                    ) {

                        clearTimeout(
                            timeout
                        );

                        resolve();

                        return;

                    }


                    requestAnimationFrame(
                        check
                    );

                }


                check();

            }
        );

    }


    /* =====================================================
       CAMERA ERROR
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
                    "Camera permission was denied. Allow camera access for 127.0.0.1:5000 and click Use Camera again.";

                break;


            case "NotFoundError":

            case "DevicesNotFoundError":

                message =
                    "No camera was found on this device.";

                break;


            case "NotReadableError":

            case "TrackStartError":

                message =
                    "The camera is already being used by another application.";

                break;


            case "OverconstrainedError":

                message =
                    "The selected camera does not support the requested settings.";

                break;


            case "SecurityError":

                message =
                    "The browser blocked camera access.";

                break;


            default:

                message =
                    error.message
                        ? "Camera error: " +
                          error.message
                        : message;

                break;

        }


        showError(message);

        setStatus(
            "Camera unavailable."
        );

    }


    /* =====================================================
       STOP CAMERA
       ===================================================== */

    function stopCamera() {

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
                            error
                        );

                    }

                });

            mediaStream = null;

        }


        if (tryOnVideo) {

            tryOnVideo.pause();

            tryOnVideo.srcObject =
                null;

        }


        if (switchCameraBtn) {

            switchCameraBtn.hidden =
                true;

        }

        if (stopCameraBtn) {

            stopCameraBtn.hidden =
                true;

        }

    }


    /* =====================================================
       LOAD LOCAL MEDIAPIPE
       ===================================================== */

    async function loadMediaPipe() {

        if (
            mediaPipeReady &&
            faceLandmarker
        ) {

            return faceLandmarker;

        }


        if (mediaPipeLoading) {

            while (mediaPipeLoading) {

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            50
                        )
                );

            }

            if (
                mediaPipeReady &&
                faceLandmarker
            ) {

                return faceLandmarker;

            }

            throw new Error(
                "MediaPipe failed to initialize."
            );

        }


        mediaPipeLoading = true;


        try {

            console.log(
                "Loading local MediaPipe module..."
            );


            /* -------------------------------------------
               LOCAL JS MODULE
               ------------------------------------------- */

            const visionModule =
                await import(
                    "/static/mediapipe/vision_bundle.mjs"
                );


            console.log(
                "MediaPipe module loaded."
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
                    "FaceLandmarker or FilesetResolver is missing from vision_bundle.mjs."
                );

            }


            /* -------------------------------------------
               LOCAL WASM
               ------------------------------------------- */

            console.log(
                "Loading local WASM..."
            );


            const vision =
                await FilesetResolver.forVisionTasks(
                    "/static/mediapipe/wasm"
                );


            console.log(
                "Local WASM loaded."
            );


            /* -------------------------------------------
               LOCAL MODEL
               ------------------------------------------- */

            const modelPath =
                "/static/models/face_landmarker.task";


            console.log(
                "Loading face model:",
                modelPath
            );


            /* -------------------------------------------
               GPU
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
                                0.35,

                            minFacePresenceConfidence:
                                0.35,

                            minTrackingConfidence:
                                0.35

                        }
                    );


                console.log(
                    "MediaPipe initialized with GPU."
                );


            } catch (gpuError) {

                console.warn(
                    "GPU initialization failed. Using CPU.",
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
                                0.35,

                            minFacePresenceConfidence:
                                0.35,

                            minTrackingConfidence:
                                0.35

                        }
                    );


                console.log(
                    "MediaPipe initialized with CPU."
                );

            }


            if (!faceLandmarker) {

                throw new Error(
                    "FaceLandmarker instance was not created."
                );

            }


            mediaPipeReady = true;


            console.log(
                "========================================"
            );

            console.log(
                "MEDIAPIPE READY"
            );

            console.log(
                "Product type:",
                normalizedProductType
            );

            console.log(
                "========================================"
            );


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
       RESIZE CANVAS
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
            640;


        const height =
            tryOnVideo.videoHeight ||
            480;


        currentVideoWidth =
            width;

        currentVideoHeight =
            height;


        tryOnCanvas.width =
            width;

        tryOnCanvas.height =
            height;


        tryOnCanvas.style.transform =
            "none";

        tryOnCanvas.style.webkitTransform =
            "none";


        console.log(
            "Canvas:",
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
            tryOnCanvas.getContext("2d");


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


        const hexMatch =
            text.match(
                /#[0-9a-f]{3,8}/i
            );


        if (hexMatch) {

            return hexMatch[0];

        }


        const rgbMatch =
            text.match(
                /rgb\s*\([^)]+\)/i
            );


        if (rgbMatch) {

            return rgbMatch[0];

        }


        if (
            text.includes("black") ||
            text.includes("jet")
        ) {

            return "#171116";

        }


        if (
            text.includes("burgundy") ||
            text.includes("wine") ||
            text.includes("maroon")
        ) {

            return "#7A1835";

        }


        if (
            text.includes("berry") ||
            text.includes("plum") ||
            text.includes("purple")
        ) {

            return "#8A2859";

        }


        if (
            text.includes("mauve")
        ) {

            return "#9B5A72";

        }


        if (
            text.includes("coral")
        ) {

            return "#E8786D";

        }


        if (
            text.includes("peach")
        ) {

            return "#F2A08C";

        }


        if (
            text.includes("orange")
        ) {

            return "#E8752A";

        }


        if (
            text.includes("brown") ||
            text.includes("chocolate")
        ) {

            return "#6B3928";

        }


        if (
            text.includes("nude") ||
            text.includes("beige")
        ) {

            return "#C78F7A";

        }


        if (
            text.includes("rose")
        ) {

            return "#C95F78";

        }


        if (
            text.includes("pink")
        ) {

            return "#D96A86";

        }


        if (
            text.includes("red") ||
            text.includes("crimson")
        ) {

            return "#C62845";

        }


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
                    .map(
                        char =>
                            char + char
                    )
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
       LIP LANDMARKS

       OUTER LIP CONTOUR
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
        78

    ];


    /* =====================================================
       INNER LIP CONTOUR
       ===================================================== */

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
        308

    ];


    /* =====================================================
       EYE LANDMARKS
       ===================================================== */

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
        398

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
        173

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
            indexes.length < 3
        ) {

            return false;

        }


        const first =
            point(
                landmarks,
                indexes[0],
                width,
                height
            );


        if (!first) {

            return false;

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

        return true;

    }


    /* =====================================================
       LIPSTICK

       IMPORTANT:
       THIS IS THE PART THAT WAS CHANGED TO MAKE THE
       LIPSTICK VISIBLE AGAIN.
       ===================================================== */

    function drawLipstick(
        ctx,
        landmarks,
        width,
        height
    ) {

        const color =
            getProductColor();


        console.log(
            "Drawing lipstick:",
            color
        );


        ctx.save();


        /* -------------------------------------------
           OUTER LIPS
           ------------------------------------------- */

        const outerValid =
            drawPolygon(
                ctx,
                landmarks,
                OUTER_LIPS,
                width,
                height
            );


        if (!outerValid) {

            ctx.restore();

            return;

        }


        ctx.fillStyle =
            hexToRgba(
                color,
                0.78
            );


        ctx.shadowColor =
            hexToRgba(
                color,
                0.20
            );


        ctx.shadowBlur =
            3;


        ctx.fill();


        /* -------------------------------------------
           INNER LIP

           Remove only the inside of the mouth.
           ------------------------------------------- */

        ctx.shadowBlur = 0;

        ctx.globalCompositeOperation =
            "destination-out";


        const innerValid =
            drawPolygon(
                ctx,
                landmarks,
                INNER_LIPS,
                width,
                height
            );


        if (innerValid) {

            ctx.fill();

        }


        ctx.restore();


        /* -------------------------------------------
           SECOND SOFT LAYER

           Adds natural lipstick intensity.
           ------------------------------------------- */

        ctx.save();

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            0.18;


        drawPolygon(
            ctx,
            landmarks,
            OUTER_LIPS,
            width,
            height
        );


        ctx.fillStyle =
            color;


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


        if (points.length < 3) {

            return;

        }


        ctx.save();


        ctx.strokeStyle =
            "#211218";

        ctx.lineWidth =
            3;

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
       CAMERA RENDER LOOP
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
                "2d"
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
           ABSOLUTELY NO MIRRORING
           ------------------------------------------- */

        ctx.setTransform(
            1,
            0,
            0,
            1,
            0,
            0
        );


        tryOnCanvas.style.transform =
            "none";


        /* -------------------------------------------
           CLEAR
           ------------------------------------------- */

        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        /* -------------------------------------------
           CAMERA FRAME
           ------------------------------------------- */

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            1;


        ctx.drawImage(
            tryOnVideo,
            0,
            0,
            width,
            height
        );


        /* -------------------------------------------
           FACE DETECTION
           ------------------------------------------- */

        if (
            mediaPipeReady &&
            faceLandmarker &&
            tryOnVideo.readyState >= 2
        ) {

            try {

                const now =
                    performance.now();


                /*
                 * Prevent duplicate timestamps.
                 */

                if (
                    now <= lastDetectionTime
                ) {

                    animationFrame =
                        requestAnimationFrame(
                            renderCameraFrame
                        );

                    return;

                }


                lastDetectionTime =
                    now;


                const results =
                    faceLandmarker.detectForVideo(
                        tryOnVideo,
                        now
                    );


                if (
                    results &&
                    results.faceLandmarks &&
                    results.faceLandmarks.length > 0
                ) {

                    const landmarks =
                        results.faceLandmarks[0];


                    lastFaceDetected =
                        true;


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

                    lastFaceDetected =
                        false;


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
                    "Face tracking error — check browser console."
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
       IMAGE UPLOAD
       ===================================================== */

    async function handleImageUpload(event) {

        const file =
            event.target.files &&
            event.target.files[0];


        if (!file) {

            return;

        }


        if (
            !file.type.startsWith("image/")
        ) {

            showError(
                "Please select a valid image."
            );

            return;

        }


        clearError();

        stopCamera();


        setStatus(
            "Processing image..."
        );

        showStatus();


        const objectUrl =
            URL.createObjectURL(file);


        try {

            const image =
                new Image();


            image.onload =
                async () => {

                    try {

                        if (!mediaPipeReady) {

                            await loadMediaPipe();

                        }


                        if (tryOnPlaceholder) {

                            tryOnPlaceholder.style.display =
                                "none";

                        }


                        if (tryOnVideo) {

                            tryOnVideo.style.display =
                                "none";

                        }


                        if (tryOnImage) {

                            tryOnImage.src =
                                objectUrl;

                            tryOnImage.style.display =
                                "none";

                            tryOnImage.style.transform =
                                "none";

                        }


                        if (tryOnCanvas) {

                            tryOnCanvas.style.display =
                                "block";

                            tryOnCanvas.style.transform =
                                "none";

                        }


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
                                "Canvas context unavailable."
                            );

                        }


                        ctx.clearRect(
                            0,
                            0,
                            width,
                            height
                        );


                        ctx.drawImage(
                            image,
                            0,
                            0,
                            width,
                            height
                        );


                        /*
                         * Image mode is used only for uploaded
                         * images.
                         */

                        await faceLandmarker.setOptions({
                            runningMode: "IMAGE"
                        });


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


                        /*
                         * Restore VIDEO mode so the camera
                         * works again later.
                         */

                        await faceLandmarker.setOptions({
                            runningMode: "VIDEO"
                        });


                    } catch (error) {

                        console.error(
                            "Image detection failed:",
                            error
                        );


                        showError(
                            "Could not detect a face in this image."
                        );

                    }

                };


            image.onerror =
                () => {

                    showError(
                        "Unable to load the selected image."
                    );

                    URL.revokeObjectURL(
                        objectUrl
                    );

                };


            image.src =
                objectUrl;


        } catch (error) {

            console.error(
                "Image processing failed:",
                error
            );


            URL.revokeObjectURL(
                objectUrl
            );


            showError(
                "Unable to process the selected image."
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

                /*
                 * If MediaPipe was not initialized,
                 * initialize it first.
                 */

                if (!mediaPipeReady) {

                    try {

                        setStatus(
                            "Loading face tracking..."
                        );

                        await loadMediaPipe();

                    } catch (error) {

                        console.error(
                            error
                        );

                        showError(
                            "Face tracking could not be loaded."
                        );

                        return;

                    }

                }


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
       ESCAPE
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
       INITIALIZATION
       ===================================================== */

    resetPreviewOrientation();


    console.log(
        "Glamora AR Product Details initialized."
    );

})();

/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS - VIRTUAL TRY ON

   CAMERA FIRST
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
        body.dataset.productType ||
        body.dataset.product_type ||
        "";

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

    let isTryOnOpen = false;

    let uploadedObjectUrl = null;


    /* =====================================================
       ORIENTATION
       
       IMPORTANT:
       NO CSS MIRRORING.
       NO CANVAS MIRRORING.
       NO TRANSFORM.
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
       
       CAMERA FIRST
       ===================================================== */

    async function openTryOn() {

        console.log(
            "Opening Glamora AR Try-On..."
        );

        clearError();

        resetPreviewOrientation();

        isTryOnOpen = true;

        tryOnModal.classList.add("active");

        tryOnModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "tryon-open"
        );


        /* -----------------------------------------------
           RESET PREVIEW
           ----------------------------------------------- */

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
            "Starting camera..."
        );

        showStatus();


        /* =================================================
           CAMERA FIRST
           ================================================= */

        try {

            await startCamera();

        } catch (cameraError) {

            console.error(
                "Camera startup failed:",
                cameraError
            );

            handleCameraError(
                cameraError
            );

            return;

        }


        /* =================================================
           LOAD MEDIAPIPE AFTER CAMERA
           ================================================= */

        if (!mediaPipeReady) {

            setStatus(
                "Camera active. Loading face tracking..."
            );

            try {

                await loadMediaPipe();

                if (!cameraRunning) {

                    return;

                }

                setStatus(
                    "Face tracking ready. Position your face in the frame."
                );


            } catch (error) {

                console.error(
                    "MediaPipe could not load:",
                    error
                );

                showError(
                    "Camera is working, but face tracking could not be loaded. Check static/mediapipe/vision_bundle.mjs, static/mediapipe/wasm and static/models/face_landmarker.task."
                );

                setStatus(
                    "Camera active — face tracking unavailable."
                );

            }

        }

    }


    /* =====================================================
       CLOSE TRY ON
       ===================================================== */

    function closeTryOn() {

        console.log(
            "Closing Glamora AR Try-On."
        );

        isTryOnOpen = false;

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


        if (uploadedObjectUrl) {

            URL.revokeObjectURL(
                uploadedObjectUrl
            );

            uploadedObjectUrl = null;

        }


        resetPreviewOrientation();

        setStatus(
            "Ready"
        );

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

            throw new Error(
                "Camera API is not supported."
            );

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


        /* =================================================
           CAMERA CONSTRAINTS
           
           IMPORTANT:
           Use a simple constraint first.
           This avoids OverconstrainedError on Linux
           webcams and integrated cameras.
           ================================================= */

        let constraints = {

            audio: false,

            video: {

                facingMode: cameraFacingMode

            }

        };


        try {

            console.log(
                "Requesting camera with:",
                constraints
            );


            mediaStream =
                await navigator.mediaDevices.getUserMedia(
                    constraints
                );


        } catch (firstError) {

            console.warn(
                "Initial camera request failed:",
                firstError
            );


            /*
             * Some webcams have problems with
             * facingMode constraints.
             *
             * Retry with completely generic
             * video constraints.
             */

            if (
                firstError.name ===
                    "OverconstrainedError" ||
                firstError.name ===
                    "NotFoundError"
            ) {

                console.log(
                    "Retrying camera with generic constraints..."
                );


                constraints = {

                    audio: false,

                    video: true

                };


                mediaStream =
                    await navigator.mediaDevices.getUserMedia(
                        constraints
                    );

            } else {

                throw firstError;

            }

        }


        /* =================================================
           VERIFY VIDEO TRACK
           ================================================= */

        const tracks =
            mediaStream.getVideoTracks();


        if (!tracks.length) {

            stopCamera();

            throw new Error(
                "No video track was returned by the camera."
            );

        }


        const videoTrack =
            tracks[0];


        console.log(
            "Camera selected:",
            videoTrack.label
        );


        console.log(
            "Camera settings:",
            videoTrack.getSettings
                ? videoTrack.getSettings()
                : "Unavailable"
        );


        /* =================================================
           TRACK ENDED
           ================================================= */

        videoTrack.addEventListener(
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


        /* =================================================
           VIDEO ELEMENT CONFIGURATION
           ================================================= */

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

        tryOnVideo.setAttribute(
            "muted",
            ""
        );


        /* NO MIRROR */

        tryOnVideo.style.transform =
            "none";

        tryOnVideo.style.webkitTransform =
            "none";


        /* =================================================
           ATTACH STREAM
           ================================================= */

        tryOnVideo.srcObject =
            mediaStream;


        /* =================================================
           SHOW VIDEO IMMEDIATELY
           
           The camera should become visible as soon as
           the stream is available.
           ================================================= */

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

        /*
         * Keep video hidden underneath the canvas.
         * Canvas displays the actual camera frame and
         * makeup overlay.
         */

        tryOnVideo.style.display =
            "block";


        /* =================================================
           WAIT FOR VIDEO METADATA
           ================================================= */

        await waitForVideoReady();


        /* =================================================
           PLAY VIDEO
           ================================================= */

        try {

            await tryOnVideo.play();

        } catch (playError) {

            console.warn(
                "Video play() failed:",
                playError
            );


            /*
             * Try one more time after metadata is ready.
             */

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        100
                    )
            );


            await tryOnVideo.play();

        }


        /* =================================================
           WAIT FOR REAL VIDEO DIMENSIONS
           ================================================= */

        await waitForVideoDimensions();


        console.log(
            "Video dimensions:",
            tryOnVideo.videoWidth,
            "x",
            tryOnVideo.videoHeight
        );


        /* =================================================
           RESIZE CANVAS
           ================================================= */

        resizeCanvas();


        cameraRunning = true;

        lastDetectionTime = 0;

        lastFaceDetected = false;


        setStatus(
            "Camera active. Loading face tracking..."
        );


        /* =================================================
           SHOW CAMERA CONTROLS
           ================================================= */

        if (switchCameraBtn) {

            switchCameraBtn.hidden =
                false;

        }

        if (stopCameraBtn) {

            stopCameraBtn.hidden =
                false;

        }


        /* =================================================
           START RENDER LOOP
           ================================================= */

        if (animationFrame) {

            cancelAnimationFrame(
                animationFrame
            );

            animationFrame = null;

        }


        animationFrame =
            requestAnimationFrame(
                renderCameraFrame
            );


        console.log(
            "Camera started successfully."
        );

    }


    /* =====================================================
       WAIT FOR VIDEO READY
       ===================================================== */

    function waitForVideoReady() {

        return new Promise(
            (resolve, reject) => {

                if (
                    tryOnVideo.readyState >= 2
                ) {

                    resolve();

                    return;

                }


                let finished = false;


                const timeout =
                    setTimeout(
                        () => {

                            if (finished) {

                                return;

                            }

                            finished = true;

                            cleanup();

                            reject(
                                new Error(
                                    "Camera video metadata did not become ready."
                                )
                            );

                        },
                        10000
                    );


                function cleanup() {

                    clearTimeout(
                        timeout
                    );

                    tryOnVideo.removeEventListener(
                        "loadedmetadata",
                        onReady
                    );

                    tryOnVideo.removeEventListener(
                        "canplay",
                        onReady
                    );

                }


                function onReady() {

                    if (finished) {

                        return;

                    }

                    if (
                        tryOnVideo.videoWidth > 0 &&
                        tryOnVideo.videoHeight > 0
                    ) {

                        finished = true;

                        cleanup();

                        resolve();

                    }

                }


                tryOnVideo.addEventListener(
                    "loadedmetadata",
                    onReady
                );

                tryOnVideo.addEventListener(
                    "canplay",
                    onReady
                );


                /*
                 * Safety polling.
                 */

                const check =
                    () => {

                        if (finished) {

                            return;

                        }


                        if (
                            tryOnVideo.videoWidth > 0 &&
                            tryOnVideo.videoHeight > 0
                        ) {

                            finished = true;

                            cleanup();

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
       WAIT FOR VIDEO DIMENSIONS
       ===================================================== */

    function waitForVideoDimensions() {

        return new Promise(
            (resolve, reject) => {

                const start =
                    performance.now();


                function check() {

                    if (
                        tryOnVideo.videoWidth > 0 &&
                        tryOnVideo.videoHeight > 0
                    ) {

                        resolve();

                        return;

                    }


                    if (
                        performance.now() -
                        start >
                        10000
                    ) {

                        reject(
                            new Error(
                                "Camera started but video dimensions are unavailable."
                            )
                        );

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

            showError(
                message
            );

            return;

        }


        console.error(
            "Camera error name:",
            error.name
        );

        console.error(
            "Camera error message:",
            error.message
        );


        switch (error.name) {

            case "NotAllowedError":

            case "PermissionDeniedError":

                message =
                    "Camera permission was denied. Allow camera access for 127.0.0.1:5000 in Chrome and click Use Camera again.";

                break;


            case "NotFoundError":

            case "DevicesNotFoundError":

                message =
                    "No camera was found. Check that your webcam is connected and available to the browser.";

                break;


            case "NotReadableError":

            case "TrackStartError":

                message =
                    "The camera exists but cannot be opened. Close other applications using the camera and try again.";

                break;


            case "OverconstrainedError":

                message =
                    "The selected camera does not support the requested settings. Try switching the camera.";

                break;


            case "SecurityError":

                message =
                    "The browser blocked camera access. Open Glamora AR through localhost or 127.0.0.1.";

                break;


            case "AbortError":

                message =
                    "Camera startup was interrupted. Please try again.";

                break;


            case "TypeError":

                message =
                    "Camera access is unavailable in this browser context.";

                break;


            default:

                message =
                    error.message
                        ? "Camera error: " +
                          error.message
                        : message;

                break;

        }


        showError(
            message
        );


        setStatus(
            "Camera unavailable."
        );

    }


    /* =====================================================
       STOP CAMERA
       ===================================================== */

    function stopCamera() {

        cameraRunning = false;

        lastDetectionTime = 0;

        lastFaceDetected = false;


        if (animationFrame) {

            cancelAnimationFrame(
                animationFrame
            );

            animationFrame = null;

        }


        if (mediaStream) {

            mediaStream
                .getTracks()
                .forEach(
                    track => {

                        try {

                            track.stop();

                        } catch (error) {

                            console.warn(
                                "Unable to stop camera track:",
                                error
                            );

                        }

                    }
                );

            mediaStream = null;

        }


        if (tryOnVideo) {

            try {

                tryOnVideo.pause();

            } catch (error) {

                console.warn(
                    error
                );

            }


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


        console.log(
            "Camera stopped."
        );

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


            /* =================================================
               LOCAL JS MODULE
               ================================================= */

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


            /* =================================================
               LOCAL WASM
               ================================================= */

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


            /* =================================================
               LOCAL MODEL
               ================================================= */

            const modelPath =
                "/static/models/face_landmarker.task";


            console.log(
                "Loading face model:",
                modelPath
            );


            /* =================================================
               GPU
               ================================================= */

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
                    "GPU initialization failed. Falling back to CPU.",
                    gpuError
                );


                /* =================================================
                   CPU FALLBACK
                   ================================================= */

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
            tryOnCanvas.getContext(
                "2d"
            );


        if (!ctx) {

            return;

        }


        ctx.setTransform(
            1,
            0,
            0,
            1,
            0,
            0
        );


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
           REMOVE INNER MOUTH
           ------------------------------------------- */

        ctx.shadowBlur =
            0;

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
           SOFT SECOND LAYER
           ------------------------------------------- */

        ctx.save();

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha =
            0.18;


        const secondLayer =
            drawPolygon(
                ctx,
                landmarks,
                OUTER_LIPS,
                width,
                height
            );


        if (secondLayer) {

            ctx.fillStyle =
                color;

            ctx.fill();

        }


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


        points.forEach(
            p => {

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

            }
        );


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


        /* =================================================
           RESET TRANSFORM
           ================================================= */

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

        tryOnCanvas.style.webkitTransform =
            "none";


        /* =================================================
           CLEAR
           ================================================= */

        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        /* =================================================
           DRAW CAMERA
           
           IMPORTANT:
           Direct drawImage means there is NO MIRROR.
           ================================================= */

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


        /* =================================================
           FACE DETECTION
           ================================================= */

        if (
            mediaPipeReady &&
            faceLandmarker &&
            tryOnVideo.readyState >= 2
        ) {

            try {

                const now =
                    performance.now();


                /*
                 * MediaPipe VIDEO mode requires timestamps
                 * to increase.
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
                    "Face tracking error."
                );

            }

        } else {

            if (cameraRunning) {

                setStatus(
                    "Camera active. Loading face tracking..."
                );

            }

        }


        /* =================================================
           NEXT FRAME
           ================================================= */

        animationFrame =
            requestAnimationFrame(
                renderCameraFrame
            );

    }


    /* =====================================================
       SWITCH CAMERA
       ===================================================== */

    async function switchCamera() {

        if (!isTryOnOpen) {

            return;

        }


        cameraFacingMode =
            cameraFacingMode === "user"
                ? "environment"
                : "user";


        setStatus(
            "Switching camera..."
        );


        try {

            await startCamera();

            /*
             * MediaPipe remains loaded.
             * The render loop automatically resumes.
             */

            if (mediaPipeReady) {

                setStatus(
                    "Face tracking ready. Position your face in the frame."
                );

            }

        } catch (error) {

            console.error(
                "Switch camera failed:",
                error
            );


            handleCameraError(
                error
            );

        }

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


        if (uploadedObjectUrl) {

            URL.revokeObjectURL(
                uploadedObjectUrl
            );

        }


        uploadedObjectUrl =
            URL.createObjectURL(
                file
            );


        const objectUrl =
            uploadedObjectUrl;


        try {

            const image =
                new Image();


            image.onload =
                async () => {

                    try {

                        if (!mediaPipeReady) {

                            await loadMediaPipe();

                        }


                        if (
                            !faceLandmarker
                        ) {

                            throw new Error(
                                "FaceLandmarker unavailable."
                            );

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


                        currentVideoWidth =
                            width;

                        currentVideoHeight =
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


                        ctx.setTransform(
                            1,
                            0,
                            0,
                            1,
                            0,
                            0
                        );


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


                        /* =================================================
                           IMAGE MODE
                           ================================================= */

                        await faceLandmarker.setOptions({

                            runningMode:
                                "IMAGE"

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


                        /* =================================================
                           RESTORE VIDEO MODE
                           ================================================= */

                        await faceLandmarker.setOptions({

                            runningMode:
                                "VIDEO"

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

                };


            image.src =
                objectUrl;


        } catch (error) {

            console.error(
                "Image processing failed:",
                error
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


                if (!isTryOnOpen) {

                    isTryOnOpen = true;

                }


                try {

                    await startCamera();


                    if (!mediaPipeReady) {

                        setStatus(
                            "Camera active. Loading face tracking..."
                        );


                        await loadMediaPipe();

                    }


                    if (mediaPipeReady) {

                        setStatus(
                            "Face tracking ready. Position your face in the frame."
                        );

                    }


                } catch (error) {

                    console.error(
                        "Use Camera failed:",
                        error
                    );


                    handleCameraError(
                        error
                    );

                }

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


                if (tryOnVideo) {

                    tryOnVideo.style.display =
                        "none";

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
       PAGE VISIBILITY
       
       Stop camera when the tab becomes hidden.
       This prevents Linux/browser camera locking.
       ===================================================== */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.hidden &&
                cameraRunning
            ) {

                console.log(
                    "Page hidden — stopping camera."
                );

                stopCamera();

            }

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


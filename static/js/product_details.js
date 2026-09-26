/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS - VIRTUAL TRY ON

   CAMERA FIRST
   LOCAL MEDIAPIPE
   LOCAL WASM
   LOCAL FACE LANDMARK MODEL

   CAMERA FIX:
   - Request permission directly after Try On
   - Use navigator.mediaDevices.getUserMedia()
   - Do not mirror/reverse preview
   - Keep camera stream alive
   ========================================================= */

(() => {
    "use strict";

    console.log("GLAMORA AR — Product Details JS loaded");


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
       CHECK REQUIRED ELEMENTS
       ===================================================== */

    if (!tryOnBtn) {
        console.error("Try On button #tryOnBtn was not found.");
        return;
    }

    if (!tryOnModal) {
        console.error("Try On modal #tryOnModal was not found.");
        return;
    }

    if (!tryOnVideo) {
        console.error("Camera video #tryOnVideo was not found.");
        return;
    }

    if (!tryOnCanvas) {
        console.error("Try On canvas #tryOnCanvas was not found.");
        return;
    }


    /* =====================================================
       PRODUCT DATA
       ===================================================== */

    const pageBody = document.body;

    const productName =
        pageBody.dataset.productName ||
        "Glamora Beauty Product";

    const productType =
        pageBody.dataset.productType ||
        "lipstick";

    const productShade =
        pageBody.dataset.productShade ||
        "";

    const productColor =
        pageBody.dataset.productColor ||
        "";


    console.log("Product:", {
        name: productName,
        type: productType,
        shade: productShade,
        color: productColor
    });


    /* =====================================================
       NORMALIZE PRODUCT TYPE
       ===================================================== */

    function normalizeProductType(type) {

        const value = String(type || "")
            .trim()
            .toLowerCase()
            .replace(/[\s_-]+/g, "");

        if (value.includes("lip")) {
            return "lipstick";
        }

        if (value.includes("eye") && value.includes("shadow")) {
            return "eyeshadow";
        }

        if (value === "shadow") {
            return "eyeshadow";
        }

        if (value.includes("liner")) {
            return "eyeliner";
        }

        if (value.includes("mascara")) {
            return "mascara";
        }

        if (value.includes("blush")) {
            return "blush";
        }

        if (value.includes("foundation")) {
            return "foundation";
        }

        if (
            value.includes("highlight") ||
            value.includes("highlighter")
        ) {
            return "highlighter";
        }

        return "lipstick";
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

    let cameraStartAttempts = 0;

    let currentVideoWidth = 640;
    let currentVideoHeight = 480;


    /* =====================================================
       STATUS HELPERS
       ===================================================== */

    function setStatus(message) {

        if (tryOnStatusText) {
            tryOnStatusText.textContent = message;
        }

        if (tryOnStatus) {
            tryOnStatus.classList.remove("hidden");
            tryOnStatus.classList.add("show");
        }
    }


    function clearStatus() {

        if (tryOnStatus) {
            tryOnStatus.classList.remove("show");
            tryOnStatus.classList.add("hidden");
        }
    }


    function showError(message) {

        console.error(message);

        if (tryOnError) {
            tryOnError.textContent = message;
            tryOnError.classList.add("show");
        }
    }


    function clearError() {

        if (tryOnError) {
            tryOnError.textContent = "";
            tryOnError.classList.remove("show");
        }
    }


    /* =====================================================
       PREVIEW ORIENTATION

       IMPORTANT:
       Do NOT mirror the camera.

       The previous code used:
           scale(-1, 1)

       which caused the preview to appear reversed.
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
    }


    /* =====================================================
       OPEN TRY ON
       ===================================================== */

    async function openTryOn() {

        console.log("Try On clicked.");

        clearError();
        clearStatus();

        resetPreviewOrientation();

        tryOnModal.classList.add("open");
        tryOnModal.classList.add("show");

        tryOnModal.style.display = "flex";

        setStatus("Requesting camera permission...");

        /*
         * IMPORTANT:
         * Camera permission is requested immediately here.
         */
        await startCamera();
    }


    /* =====================================================
       CLOSE TRY ON
       ===================================================== */

    function closeTryOn() {

        console.log("Closing Try On.");

        stopCamera();

        clearError();
        clearStatus();

        if (tryOnModal) {
            tryOnModal.classList.remove("open");
            tryOnModal.classList.remove("show");
            tryOnModal.style.display = "";
        }

        if (tryOnImage) {
            tryOnImage.removeAttribute("src");
            tryOnImage.style.display = "none";
        }

        clearCanvas();
    }


    /* =====================================================
       CAMERA SUPPORT CHECK
       ===================================================== */

    function checkCameraSupport() {

        if (!window.isSecureContext) {

            showError(
                "Camera access requires HTTPS or localhost. " +
                "Please open Glamora AR through http://127.0.0.1:5000."
            );

            return false;
        }

        if (!navigator.mediaDevices) {

            showError(
                "Your browser does not provide camera access."
            );

            return false;
        }

        if (
            typeof navigator.mediaDevices.getUserMedia !==
            "function"
        ) {

            showError(
                "Camera access is not supported by this browser."
            );

            return false;
        }

        return true;
    }


    /* =====================================================
       START CAMERA
       ===================================================== */

    async function startCamera() {

        console.log("Starting camera...");

        clearError();

        resetPreviewOrientation();

        if (!checkCameraSupport()) {
            return false;
        }

        /*
         * Stop an existing stream first.
         */
        if (mediaStream) {
            stopCamera();
        }

        cameraStartAttempts++;

        console.log(
            "Camera start attempt:",
            cameraStartAttempts
        );


        /* =================================================
           REQUEST CAMERA PERMISSION
           ================================================= */

        setStatus("Requesting camera permission...");

        let stream = null;

        try {

            /*
             * Keep this simple and reliable.

             * Do NOT use:
             *   facingMode: exact
             *   deviceId
             *   advanced constraints

             * until the basic camera works.
             */
            stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: true
                });

        } catch (error) {

            console.error(
                "getUserMedia failed:",
                error
            );

            handleCameraError(error);

            return false;
        }


        /* =================================================
           VERIFY STREAM
           ================================================= */

        if (!stream) {

            showError(
                "The browser did not return a camera stream."
            );

            return false;
        }

        const tracks = stream.getVideoTracks();

        if (!tracks || tracks.length === 0) {

            showError(
                "No video track was returned by the camera."
            );

            stream.getTracks().forEach(track => {
                track.stop();
            });

            return false;
        }


        console.log(
            "Camera track:",
            tracks[0].label
        );


        mediaStream = stream;


        /* =================================================
           TRACK END HANDLER
           ================================================= */

        tracks.forEach(track => {

            track.addEventListener(
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

        });


        /* =================================================
           CONFIGURE VIDEO
           ================================================= */

        tryOnVideo.autoplay = true;
        tryOnVideo.muted = true;
        tryOnVideo.playsInline = true;

        tryOnVideo.setAttribute(
            "autoplay",
            ""
        );

        tryOnVideo.setAttribute(
            "muted",
            ""
        );

        tryOnVideo.setAttribute(
            "playsinline",
            ""
        );

        /*
         * Remove any old mirroring.
         */
        resetPreviewOrientation();


        /* =================================================
           ATTACH CAMERA STREAM
           ================================================= */

        tryOnVideo.srcObject = mediaStream;

        console.log(
            "Camera stream attached to video."
        );


        /* =================================================
           SHOW CAMERA AREA
           ================================================= */

        if (tryOnPlaceholder) {
            tryOnPlaceholder.style.display = "none";
        }

        if (tryOnImage) {
            tryOnImage.style.display = "none";
        }

        if (tryOnVideo) {
            tryOnVideo.style.display = "block";
            tryOnVideo.classList.add("show");
        }

        if (tryOnCanvas) {
            tryOnCanvas.style.display = "block";
            tryOnCanvas.classList.add("show");
        }


        /* =================================================
           PLAY VIDEO
           ================================================= */

        setStatus("Opening camera...");

        try {

            await tryOnVideo.play();

            console.log(
                "Camera video.play() succeeded."
            );

        } catch (playError) {

            console.warn(
                "Initial video.play() failed:",
                playError
            );

            /*
             * Try once more after the video has loaded.
             */
            await new Promise(resolve => {

                const timeout =
                    setTimeout(resolve, 1500);

                tryOnVideo.addEventListener(
                    "loadedmetadata",
                    () => {

                        clearTimeout(timeout);

                        resolve();

                    },
                    {
                        once: true
                    }
                );

            });

            try {

                await tryOnVideo.play();

            } catch (secondPlayError) {

                console.error(
                    "Second video.play() failed:",
                    secondPlayError
                );

                showError(
                    "Camera permission was granted, but the camera preview could not start."
                );

                stopCamera();

                return false;
            }
        }


        /* =================================================
           WAIT FOR VIDEO DIMENSIONS
           ================================================= */

        const dimensionsReady =
            await waitForVideoDimensions();

        if (!dimensionsReady) {

            showError(
                "Camera opened, but the video dimensions are unavailable."
            );

            stopCamera();

            return false;
        }


        /* =================================================
           CANVAS SIZE
           ================================================= */

        resizeCanvas();


        /* =================================================
           CAMERA READY
           ================================================= */

        cameraRunning = true;

        cameraStartAttempts = 0;

        if (startCameraBtn) {
            startCameraBtn.style.display = "none";
        }

        if (switchCameraBtn) {
            switchCameraBtn.style.display = "inline-flex";
        }

        if (stopCameraBtn) {
            stopCameraBtn.style.display = "inline-flex";
        }

        setStatus("Camera ready. Looking for your face...");

        console.log(
            "Camera is now running."
        );


        /* =================================================
           START RENDER LOOP
           ================================================= */

        if (animationFrame) {
            cancelAnimationFrame(
                animationFrame
            );
        }

        renderCameraFrame();


        /* =================================================
           LOAD MEDIAPIPE IN BACKGROUND
           ================================================= */

        if (!mediaPipeReady && !mediaPipeLoading) {

            loadMediaPipe()
                .then(() => {

                    if (cameraRunning) {

                        setStatus(
                            "Camera ready. Looking for your face..."
                        );

                    }

                })
                .catch(error => {

                    console.error(
                        "MediaPipe loading failed:",
                        error
                    );

                });
        }

        return true;
    }


    /* =====================================================
       WAIT FOR VIDEO DIMENSIONS
       ===================================================== */

    function waitForVideoDimensions() {

        return new Promise(resolve => {

            const start =
                performance.now();

            function check() {

                if (
                    tryOnVideo.videoWidth > 0 &&
                    tryOnVideo.videoHeight > 0
                ) {

                    currentVideoWidth =
                        tryOnVideo.videoWidth;

                    currentVideoHeight =
                        tryOnVideo.videoHeight;

                    console.log(
                        "Video dimensions:",
                        currentVideoWidth,
                        "x",
                        currentVideoHeight
                    );

                    resolve(true);

                    return;
                }

                if (
                    performance.now() - start >
                    5000
                ) {

                    resolve(false);

                    return;
                }

                requestAnimationFrame(check);
            }

            check();

        });
    }


    /* =====================================================
       CAMERA ERROR HANDLING
       ===================================================== */

    function handleCameraError(error) {

        let message =
            "Unable to access the camera.";

        if (!error) {

            showError(message);

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
                    "Camera permission was denied. " +
                    "Allow camera access for Glamora AR in Chrome site settings, then click Try On again.";

                break;


            case "NotFoundError":

            case "DevicesNotFoundError":

                message =
                    "No camera was found on this device.";

                break;


            case "NotReadableError":

            case "TrackStartError":

                message =
                    "The camera is already being used by another application. " +
                    "Close other camera apps or browser tabs and try again.";

                break;


            case "OverconstrainedError":

                message =
                    "The requested camera settings are not available.";

                break;


            case "SecurityError":

                message =
                    "The browser blocked camera access for security reasons.";

                break;


            case "AbortError":

                message =
                    "Camera startup was interrupted. Please click Try On again.";

                break;


            default:

                message =
                    "Camera could not be opened: " +
                    (error.message || error.name);

                break;
        }

        showError(message);

        setStatus("Camera unavailable.");
    }


    /* =====================================================
       STOP CAMERA
       ===================================================== */

    function stopCamera() {

        console.log("Stopping camera...");

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


        try {

            tryOnVideo.pause();

        } catch (error) {
            console.warn(error);
        }


        tryOnVideo.srcObject = null;


        if (startCameraBtn) {
            startCameraBtn.style.display =
                "inline-flex";
        }

        if (switchCameraBtn) {
            switchCameraBtn.style.display =
                "none";
        }

        if (stopCameraBtn) {
            stopCameraBtn.style.display =
                "none";
        }


        console.log("Camera stopped.");
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

                await new Promise(resolve =>
                    setTimeout(resolve, 100)
                );

            }

            return faceLandmarker;
        }


        mediaPipeLoading = true;

        console.log(
            "Loading local MediaPipe..."
        );


        try {

            setStatus(
                "Loading face tracking..."
            );


            const module =
                await import(
                    "/static/mediapipe/vision_bundle.mjs"
                );


            const FaceLandmarker =
                module.FaceLandmarker;

            const FilesetResolver =
                module.FilesetResolver;


            if (
                !FaceLandmarker ||
                !FilesetResolver
            ) {

                throw new Error(
                    "FaceLandmarker or FilesetResolver is missing from vision_bundle.mjs"
                );
            }


            const vision =
                await FilesetResolver.forVisionTasks(
                    "/static/mediapipe/wasm"
                );


            const modelPath =
                "/static/models/face_landmarker.task";


            try {

                console.log(
                    "Creating GPU face landmarker..."
                );

                faceLandmarker =
                    await FaceLandmarker.createFromOptions(
                        vision,
                        {
                            baseOptions: {
                                modelAssetPath:
                                    modelPath,
                                delegate: "GPU"
                            },

                            runningMode: "VIDEO",

                            numFaces: 1,

                            minFaceDetectionConfidence:
                                0.45,

                            minFacePresenceConfidence:
                                0.45,

                            minTrackingConfidence:
                                0.45
                        }
                    );

            } catch (gpuError) {

                console.warn(
                    "GPU initialization failed. Trying CPU.",
                    gpuError
                );


                faceLandmarker =
                    await FaceLandmarker.createFromOptions(
                        vision,
                        {
                            baseOptions: {
                                modelAssetPath:
                                    modelPath,
                                delegate: "CPU"
                            },

                            runningMode: "VIDEO",

                            numFaces: 1,

                            minFaceDetectionConfidence:
                                0.45,

                            minFacePresenceConfidence:
                                0.45,

                            minTrackingConfidence:
                                0.45
                        }
                    );
            }


            mediaPipeReady = true;

            console.log(
                "Local MediaPipe loaded successfully."
            );


            if (cameraRunning) {

                setStatus(
                    "Face tracking ready."
                );
            }


            return faceLandmarker;

        } catch (error) {

            console.error(
                "MediaPipe initialization failed:",
                error
            );


            mediaPipeReady = false;


            showError(
                "Face tracking failed. " +
                (error.message || error)
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
            !tryOnVideo ||
            !tryOnCanvas
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


        currentVideoWidth = width;
        currentVideoHeight = height;


        tryOnCanvas.width = width;
        tryOnCanvas.height = height;


        /*
         * IMPORTANT:
         * Never mirror the canvas.
         */
        tryOnCanvas.style.transform = "none";
        tryOnCanvas.style.webkitTransform = "none";


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

        const p =
            landmarks[index];

        if (!p) {
            return null;
        }

        return {
            x: p.x * width,
            y: p.y * height
        };
    }


    /* =====================================================
       PRODUCT COLOR
       ===================================================== */

    function getProductColor() {

        const source =
            (
                productColor ||
                productShade ||
                ""
            )
            .toLowerCase()
            .trim();


        if (!source) {
            return "#c85f7a";
        }


        if (
            source.startsWith("#")
        ) {
            return source;
        }


        if (
            source.startsWith("rgb")
        ) {
            return source;
        }


        const colors = {

            black: "#241b1d",

            burgundy: "#800020",
            wine: "#722f37",

            berry: "#7d2148",
            plum: "#6d1f4a",

            mauve: "#9b5c6c",

            coral: "#f88379",
            peach: "#ffb07c",
            orange: "#e96f3d",

            brown: "#7a4636",
            chocolate: "#4a2921",

            nude: "#c98d78",
            beige: "#c9a38f",

            rose: "#c95c78",
            pink: "#e889a3",

            red: "#c6283e"
        };


        for (const key in colors) {

            if (source.includes(key)) {
                return colors[key];
            }
        }


        return "#c85f7a";
    }


    /* =====================================================
       HEX TO RGBA
       ===================================================== */

    function hexToRgba(
        hex,
        alpha
    ) {

        let value =
            String(hex)
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
            parseInt(value, 16);


        if (
            Number.isNaN(number)
        ) {
            return `rgba(200,95,122,${alpha})`;
        }


        const r =
            (number >> 16) & 255;

        const g =
            (number >> 8) & 255;

        const b =
            number & 255;


        return `rgba(${r},${g},${b},${alpha})`;
    }


    /* =====================================================
       LANDMARK ARRAYS
       ===================================================== */

    const OUTER_LIPS = [
        61, 146, 91, 181, 84,
        17, 314, 405, 321,
        375, 291, 308, 324,
        318, 402, 317, 14,
        87, 178, 88, 95
    ];


    const INNER_LIPS = [
        78, 95, 88, 178,
        87, 14, 317, 402,
        318, 324, 308, 415,
        310, 311, 312, 13,
        82, 81, 80, 191
    ];


    const LEFT_EYE = [
        33, 7, 163, 144,
        145, 153, 154, 155,
        133, 173, 157, 158,
        159, 160, 161, 246
    ];


    const RIGHT_EYE = [
        263, 249, 390, 373,
        374, 380, 381, 382,
        362, 398, 384, 385,
        386, 387, 388, 466
    ];


    /* =====================================================
       DRAW POLYGON
       ===================================================== */

    function drawPolygon(
        ctx,
        landmarks,
        indices,
        width,
        height
    ) {

        if (!indices.length) {
            return;
        }


        ctx.beginPath();


        let firstPoint = null;


        indices.forEach(
            (index, i) => {

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


                if (i === 0) {

                    firstPoint = p;

                    ctx.moveTo(
                        p.x,
                        p.y
                    );

                } else {

                    ctx.lineTo(
                        p.x,
                        p.y
                    );
                }

            }
        );


        if (firstPoint) {

            ctx.closePath();
        }
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


        ctx.fill();


        /*
         * Remove inner lip region.
         */
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
        width,
        height
    ) {

        const color =
            getProductColor();


        function drawEye(indices) {

            const points =
                indices
                    .map(index =>
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


            let minX = Infinity;
            let maxX = -Infinity;

            let minY = Infinity;
            let maxY = -Infinity;


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
                    15,
                    (maxX - minX) * 0.8
                );


            const radiusY =
                Math.max(
                    10,
                    (maxY - minY) * 1.5
                );


            const gradient =
                ctx.createRadialGradient(
                    centerX,
                    centerY,
                    1,
                    centerX,
                    centerY,
                    radiusX
                );


            gradient.addColorStop(
                0,
                hexToRgba(
                    color,
                    0.45
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
        }


        ctx.save();

        drawEye(LEFT_EYE);
        drawEye(RIGHT_EYE);

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

        const color =
            getProductColor();


        function drawLine(indices) {

            const points =
                indices
                    .map(index =>
                        point(
                            landmarks,
                            index,
                            width,
                            height
                        )
                    )
                    .filter(Boolean);


            if (points.length < 2) {
                return;
            }


            ctx.beginPath();


            points.forEach(
                (p, index) => {

                    if (index === 0) {

                        ctx.moveTo(
                            p.x,
                            p.y
                        );

                    } else {

                        ctx.lineTo(
                            p.x,
                            p.y
                        );
                    }
                }
            );


            ctx.strokeStyle =
                color;

            ctx.lineWidth =
                Math.max(
                    2,
                    width / 350
                );

            ctx.lineCap =
                "round";

            ctx.lineJoin =
                "round";

            ctx.stroke();
        }


        ctx.save();

        drawLine(LEFT_EYE);
        drawLine(RIGHT_EYE);

        ctx.restore();
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


        function cheek(
            landmarkIndex
        ) {

            const p =
                point(
                    landmarks,
                    landmarkIndex,
                    width,
                    height
                );


            if (!p) {
                return;
            }


            const radius =
                Math.max(
                    25,
                    width * 0.07
                );


            const gradient =
                ctx.createRadialGradient(
                    p.x,
                    p.y,
                    1,
                    p.x,
                    p.y,
                    radius
                );


            gradient.addColorStop(
                0,
                hexToRgba(
                    color,
                    0.38
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
                p.x,
                p.y,
                radius,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }


        ctx.save();

        cheek(50);
        cheek(280);

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

        const color =
            "#fff4f6";


        const indices = [
            1,
            116,
            345
        ];


        ctx.save();


        indices.forEach(
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


                const radius =
                    Math.max(
                        10,
                        width * 0.025
                    );


                const gradient =
                    ctx.createRadialGradient(
                        p.x,
                        p.y,
                        0,
                        p.x,
                        p.y,
                        radius
                    );


                gradient.addColorStop(
                    0,
                    "rgba(255,255,255,0.55)"
                );


                gradient.addColorStop(
                    1,
                    "rgba(255,255,255,0)"
                );


                ctx.fillStyle =
                    gradient;


                ctx.beginPath();

                ctx.arc(
                    p.x,
                    p.y,
                    radius,
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

        const color =
            getProductColor();


        const p =
            point(
                landmarks,
                1,
                width,
                height
            );


        if (!p) {
            return;
        }


        const radius =
            Math.max(
                70,
                width * 0.16
            );


        const gradient =
            ctx.createRadialGradient(
                p.x,
                p.y,
                radius * 0.1,
                p.x,
                p.y,
                radius
            );


        gradient.addColorStop(
            0,
            hexToRgba(
                color,
                0.13
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
            p.x,
            p.y,
            radius,
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

                drawEyeShadow(
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

                drawEyeliner(
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

                drawLipstick(
                    ctx,
                    landmarks,
                    width,
                    height
                );

                break;
        }
    }


    /* =====================================================
       RENDER CAMERA FRAME
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
                    willReadFrequently: false
                }
            );


        if (!ctx) {

            animationFrame =
                requestAnimationFrame(
                    renderCameraFrame
                );

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


        if (
            tryOnCanvas.width !== width ||
            tryOnCanvas.height !== height
        ) {

            resizeCanvas();
        }


        /*
         * IMPORTANT:
         *
         * There is NO:
         *
         * ctx.translate(width, 0)
         * ctx.scale(-1, 1)
         *
         * here.
         *
         * This keeps the camera normal
         * and prevents a reversed image.
         */

        ctx.clearRect(
            0,
            0,
            width,
            height
        );


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

        if (faceLandmarker) {

            try {

                const result =
                    faceLandmarker.detectForVideo(
                        tryOnVideo,
                        performance.now()
                    );


                if (
                    result &&
                    result.faceLandmarks &&
                    result.faceLandmarks.length > 0
                ) {

                    const landmarks =
                        result.faceLandmarks[0];


                    /*
                     * Draw directly in the same
                     * coordinate system as the
                     * unmirrored camera frame.
                     */
                    drawMakeup(
                        ctx,
                        landmarks,
                        width,
                        height
                    );


                    clearStatus();

                } else {

                    setStatus(
                        "No face detected. Look directly at the camera."
                    );
                }

            } catch (error) {

                console.error(
                    "Face detection error:",
                    error
                );
            }

        } else {

            setStatus(
                "Loading face tracking..."
            );
        }


        animationFrame =
            requestAnimationFrame(
                renderCameraFrame
            );
    }


    /* =====================================================
       SWITCH CAMERA
       ===================================================== */

    async function switchCamera() {

        console.log(
            "Switch camera clicked."
        );

        /*
         * Toggle state.
         */
        cameraFacingMode =
            cameraFacingMode === "user"
                ? "environment"
                : "user";


        /*
         * Restart camera.
         */
        stopCamera();

        await startCamera();
    }


    /* =====================================================
       IMAGE UPLOAD
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
            !file.type.startsWith("image/")
        ) {

            showError(
                "Please select an image file."
            );

            return;
        }


        stopCamera();

        clearError();

        setStatus(
            "Loading image..."
        );


        const image =
            new Image();


        image.onload =
            async () => {

                try {

                    if (!mediaPipeReady) {
                        await loadMediaPipe();
                    }


                    /*
                     * IMAGE mode.
                     */
                    await faceLandmarker.setOptions({
                        runningMode: "IMAGE"
                    });


                    tryOnCanvas.width =
                        image.naturalWidth;

                    tryOnCanvas.height =
                        image.naturalHeight;


                    const ctx =
                        tryOnCanvas.getContext(
                            "2d"
                        );


                    ctx.clearRect(
                        0,
                        0,
                        tryOnCanvas.width,
                        tryOnCanvas.height
                    );


                    ctx.drawImage(
                        image,
                        0,
                        0,
                        image.naturalWidth,
                        image.naturalHeight
                    );


                    if (tryOnImage) {

                        tryOnImage.src =
                            image.src;

                        tryOnImage.style.display =
                            "none";
                    }


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
                            image.naturalWidth,
                            image.naturalHeight
                        );


                        clearStatus();

                    } else {

                        setStatus(
                            "No face detected in this image."
                        );
                    }


                    /*
                     * Return MediaPipe to VIDEO mode.
                     */
                    await faceLandmarker.setOptions({
                        runningMode: "VIDEO"
                    });


                    console.log(
                        "Image try-on complete."
                    );

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

                showError(
                    "Unable to load the selected image."
                );
            };


        image.src =
            URL.createObjectURL(file);
    }


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

    tryOnBtn.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            await openTryOn();
        }
    );


    if (tryOnClose) {

        tryOnClose.addEventListener(
            "click",
            event => {

                event.preventDefault();

                closeTryOn();
            }
        );
    }


    if (startCameraBtn) {

        startCameraBtn.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                await startCamera();
            }
        );
    }


    if (stopCameraBtn) {

        stopCameraBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                stopCamera();
            }
        );
    }


    if (switchCameraBtn) {

        switchCameraBtn.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                await switchCamera();
            }
        );
    }


    if (uploadImageBtn) {

        uploadImageBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

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
                (
                    tryOnModal.classList.contains("open") ||
                    tryOnModal.classList.contains("show")
                )
            ) {

                closeTryOn();
            }
        }
    );


    /* =====================================================
       PAGE EXIT
       ===================================================== */

    window.addEventListener(
        "beforeunload",
        () => {

            stopCamera();
        }
    );


    /* =====================================================
       INITIAL ORIENTATION
       ===================================================== */

    resetPreviewOrientation();


    console.log(
        "GLAMORA AR — Try-On initialized successfully."
    );

})();
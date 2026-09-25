/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS - VIRTUAL TRY ON
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       DOM
       ===================================================== */

    const body = document.body;

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
       PRODUCT DATA
       ===================================================== */

    const productType =
        body?.dataset?.productType ||
        body?.dataset?.product_type ||
        "";

    const productName =
        body?.dataset?.productName ||
        "Makeup Product";

    const productShade =
        body?.dataset?.productShade ||
        "";

    const productColor =
        body?.dataset?.productColor ||
        "";


    /* =====================================================
       STATE
       ===================================================== */

    let faceLandmarker = null;
    let mediaStream = null;

    let animationFrame = null;

    let cameraFacingMode = "user";

    let cameraRunning = false;
    let imageMode = false;

    let mediaPipeLoading = false;
    let mediaPipeReady = false;


    /* =====================================================
       HELPERS
       ===================================================== */

    function normalizeProductType(value) {
        const text = String(value || "")
            .toLowerCase()
            .trim();

        if (
            text.includes("lipstick") ||
            text.includes("lip")
        ) {
            return "lipstick";
        }

        if (
            text.includes("eyeshadow") ||
            text.includes("eye shadow") ||
            text.includes("shadow")
        ) {
            return "eyeshadow";
        }

        if (
            text.includes("eyeliner") ||
            text.includes("eye liner")
        ) {
            return "eyeliner";
        }

        if (
            text.includes("blush") ||
            text.includes("rouge")
        ) {
            return "blush";
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


    const normalizedType = normalizeProductType(productType);


    function setStatus(message) {
        if (tryOnStatusText) {
            tryOnStatusText.textContent = message;
        }

        if (tryOnStatus) {
            tryOnStatus.classList.add("show");
        }
    }


    function clearStatus() {
        if (tryOnStatus) {
            tryOnStatus.classList.remove("show");
        }
    }


    function showError(message) {
        console.error("[Glamora AR]", message);

        if (tryOnError) {
            tryOnError.textContent = message;
            tryOnError.classList.add("show");
        }

        setStatus(message);
    }


    function clearError() {
        if (tryOnError) {
            tryOnError.textContent = "";
            tryOnError.classList.remove("show");
        }
    }


    function clearCanvas() {
        if (!tryOnCanvas) {
            return;
        }

        const ctx = tryOnCanvas.getContext("2d");

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


    function resizeCanvas(width, height) {
        if (!tryOnCanvas) {
            return;
        }

        if (!width || !height) {
            return;
        }

        tryOnCanvas.width = width;
        tryOnCanvas.height = height;
    }


    function hexToRgba(hex, alpha = 1) {
        let value = String(hex || "")
            .replace("#", "")
            .trim();

        if (value.length === 3) {
            value = value
                .split("")
                .map(char => char + char)
                .join("");
        }

        if (value.length !== 6) {
            return `rgba(200,95,122,${alpha})`;
        }

        const number = parseInt(value, 16);

        const r = (number >> 16) & 255;
        const g = (number >> 8) & 255;
        const b = number & 255;

        return `rgba(${r},${g},${b},${alpha})`;
    }


    function getProductColor() {

        const value =
            productColor ||
            productShade ||
            "";

        const text = String(value).toLowerCase().trim();

        /* HEX */

        if (/^#[0-9a-f]{3,8}$/i.test(text)) {
            return text;
        }

        /* RGB */

        if (
            text.startsWith("rgb(") ||
            text.startsWith("rgba(")
        ) {
            return text;
        }

        /* COLOR NAMES */

        if (
            text.includes("black") ||
            text.includes("jet")
        ) {
            return "#1b1014";
        }

        if (
            text.includes("burgundy") ||
            text.includes("wine")
        ) {
            return "#72213a";
        }

        if (
            text.includes("berry") ||
            text.includes("plum")
        ) {
            return "#843653";
        }

        if (
            text.includes("mauve")
        ) {
            return "#9b5a70";
        }

        if (
            text.includes("coral")
        ) {
            return "#e66f67";
        }

        if (
            text.includes("peach")
        ) {
            return "#ef9b84";
        }

        if (
            text.includes("orange")
        ) {
            return "#e87535";
        }

        if (
            text.includes("brown") ||
            text.includes("chocolate")
        ) {
            return "#713d2d";
        }

        if (
            text.includes("nude") ||
            text.includes("beige")
        ) {
            return "#c8957d";
        }

        if (
            text.includes("rose")
        ) {
            return "#c96782";
        }

        if (
            text.includes("pink")
        ) {
            return "#d96f91";
        }

        if (
            text.includes("red")
        ) {
            return "#b92f48";
        }

        return "#c85f7a";
    }


    /* =====================================================
       MEDIAPIPE
       ===================================================== */

    async function loadMediaPipe() {

        if (mediaPipeReady && faceLandmarker) {
            return true;
        }

        if (mediaPipeLoading) {

            while (mediaPipeLoading) {
                await new Promise(resolve =>
                    setTimeout(resolve, 100)
                );
            }

            return mediaPipeReady;
        }

        mediaPipeLoading = true;

        try {

            setStatus("Loading face tracking...");

            /*
             * IMPORTANT:
             * MediaPipe is dynamically imported.
             *
             * This prevents MediaPipe loading errors from
             * stopping the Try On button itself.
             */

            const module = await import(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs"
            );

            const FaceLandmarker = module.FaceLandmarker;
            const FilesetResolver = module.FilesetResolver;

            if (!FaceLandmarker || !FilesetResolver) {
                throw new Error(
                    "MediaPipe Face Landmarker could not be loaded."
                );
            }

            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
            );

            const modelUrl =
                "https://storage.googleapis.com/mediapipe-models/" +
                "face_landmarker/face_landmarker/float16/1/" +
                "face_landmarker.task";

            try {

                faceLandmarker =
                    await FaceLandmarker.createFromOptions(
                        vision,
                        {
                            baseOptions: {
                                modelAssetPath: modelUrl,
                                delegate: "GPU"
                            },

                            runningMode: "VIDEO",

                            numFaces: 1,

                            minFaceDetectionConfidence: 0.45,
                            minFacePresenceConfidence: 0.45,
                            minTrackingConfidence: 0.45,

                            outputFaceBlendshapes: false,
                            outputFacialTransformationMatrixes: false
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
                                modelAssetPath: modelUrl,
                                delegate: "CPU"
                            },

                            runningMode: "VIDEO",

                            numFaces: 1,

                            minFaceDetectionConfidence: 0.45,
                            minFacePresenceConfidence: 0.45,
                            minTrackingConfidence: 0.45,

                            outputFaceBlendshapes: false,
                            outputFacialTransformationMatrixes: false
                        }
                    );
            }

            mediaPipeReady = true;

            clearStatus();

            console.log(
                "[Glamora AR] MediaPipe loaded successfully."
            );

            return true;

        } catch (error) {

            console.error(
                "[Glamora AR] MediaPipe error:",
                error
            );

            mediaPipeReady = false;

            showError(
                "Face tracking could not be loaded. " +
                "Check your internet connection and browser console."
            );

            return false;

        } finally {

            mediaPipeLoading = false;
        }
    }


    /* =====================================================
       LANDMARKS
       ===================================================== */

    const OUTER_LIPS = [
        61, 146, 91, 181, 84,
        17, 314, 405, 321, 375,
        291, 409, 270, 269, 267,
        0, 37, 39, 40, 185
    ];


    const INNER_LIPS = [
        78, 95, 88, 178, 87,
        14, 317, 402, 318, 324,
        308, 415, 310, 311, 312,
        13, 82, 81, 42, 183
    ];


    const LEFT_EYE = [
        33, 7, 163, 144, 145,
        153, 154, 155, 133, 173,
        157, 158, 159, 160, 161,
        246
    ];


    const RIGHT_EYE = [
        362, 382, 381, 380, 374,
        373, 390, 249, 263, 466,
        388, 387, 386, 385, 384,
        398
    ];


    const LEFT_EYELINER = [
        33, 246, 161, 160, 159,
        158, 157, 173, 133
    ];


    const RIGHT_EYELINER = [
        362, 398, 384, 385, 386,
        387, 388, 466, 263
    ];


    function point(landmarks, index, width, height) {

        const p = landmarks[index];

        return {
            x: p.x * width,
            y: p.y * height,
            z: p.z || 0
        };
    }


    function pathFromLandmarks(
        ctx,
        landmarks,
        indexes,
        width,
        height
    ) {

        if (!indexes.length) {
            return;
        }

        const first =
            point(
                landmarks,
                indexes[0],
                width,
                height
            );

        ctx.beginPath();

        ctx.moveTo(
            first.x,
            first.y
        );

        for (let i = 1; i < indexes.length; i++) {

            const p =
                point(
                    landmarks,
                    indexes[i],
                    width,
                    height
                );

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

    function drawLipstick(ctx, landmarks, width, height) {

        const color = getProductColor();

        ctx.save();

        pathFromLandmarks(
            ctx,
            landmarks,
            OUTER_LIPS,
            width,
            height
        );

        ctx.fillStyle =
            hexToRgba(color, 0.62);

        ctx.fill();

        /* Remove inner lip area */

        ctx.save();

        ctx.globalCompositeOperation =
            "destination-out";

        pathFromLandmarks(
            ctx,
            landmarks,
            INNER_LIPS,
            width,
            height
        );

        ctx.fill();

        ctx.restore();

        /* Lip outline */

        pathFromLandmarks(
            ctx,
            landmarks,
            OUTER_LIPS,
            width,
            height
        );

        ctx.strokeStyle =
            hexToRgba(color, 0.85);

        ctx.lineWidth =
            Math.max(1.5, width * 0.002);

        ctx.stroke();

        ctx.restore();
    }


    /* =====================================================
       EYESHADOW
       ===================================================== */

    function drawEyeShadowOnEye(
        ctx,
        landmarks,
        indexes,
        width,
        height,
        color
    ) {

        const points =
            indexes.map(index =>
                point(
                    landmarks,
                    index,
                    width,
                    height
                )
            );

        const xs =
            points.map(p => p.x);

        const ys =
            points.map(p => p.y);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);

        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

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
                8,
                (maxY - minY) * 2.1
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
            hexToRgba(color, 0.52)
        );

        gradient.addColorStop(
            0.55,
            hexToRgba(color, 0.28)
        );

        gradient.addColorStop(
            1,
            hexToRgba(color, 0)
        );

        ctx.fillStyle = gradient;

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


    function drawEyeshadow(
        ctx,
        landmarks,
        width,
        height
    ) {

        const color = getProductColor();

        ctx.save();

        drawEyeShadowOnEye(
            ctx,
            landmarks,
            LEFT_EYE,
            width,
            height,
            color
        );

        drawEyeShadowOnEye(
            ctx,
            landmarks,
            RIGHT_EYE,
            width,
            height,
            color
        );

        ctx.restore();
    }


    /* =====================================================
       EYELINER
       ===================================================== */

    function drawEyelinerLine(
        ctx,
        landmarks,
        indexes,
        width,
        height,
        color
    ) {

        if (!indexes.length) {
            return;
        }

        const first =
            point(
                landmarks,
                indexes[0],
                width,
                height
            );

        ctx.beginPath();

        ctx.moveTo(
            first.x,
            first.y
        );

        for (let i = 1; i < indexes.length; i++) {

            const p =
                point(
                    landmarks,
                    indexes[i],
                    width,
                    height
                );

            ctx.lineTo(
                p.x,
                p.y
            );
        }

        ctx.strokeStyle =
            hexToRgba(color, 0.92);

        ctx.lineWidth =
            Math.max(
                2,
                width * 0.004
            );

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.stroke();
    }


    function drawEyeliner(
        ctx,
        landmarks,
        width,
        height
    ) {

        const color = "#24161b";

        ctx.save();

        drawEyelinerLine(
            ctx,
            landmarks,
            LEFT_EYELINER,
            width,
            height,
            color
        );

        drawEyelinerLine(
            ctx,
            landmarks,
            RIGHT_EYELINER,
            width,
            height,
            color
        );

        ctx.restore();
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

        const color = "#171014";

        ctx.save();

        drawEyelinerLine(
            ctx,
            landmarks,
            LEFT_EYELINER,
            width,
            height,
            color
        );

        drawEyelinerLine(
            ctx,
            landmarks,
            RIGHT_EYELINER,
            width,
            height,
            color
        );

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

        const color = getProductColor();

        const cheeks = [
            [50, 0.10],
            [280, 0.10]
        ];

        ctx.save();

        cheeks.forEach(([index, opacity]) => {

            const p =
                point(
                    landmarks,
                    index,
                    width,
                    height
                );

            const radius =
                Math.max(
                    28,
                    width * 0.055
                );

            const gradient =
                ctx.createRadialGradient(
                    p.x,
                    p.y,
                    2,
                    p.x,
                    p.y,
                    radius
                );

            gradient.addColorStop(
                0,
                hexToRgba(color, opacity + 0.15)
            );

            gradient.addColorStop(
                0.55,
                hexToRgba(color, opacity)
            );

            gradient.addColorStop(
                1,
                hexToRgba(color, 0)
            );

            ctx.fillStyle = gradient;

            ctx.beginPath();

            ctx.arc(
                p.x,
                p.y,
                radius,
                0,
                Math.PI * 2
            );

            ctx.fill();
        });

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

        const color = "#fff0d8";

        const indexes = [
            1,
            116,
            345
        ];

        ctx.save();

        indexes.forEach(index => {

            const p =
                point(
                    landmarks,
                    index,
                    width,
                    height
                );

            const radius =
                Math.max(
                    10,
                    width * 0.018
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
                "rgba(255,240,216,0.65)"
            );

            gradient.addColorStop(
                1,
                "rgba(255,240,216,0)"
            );

            ctx.fillStyle = gradient;

            ctx.beginPath();

            ctx.arc(
                p.x,
                p.y,
                radius,
                0,
                Math.PI * 2
            );

            ctx.fill();
        });

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

        /*
         * This is intentionally subtle.
         * Accurate foundation requires face
         * segmentation rather than only landmarks.
         */

        const color = getProductColor();

        const center =
            point(
                landmarks,
                1,
                width,
                height
            );

        const radiusX =
            width * 0.16;

        const radiusY =
            height * 0.27;

        const gradient =
            ctx.createRadialGradient(
                center.x,
                center.y,
                10,
                center.x,
                center.y,
                radiusX
            );

        gradient.addColorStop(
            0,
            hexToRgba(color, 0.07)
        );

        gradient.addColorStop(
            0.7,
            hexToRgba(color, 0.035)
        );

        gradient.addColorStop(
            1,
            hexToRgba(color, 0)
        );

        ctx.save();

        ctx.fillStyle = gradient;

        ctx.beginPath();

        ctx.ellipse(
            center.x,
            center.y,
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
       MAKEUP DISPATCHER
       ===================================================== */

    function drawMakeup(
        ctx,
        landmarks,
        width,
        height
    ) {

        switch (normalizedType) {

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
                    "[Glamora AR] Unsupported product type:",
                    normalizedType
                );

                break;
        }
    }


    /* =====================================================
       CAMERA
       ===================================================== */

    async function startCamera() {

        clearError();

        if (!navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia) {

            showError(
                "Camera access is not supported by this browser."
            );

            return;
        }

        try {

            setStatus("Preparing camera...");

            const ready =
                await loadMediaPipe();

            if (!ready) {
                return;
            }

            stopCamera();

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
                    },

                    frameRate: {
                        ideal: 30
                    }
                }
            };


            mediaStream =
                await navigator.mediaDevices.getUserMedia(
                    constraints
                );


            tryOnVideo.srcObject =
                mediaStream;


            tryOnVideo.classList.add("show");

            if (tryOnPlaceholder) {
                tryOnPlaceholder.classList.remove("show");
            }

            if (tryOnImage) {
                tryOnImage.classList.remove("show");
            }


            await tryOnVideo.play();


            await waitForVideoDimensions();


            resizeCanvas(
                tryOnVideo.videoWidth,
                tryOnVideo.videoHeight
            );


            cameraRunning = true;
            imageMode = false;


            if (switchCameraBtn) {
                switchCameraBtn.classList.add("show");
            }

            if (stopCameraBtn) {
                stopCameraBtn.classList.add("show");
            }


            setStatus("Move your face into the frame.");

            renderCameraFrame();

        } catch (error) {

            handleCameraError(error);
        }
    }


    async function waitForVideoDimensions() {

        let attempts = 0;

        while (
            (
                !tryOnVideo.videoWidth ||
                !tryOnVideo.videoHeight
            ) &&
            attempts < 120
        ) {

            await new Promise(resolve =>
                requestAnimationFrame(resolve)
            );

            attempts++;
        }

        if (
            !tryOnVideo.videoWidth ||
            !tryOnVideo.videoHeight
        ) {
            throw new Error(
                "Camera video dimensions are unavailable."
            );
        }
    }


    /* =====================================================
       CAMERA FRAME
       ===================================================== */

    function drawCameraFrame() {

        const ctx =
            tryOnCanvas.getContext("2d");

        if (!ctx) {
            return;
        }

        const width =
            tryOnCanvas.width;

        const height =
            tryOnCanvas.height;


        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        /*
         * Mirror the camera.
         */

        if (cameraFacingMode === "user") {

            ctx.save();

            ctx.translate(
                width,
                0
            );

            ctx.scale(
                -1,
                1
            );

            ctx.drawImage(
                tryOnVideo,
                0,
                0,
                width,
                height
            );

            ctx.restore();

        } else {

            ctx.drawImage(
                tryOnVideo,
                0,
                0,
                width,
                height
            );
        }
    }


    /* =====================================================
       CAMERA RENDER LOOP
       ===================================================== */

    function renderCameraFrame() {

        if (
            !cameraRunning ||
            !mediaStream ||
            !faceLandmarker
        ) {
            return;
        }

        drawCameraFrame();


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


                const ctx =
                    tryOnCanvas.getContext("2d");


                /*
                 * The canvas is mirrored for the
                 * front-facing camera.
                 *
                 * Apply the same transformation
                 * to the makeup so it lines up.
                 */

                if (cameraFacingMode === "user") {

                    ctx.save();

                    ctx.translate(
                        tryOnCanvas.width,
                        0
                    );

                    ctx.scale(
                        -1,
                        1
                    );

                    drawMakeup(
                        ctx,
                        landmarks,
                        tryOnCanvas.width,
                        tryOnCanvas.height
                    );

                    ctx.restore();

                } else {

                    drawMakeup(
                        ctx,
                        landmarks,
                        tryOnCanvas.width,
                        tryOnCanvas.height
                    );
                }


                clearStatus();

            } else {

                setStatus(
                    "No face detected. Please look at the camera."
                );
            }

        } catch (error) {

            console.error(
                "[Glamora AR] Face detection error:",
                error
            );
        }


        animationFrame =
            requestAnimationFrame(
                renderCameraFrame
            );
    }


    /* =====================================================
       CAMERA ERROR
       ===================================================== */

    function handleCameraError(error) {

        console.error(
            "[Glamora AR] Camera error:",
            error
        );

        stopCamera();

        if (!error) {

            showError(
                "Unable to start the camera."
            );

            return;
        }


        if (
            error.name ===
            "NotAllowedError"
        ) {

            showError(
                "Camera permission was denied. " +
                "Please allow camera access for localhost."
            );

            return;
        }


        if (
            error.name ===
            "NotFoundError"
        ) {

            showError(
                "No camera was found on this device."
            );

            return;
        }


        if (
            error.name ===
            "NotReadableError"
        ) {

            showError(
                "The camera is already being used by another application."
            );

            return;
        }


        if (
            error.name ===
            "SecurityError"
        ) {

            showError(
                "The browser blocked camera access."
            );

            return;
        }


        showError(
            "Unable to start the camera: " +
            error.message
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
                    track.stop();
                });

            mediaStream = null;
        }


        if (tryOnVideo) {

            tryOnVideo.pause();

            tryOnVideo.srcObject = null;

            tryOnVideo.classList.remove("show");
        }


        if (switchCameraBtn) {
            switchCameraBtn.classList.remove("show");
        }

        if (stopCameraBtn) {
            stopCameraBtn.classList.remove("show");
        }
    }


    /* =====================================================
       IMAGE UPLOAD
       ===================================================== */

    function handleImageUpload(event) {

        const file =
            event.target.files?.[0];

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

        imageMode = true;


        const objectUrl =
            URL.createObjectURL(file);


        tryOnImage.src =
            objectUrl;


        tryOnImage.classList.add("show");

        if (tryOnPlaceholder) {
            tryOnPlaceholder.classList.remove("show");
        }


        tryOnImage.onload = async () => {

            try {

                setStatus(
                    "Detecting your face..."
                );


                const ready =
                    await loadMediaPipe();

                if (!ready) {
                    return;
                }


                const width =
                    tryOnImage.naturalWidth;

                const height =
                    tryOnImage.naturalHeight;


                resizeCanvas(
                    width,
                    height
                );


                const ctx =
                    tryOnCanvas.getContext("2d");


                ctx.clearRect(
                    0,
                    0,
                    width,
                    height
                );


                ctx.drawImage(
                    tryOnImage,
                    0,
                    0,
                    width,
                    height
                );


                const result =
                    faceLandmarker.detect(
                        tryOnImage
                    );


                if (
                    !result ||
                    !result.faceLandmarks ||
                    !result.faceLandmarks.length
                ) {

                    showError(
                        "No face was detected in this image."
                    );

                    return;
                }


                drawMakeup(
                    ctx,
                    result.faceLandmarks[0],
                    width,
                    height
                );


                clearStatus();

            } catch (error) {

                console.error(
                    "[Glamora AR] Image detection error:",
                    error
                );

                showError(
                    "Unable to process this image."
                );

            } finally {

                URL.revokeObjectURL(
                    objectUrl
                );
            }
        };


        tryOnImage.onerror = () => {

            URL.revokeObjectURL(
                objectUrl
            );

            showError(
                "Unable to load the selected image."
            );
        };
    }


    /* =====================================================
       OPEN TRY ON
       ===================================================== */

    async function openTryOn(event) {

        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }


        console.log(
            "[Glamora AR] Try On clicked."
        );


        /*
         * IMPORTANT:
         *
         * Open the modal FIRST.
         *
         * Do NOT wait for MediaPipe before
         * displaying the modal.
         */

        if (!tryOnModal) {

            console.error(
                "[Glamora AR] #tryOnModal not found."
            );

            alert(
                "Try-On modal was not found in the page."
            );

            return;
        }


        tryOnModal.classList.add("active");

        tryOnModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "tryon-open"
        );


        clearError();


        if (tryOnPlaceholder) {
            tryOnPlaceholder.classList.add("show");
        }


        setStatus(
            "Starting virtual try-on..."
        );


        /*
         * Give the browser a moment to render
         * the modal before loading MediaPipe.
         */

        await new Promise(resolve =>
            requestAnimationFrame(resolve)
        );


        await startCamera();
    }


    /* =====================================================
       CLOSE TRY ON
       ===================================================== */

    function closeTryOn(event) {

        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }


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


        if (tryOnImage) {

            tryOnImage.removeAttribute(
                "src"
            );

            tryOnImage.classList.remove(
                "show"
            );
        }


        if (tryOnImageInput) {
            tryOnImageInput.value = "";
        }


        clearCanvas();

        clearError();

        clearStatus();
    }


    /* =====================================================
       SWITCH CAMERA
       ===================================================== */

    async function switchCamera(event) {

        if (event) {
            event.preventDefault();
        }

        cameraFacingMode =
            cameraFacingMode === "user"
                ? "environment"
                : "user";


        await startCamera();
    }


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

    if (tryOnBtn) {

        tryOnBtn.addEventListener(
            "click",
            openTryOn
        );

    } else {

        console.error(
            "[Glamora AR] #tryOnBtn was not found."
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


    if (stopCameraBtn) {

        stopCameraBtn.addEventListener(
            "click",
            stopCamera
        );
    }


    if (switchCameraBtn) {

        switchCameraBtn.addEventListener(
            "click",
            switchCamera
        );
    }


    if (uploadImageBtn && tryOnImageInput) {

        uploadImageBtn.addEventListener(
            "click",
            () => {
                tryOnImageInput.click();
            }
        );
    }


    if (tryOnImageInput) {

        tryOnImageInput.addEventListener(
            "change",
            handleImageUpload
        );
    }


    /* Click outside modal */

    if (tryOnModal) {

        tryOnModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    tryOnModal
                ) {

                    closeTryOn(event);
                }
            }
        );
    }


    /* Escape key */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                tryOnModal?.classList.contains(
                    "active"
                )
            ) {

                closeTryOn(event);
            }
        }
    );


    /* =====================================================
       DEBUG
       ===================================================== */

    console.log(
        "[Glamora AR] Product:",
        productName
    );

    console.log(
        "[Glamora AR] Type:",
        normalizedType
    );

    console.log(
        "[Glamora AR] Shade:",
        productShade
    );

    console.log(
        "[Glamora AR] Color:",
        productColor
    );

    console.log(
        "[Glamora AR] Try On JS loaded successfully."
    );

})();
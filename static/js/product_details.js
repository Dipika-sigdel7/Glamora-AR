/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS - VIRTUAL TRY ON
   Camera first + MediaPipe face tracking
   ========================================================= */

(() => {
    "use strict";

    console.log("[Glamora AR] product_details.js loaded");


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
       PRODUCT DATA
       ===================================================== */

    const productName =
        body?.dataset?.productName || "Makeup Product";

    const productType =
        body?.dataset?.productType ||
        body?.dataset?.product_type ||
        "";

    const productShade =
        body?.dataset?.productShade || "";

    const productColor =
        body?.dataset?.productColor || "";


    function normalizeProductType(value) {

        const text =
            String(value || "")
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

        if (text.includes("mascara")) {
            return "mascara";
        }

        if (text.includes("foundation")) {
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


    const normalizedType =
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


    /* =====================================================
       UI HELPERS
       ===================================================== */

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

        console.error(
            "[Glamora AR]",
            message
        );

        if (tryOnError) {

            tryOnError.textContent =
                message;

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
       OPEN MODAL
       ===================================================== */

    function openTryOn(event) {

        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        console.log(
            "[Glamora AR] Try On clicked"
        );


        if (!tryOnModal) {

            console.error(
                "[Glamora AR] tryOnModal not found"
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


        setStatus(
            "Opening camera..."
        );


        /*
         * IMPORTANT:
         *
         * Camera starts FIRST.
         * MediaPipe is loaded separately.
         */

        startCamera();
    }


    /* =====================================================
       CLOSE MODAL
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


        clearError();

        clearStatus();

        clearCanvas();
    }


    /* =====================================================
       CAMERA
       ===================================================== */

    async function startCamera() {

        clearError();


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            showError(
                "Your browser does not support camera access. " +
                "Please use a recent version of Chrome or Firefox."
            );

            return;
        }


        try {

            setStatus(
                "Requesting camera permission..."
            );


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


            console.log(
                "[Glamora AR] Requesting camera..."
            );


            mediaStream =
                await navigator.mediaDevices.getUserMedia(
                    constraints
                );


            console.log(
                "[Glamora AR] Camera permission granted"
            );


            if (!tryOnVideo) {

                throw new Error(
                    "Camera video element was not found."
                );
            }


            tryOnVideo.srcObject =
                mediaStream;


            tryOnVideo.muted = true;

            tryOnVideo.playsInline = true;


            tryOnVideo.classList.add("show");


            if (tryOnPlaceholder) {
                tryOnPlaceholder.classList.remove(
                    "show"
                );
            }


            await tryOnVideo.play();


            await waitForVideoDimensions();


            resizeCanvas(
                tryOnVideo.videoWidth,
                tryOnVideo.videoHeight
            );


            cameraRunning = true;


            if (switchCameraBtn) {
                switchCameraBtn.classList.add(
                    "show"
                );
            }


            if (stopCameraBtn) {
                stopCameraBtn.classList.add(
                    "show"
                );
            }


            setStatus(
                "Camera ready. Loading face tracking..."
            );


            /*
             * Start displaying camera immediately.
             */

            renderCameraFrame();


            /*
             * Load face tracking AFTER camera.
             */

            loadMediaPipe();


        } catch (error) {

            handleCameraError(error);
        }
    }


    /* =====================================================
       WAIT FOR VIDEO
       ===================================================== */

    async function waitForVideoDimensions() {

        let attempts = 0;


        while (
            (
                !tryOnVideo.videoWidth ||
                !tryOnVideo.videoHeight
            ) &&
            attempts < 120
        ) {

            await new Promise(
                resolve =>
                    requestAnimationFrame(resolve)
            );

            attempts++;
        }


        if (
            !tryOnVideo.videoWidth ||
            !tryOnVideo.videoHeight
        ) {

            throw new Error(
                "Camera started but video dimensions are unavailable."
            );
        }
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
                "Click the camera icon beside the browser address bar " +
                "and allow camera access for this site."
            );

            return;
        }


        if (
            error.name ===
            "NotFoundError"
        ) {

            showError(
                "No camera was found. " +
                "Please check that your webcam is connected."
            );

            return;
        }


        if (
            error.name ===
            "NotReadableError"
        ) {

            showError(
                "The camera is being used by another application. " +
                "Close Zoom, Meet, OBS, Cheese, or other camera apps."
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
            "Camera error: " +
            error.name +
            " — " +
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

            tryOnVideo.classList.remove(
                "show"
            );
        }


        if (switchCameraBtn) {
            switchCameraBtn.classList.remove(
                "show"
            );
        }


        if (stopCameraBtn) {
            stopCameraBtn.classList.remove(
                "show"
            );
        }
    }


    /* =====================================================
       MEDIAPIPE
       ===================================================== */

    async function loadMediaPipe() {

        if (
            mediaPipeReady &&
            faceLandmarker
        ) {
            return;
        }


        if (mediaPipeLoading) {
            return;
        }


        mediaPipeLoading = true;


        try {

            console.log(
                "[Glamora AR] Loading MediaPipe library..."
            );


            /*
             * Dynamic import means the Try-On modal
             * and camera can work even if MediaPipe
             * has a loading problem.
             */

            const module =
                await import(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs"
                );


            console.log(
                "[Glamora AR] MediaPipe library loaded"
            );


            const {
                FaceLandmarker,
                FilesetResolver
            } = module;


            if (
                !FaceLandmarker ||
                !FilesetResolver
            ) {

                throw new Error(
                    "MediaPipe classes are unavailable."
                );
            }


            setStatus(
                "Loading face tracking..."
            );


            /*
             * Use CDN WASM first.
             */

            const vision =
                await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
                );


            console.log(
                "[Glamora AR] MediaPipe WASM loaded"
            );


            /*
             * Local model.
             */

            const modelUrl =
                "/static/models/face_landmarker.task";


            console.log(
                "[Glamora AR] Loading model:",
                modelUrl
            );


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
                    "[Glamora AR] GPU failed. Trying CPU.",
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

                            minFaceDetectionConfidence:
                                0.45,

                            minFacePresenceConfidence:
                                0.45,

                            minTrackingConfidence:
                                0.45
                        }
                    );
            }


            if (!faceLandmarker) {

                throw new Error(
                    "Face Landmarker could not be created."
                );
            }


            mediaPipeReady = true;


            console.log(
                "[Glamora AR] Face tracking ready"
            );


            setStatus(
                "Face tracking ready. Look at the camera."
            );


        } catch (error) {

            console.error(
                "[Glamora AR] MediaPipe failed:",
                error
            );


            mediaPipeReady = false;


            showError(
                "Face tracking failed.\n\n" +
                error.message
            );

        } finally {

            mediaPipeLoading = false;
        }
    }


    /* =====================================================
       CANVAS
       ===================================================== */

    function resizeCanvas(
        width,
        height
    ) {

        if (!tryOnCanvas) {
            return;
        }


        tryOnCanvas.width =
            width;

        tryOnCanvas.height =
            height;
    }


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
       LANDMARK HELPER
       ===================================================== */

    function point(
        landmarks,
        index,
        width,
        height
    ) {

        const landmark =
            landmarks[index];


        return {

            x:
                landmark.x *
                width,

            y:
                landmark.y *
                height
        };
    }


    /* =====================================================
       COLOR
       ===================================================== */

    function getProductColor() {

        const value =
            productColor ||
            productShade ||
            "";


        const text =
            String(value)
                .toLowerCase()
                .trim();


        if (
            /^#[0-9a-f]{3,8}$/i.test(text)
        ) {
            return text;
        }


        if (
            text.startsWith("rgb")
        ) {
            return text;
        }


        if (text.includes("black")) {
            return "#21151a";
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


        if (text.includes("mauve")) {
            return "#9b5a70";
        }


        if (text.includes("coral")) {
            return "#e66f67";
        }


        if (text.includes("peach")) {
            return "#ef9b84";
        }


        if (text.includes("orange")) {
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


        if (text.includes("rose")) {
            return "#c96782";
        }


        if (text.includes("pink")) {
            return "#d96f91";
        }


        if (text.includes("red")) {
            return "#b92f48";
        }


        return "#c85f7a";
    }


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
                    .map(x => x + x)
                    .join("");
        }


        if (value.length !== 6) {

            return `rgba(200,95,122,${alpha})`;
        }


        const number =
            parseInt(
                value,
                16
            );


        const r =
            (number >> 16) & 255;

        const g =
            (number >> 8) & 255;

        const b =
            number & 255;


        return `rgba(${r},${g},${b},${alpha})`;
    }


    /* =====================================================
       MAKEUP
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
        153, 154, 155, 133,
        173, 157, 158, 159,
        160, 161, 246
    ];


    const RIGHT_EYE = [
        362, 382, 381, 380, 374,
        373, 390, 249, 263,
        466, 388, 387, 386,
        385, 384, 398
    ];


    function drawPolygon(
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


            ctx.lineTo(
                p.x,
                p.y
            );
        }


        ctx.closePath();
    }


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
                0.65
            );


        ctx.fill();


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


    function drawEyeshadow(
        ctx,
        landmarks,
        width,
        height
    ) {

        const color =
            getProductColor();


        [
            LEFT_EYE,
            RIGHT_EYE
        ].forEach(indexes => {

            const points =
                indexes.map(
                    index =>
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


            const minX =
                Math.min(...xs);

            const maxX =
                Math.max(...xs);

            const minY =
                Math.min(...ys);

            const maxY =
                Math.max(...ys);


            const centerX =
                (minX + maxX) / 2;

            const centerY =
                (minY + maxY) / 2;


            const radius =
                Math.max(
                    25,
                    (maxX - minX) * 0.9
                );


            const gradient =
                ctx.createRadialGradient(
                    centerX,
                    centerY,
                    1,
                    centerX,
                    centerY,
                    radius
                );


            gradient.addColorStop(
                0,
                hexToRgba(
                    color,
                    0.5
                )
            );


            gradient.addColorStop(
                0.55,
                hexToRgba(
                    color,
                    0.25
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
                radius,
                Math.max(
                    12,
                    (maxY - minY) * 2
                ),
                0,
                0,
                Math.PI * 2
            );


            ctx.fill();
        });
    }


    function drawEyeliner(
        ctx,
        landmarks,
        width,
        height
    ) {

        const eyes = [
            [
                33, 246, 161, 160,
                159, 158, 157, 173, 133
            ],
            [
                362, 398, 384, 385,
                386, 387, 388, 466, 263
            ]
        ];


        ctx.save();


        ctx.strokeStyle =
            "rgba(30,18,22,0.95)";


        ctx.lineWidth =
            Math.max(
                2,
                width * 0.004
            );


        ctx.lineCap = "round";

        ctx.lineJoin = "round";


        eyes.forEach(indexes => {

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


                ctx.lineTo(
                    p.x,
                    p.y
                );
            }


            ctx.stroke();
        });


        ctx.restore();
    }


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


    function drawBlush(
        ctx,
        landmarks,
        width,
        height
    ) {

        const color =
            getProductColor();


        [
            50,
            280
        ].forEach(index => {

            const p =
                point(
                    landmarks,
                    index,
                    width,
                    height
                );


            const radius =
                Math.max(
                    30,
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
                hexToRgba(
                    color,
                    0.24
                )
            );


            gradient.addColorStop(
                0.6,
                hexToRgba(
                    color,
                    0.1
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
        });
    }


    function drawHighlighter(
        ctx,
        landmarks,
        width,
        height
    ) {

        [
            1,
            116,
            345
        ].forEach(index => {

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
        });
    }


    function drawFoundation(
        ctx,
        landmarks,
        width,
        height
    ) {

        const p =
            point(
                landmarks,
                1,
                width,
                height
            );


        const gradient =
            ctx.createRadialGradient(
                p.x,
                p.y,
                10,
                p.x,
                p.y,
                width * 0.2
            );


        gradient.addColorStop(
            0,
            "rgba(200,150,125,0.06)"
        );


        gradient.addColorStop(
            1,
            "rgba(200,150,125,0)"
        );


        ctx.fillStyle =
            gradient;


        ctx.beginPath();


        ctx.ellipse(
            p.x,
            p.y,
            width * 0.18,
            height * 0.28,
            0,
            0,
            Math.PI * 2
        );


        ctx.fill();
    }


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
                    "[Glamora AR] Unknown product type:",
                    normalizedType
                );
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
            tryOnCanvas.getContext("2d");


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
         * Draw camera.
         */

        ctx.save();


        if (
            cameraFacingMode ===
            "user"
        ) {

            ctx.translate(
                width,
                0
            );

            ctx.scale(
                -1,
                1
            );
        }


        ctx.drawImage(
            tryOnVideo,
            0,
            0,
            width,
            height
        );


        ctx.restore();


        /*
         * Face tracking.
         */

        if (
            faceLandmarker &&
            mediaPipeReady
        ) {

            try {

                const result =
                    faceLandmarker.detectForVideo(
                        tryOnVideo,
                        performance.now()
                    );


                if (
                    result &&
                    result.faceLandmarks &&
                    result.faceLandmarks.length
                ) {

                    const landmarks =
                        result.faceLandmarks[0];


                    ctx.save();


                    if (
                        cameraFacingMode ===
                        "user"
                    ) {

                        ctx.translate(
                            width,
                            0
                        );

                        ctx.scale(
                            -1,
                            1
                        );
                    }


                    drawMakeup(
                        ctx,
                        landmarks,
                        width,
                        height
                    );


                    ctx.restore();


                    clearStatus();

                } else {

                    setStatus(
                        "No face detected. Look directly at the camera."
                    );
                }


            } catch (error) {

                console.error(
                    "[Glamora AR] Detection error:",
                    error
                );
            }
        }


        animationFrame =
            requestAnimationFrame(
                renderCameraFrame
            );
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
       UPLOAD IMAGE
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


        /*
         * Image upload is kept available,
         * but camera remains the primary mode.
         */

        stopCamera();

        clearError();


        const objectUrl =
            URL.createObjectURL(file);


        tryOnImage.src =
            objectUrl;


        tryOnImage.classList.add(
            "show"
        );


        if (tryOnPlaceholder) {
            tryOnPlaceholder.classList.remove(
                "show"
            );
        }


        tryOnImage.onload =
            async () => {

                try {

                    setStatus(
                        "Loading face tracking..."
                    );


                    if (
                        !mediaPipeReady
                    ) {

                        await loadMediaPipe();
                    }


                    if (
                        !mediaPipeReady ||
                        !faceLandmarker
                    ) {
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
                        tryOnCanvas.getContext(
                            "2d"
                        );


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


                    /*
                     * Temporarily use IMAGE mode.
                     */

                    await faceLandmarker.setOptions({
                        runningMode: "IMAGE"
                    });


                    const result =
                        faceLandmarker.detect(
                            tryOnImage
                        );


                    await faceLandmarker.setOptions({
                        runningMode: "VIDEO"
                    });


                    if (
                        !result ||
                        !result.faceLandmarks ||
                        !result.faceLandmarks.length
                    ) {

                        showError(
                            "No face was detected in the uploaded photo."
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
                        "[Glamora AR] Image error:",
                        error
                    );


                    showError(
                        "Unable to process the uploaded image."
                    );

                } finally {

                    URL.revokeObjectURL(
                        objectUrl
                    );
                }
            };
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
            "[Glamora AR] ERROR: tryOnBtn not found"
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


    if (
        uploadImageBtn &&
        tryOnImageInput
    ) {

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


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                tryOnModal &&
                tryOnModal.classList.contains(
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
        "[Glamora AR] Product type:",
        normalizedType
    );

})();
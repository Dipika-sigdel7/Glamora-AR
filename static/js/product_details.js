
/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS - VIRTUAL TRY ON

   CAMERA
   LOCAL MEDIAPIPE
   LOCAL WASM
   LOCAL FACE LANDMARK MODEL

   CAMERA ORIENTATION:
   FRONT CAMERA IS MIRRORED HORIZONTALLY
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
       PRODUCT DATA
       ===================================================== */

    const body = document.body;

    const productId =
        body.dataset.productId || "";

    const productName =
        body.dataset.productName || "";

    const productType =
        body.dataset.productType ||
        body.dataset.product_type ||
        "";

    const productShade =
        body.dataset.productShade ||
        "";

    const productColor =
        body.dataset.productColor ||
        "";


    console.log("[Glamora AR] Product:", {
        productId,
        productName,
        productType,
        productShade,
        productColor
    });


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
       CANVAS CONTEXT
       ===================================================== */

    const ctx = tryOnCanvas
        ? tryOnCanvas.getContext("2d")
        : null;


    /* =====================================================
       NORMALIZE PRODUCT TYPE
       ===================================================== */

    function normalizeProductType(type) {

        return String(type || "")
            .trim()
            .toLowerCase()
            .replace(/[_\s-]+/g, "");

    }


    const normalizedType =
        normalizeProductType(productType);


    /* =====================================================
       PRODUCT COLOR
       ===================================================== */

    function getProductColor() {

        const value =
            String(productColor || productShade || "")
                .trim()
                .toLowerCase();

        if (!value) {
            return "#b84d6b";
        }

        if (value.startsWith("#")) {
            return value;
        }

        const colorMap = {

            black: "#151015",

            burgundy: "#6d1835",

            wine: "#72243b",

            berry: "#8f3156",

            plum: "#71385f",

            mauve: "#a65d79",

            coral: "#ef766d",

            orange: "#ed7048",

            brown: "#754c3b",

            nude: "#c98272",

            rose: "#c75c78",

            red: "#c92d45"

        };

        for (const key in colorMap) {

            if (value.includes(key)) {
                return colorMap[key];
            }

        }

        return "#b84d6b";
    }


    const makeupColor =
        getProductColor();


    /* =====================================================
       ORIENTATION
       ===================================================== */

    function resetPreviewOrientation() {

        /*
         * IMPORTANT:
         * Front camera should look like a normal selfie.
         *
         * Only horizontal mirroring is applied.
         */

        if (tryOnVideo) {

            tryOnVideo.style.transform =
                "scaleX(-1)";

            tryOnVideo.style.webkitTransform =
                "scaleX(-1)";
        }


        if (tryOnCanvas) {

            tryOnCanvas.style.transform =
                "scaleX(-1)";

            tryOnCanvas.style.webkitTransform =
                "scaleX(-1)";
        }


        /*
         * Uploaded images should NOT be mirrored.
         */

        if (tryOnImage) {

            tryOnImage.style.transform =
                "none";

            tryOnImage.style.webkitTransform =
                "none";
        }
    }


    /* =====================================================
       UI HELPERS
       ===================================================== */

    function setStatus(message) {

        if (tryOnStatusText) {
            tryOnStatusText.textContent = message;
        }

        if (tryOnStatus) {
            tryOnStatus.style.display = "flex";
        }
    }


    function hideStatus() {

        if (tryOnStatus) {
            tryOnStatus.style.display = "none";
        }
    }


    function showError(message) {

        console.error("[Glamora AR]", message);

        if (tryOnError) {

            tryOnError.textContent = message;

            tryOnError.style.display = "block";
        }
    }


    function hideError() {

        if (tryOnError) {

            tryOnError.textContent = "";

            tryOnError.style.display = "none";
        }
    }


    /* =====================================================
       LOAD LOCAL MEDIAPIPE
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

            return !!faceLandmarker;
        }

        mediaPipeLoading = true;

        try {

            setStatus("Loading face tracking...");

            console.log(
                "[Glamora AR] Loading local MediaPipe..."
            );


            const vision =
                await import(
                    "/static/mediapipe/vision_bundle.mjs"
                );


            const {
                FaceLandmarker,
                FilesetResolver
            } = vision;


            const filesetResolver =
                await FilesetResolver.forVisionTasks(
                    "/static/mediapipe/wasm"
                );


            try {

                faceLandmarker =
                    await FaceLandmarker.createFromOptions(
                        filesetResolver,
                        {
                            baseOptions: {
                                modelAssetPath:
                                    "/static/models/face_landmarker.task",

                                delegate: "GPU"
                            },

                            runningMode: "VIDEO",

                            numFaces: 1,

                            minFaceDetectionConfidence: 0.35,

                            minFacePresenceConfidence: 0.35,

                            minTrackingConfidence: 0.35
                        }
                    );

            } catch (gpuError) {

                console.warn(
                    "[Glamora AR] GPU failed. Trying CPU.",
                    gpuError
                );


                faceLandmarker =
                    await FaceLandmarker.createFromOptions(
                        filesetResolver,
                        {
                            baseOptions: {
                                modelAssetPath:
                                    "/static/models/face_landmarker.task",

                                delegate: "CPU"
                            },

                            runningMode: "VIDEO",

                            numFaces: 1,

                            minFaceDetectionConfidence: 0.35,

                            minFacePresenceConfidence: 0.35,

                            minTrackingConfidence: 0.35
                        }
                    );
            }


            mediaPipeReady = true;

            console.log(
                "[Glamora AR] MediaPipe ready."
            );

            return true;

        } catch (error) {

            console.error(
                "[Glamora AR] MediaPipe loading failed:",
                error
            );

            showError(
                "Face tracking failed. " +
                error.message
            );

            faceLandmarker = null;

            mediaPipeReady = false;

            return false;

        } finally {

            mediaPipeLoading = false;
        }
    }


    /* =====================================================
       START CAMERA
       ===================================================== */

    async function startCamera() {

        if (!navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia) {

            showError(
                "Your browser does not support camera access."
            );

            return;
        }


        stopCamera(false);

        hideError();

        setStatus("Starting camera...");


        try {

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
                "[Glamora AR] Requesting camera:",
                constraints
            );


            mediaStream =
                await navigator.mediaDevices
                    .getUserMedia(constraints);


            console.log(
                "[Glamora AR] Camera permission granted."
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

            tryOnVideo.autoplay = true;


            await tryOnVideo.play();


            await new Promise(resolve => {

                if (
                    tryOnVideo.videoWidth > 0 &&
                    tryOnVideo.videoHeight > 0
                ) {

                    resolve();

                    return;
                }


                const checkVideo = () => {

                    if (
                        tryOnVideo.videoWidth > 0 &&
                        tryOnVideo.videoHeight > 0
                    ) {

                        resolve();

                    } else {

                        requestAnimationFrame(
                            checkVideo
                        );
                    }
                };


                checkVideo();
            });


            currentVideoWidth =
                tryOnVideo.videoWidth;

            currentVideoHeight =
                tryOnVideo.videoHeight;


            if (tryOnCanvas) {

                tryOnCanvas.width =
                    currentVideoWidth;

                tryOnCanvas.height =
                    currentVideoHeight;
            }


            /*
             * CAMERA ORIENTATION FIX
             */
            resetPreviewOrientation();


            cameraRunning = true;


            if (tryOnVideo) {
                tryOnVideo.style.display = "block";
            }

            if (tryOnCanvas) {
                tryOnCanvas.style.display = "block";
            }

            if (tryOnImage) {
                tryOnImage.style.display = "none";
            }

            if (tryOnPlaceholder) {
                tryOnPlaceholder.style.display = "none";
            }


            hideStatus();


            /*
             * Start MediaPipe after camera starts.
             */

            const loaded =
                await loadMediaPipe();


            if (!loaded) {
                return;
            }


            setStatus("Detecting your face...");


            renderCameraFrame();


        } catch (error) {

            console.error(
                "[Glamora AR] Camera error:",
                error
            );


            cameraRunning = false;


            if (error.name === "NotAllowedError") {

                showError(
                    "Camera permission was denied. " +
                    "Please allow camera access in your browser."
                );

            } else if (error.name === "NotFoundError") {

                showError(
                    "No camera was found on this device."
                );

            } else if (error.name === "NotReadableError") {

                showError(
                    "The camera is already being used " +
                    "by another application."
                );

            } else if (error.name === "OverconstrainedError") {

                showError(
                    "The selected camera settings are not supported."
                );

            } else if (error.name === "SecurityError") {

                showError(
                    "Camera access was blocked by browser security."
                );

            } else if (error.name === "AbortError") {

                showError(
                    "Camera startup was interrupted."
                );

            } else {

                showError(
                    "Unable to start camera: " +
                    error.message
                );
            }


            stopCamera(false);
        }
    }


    /* =====================================================
       STOP CAMERA
       ===================================================== */

    function stopCamera(showMessage = true) {

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
                .forEach(track => track.stop());

            mediaStream = null;
        }


        if (tryOnVideo) {

            tryOnVideo.pause();

            tryOnVideo.srcObject = null;
        }


        if (ctx && tryOnCanvas) {

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


        /*
         * Keep the selfie orientation after stopping.
         */

        resetPreviewOrientation();


        if (showMessage) {

            setStatus("Camera stopped.");
        }
    }


    /* =====================================================
       SWITCH CAMERA
       ===================================================== */

    async function switchCamera() {

        cameraFacingMode =
            cameraFacingMode === "user"
                ? "environment"
                : "user";


        if (cameraRunning) {

            await startCamera();
        }
    }


    /* =====================================================
       DRAW CAMERA FRAME
       ===================================================== */

    function renderCameraFrame() {

        if (!cameraRunning ||
            !tryOnVideo ||
            !tryOnCanvas ||
            !ctx) {

            return;
        }


        const width =
            tryOnVideo.videoWidth;

        const height =
            tryOnVideo.videoHeight;


        if (!width || !height) {

            animationFrame =
                requestAnimationFrame(
                    renderCameraFrame
                );

            return;
        }


        /*
         * Keep canvas coordinate system normal.
         * CSS handles the visible horizontal mirror.
         */

        ctx.setTransform(
            1,
            0,
            0,
            1,
            0,
            0
        );


        /*
         * CAMERA ORIENTATION FIX
         *
         * The visible canvas is mirrored.
         */

        tryOnCanvas.style.transform =
            "scaleX(-1)";

        tryOnCanvas.style.webkitTransform =
            "scaleX(-1)";


        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        /*
         * Draw original camera frame.
         * CSS mirror is applied afterward.
         */

        ctx.drawImage(
            tryOnVideo,
            0,
            0,
            width,
            height
        );


        const now =
            performance.now();


        if (
            faceLandmarker &&
            mediaPipeReady
        ) {

            try {

                const result =
                    faceLandmarker.detectForVideo(
                        tryOnVideo,
                        now
                    );


                if (
                    result &&
                    result.faceLandmarks &&
                    result.faceLandmarks.length > 0
                ) {

                    lastFaceDetected = true;

                    setStatus(
                        "Face detected — " +
                        productName +
                        " ready to try."
                    );


                    const landmarks =
                        result.faceLandmarks[0];


                    drawMakeup(
                        landmarks,
                        width,
                        height
                    );

                } else {

                    lastFaceDetected = false;

                    setStatus(
                        "Move your face into the camera."
                    );
                }


            } catch (error) {

                console.warn(
                    "[Glamora AR] Face detection error:",
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
       LANDMARK HELPER
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
       DRAW POLYGON
       ===================================================== */

    function drawPolygon(
        points
    ) {

        if (!points.length) {
            return;
        }


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


        ctx.closePath();

        ctx.fill();
    }


    /* =====================================================
       DRAW MAKEUP
       ===================================================== */

    function drawMakeup(
        landmarks,
        width,
        height
    ) {

        if (!ctx || !landmarks) {
            return;
        }


        const type =
            normalizedType;


        if (
            type === "lipstick" ||
            type === "lip"
        ) {

            drawLipstick(
                landmarks,
                width,
                height
            );

        } else if (
            type === "eyeshadow"
        ) {

            drawEyeshadow(
                landmarks,
                width,
                height
            );

        } else if (
            type === "eyeliner"
        ) {

            drawEyeliner(
                landmarks,
                width,
                height
            );

        } else if (
            type === "mascara"
        ) {

            drawMascara(
                landmarks,
                width,
                height
            );

        } else if (
            type === "blush"
        ) {

            drawBlush(
                landmarks,
                width,
                height
            );

        } else if (
            type === "highlighter"
        ) {

            drawHighlighter(
                landmarks,
                width,
                height
            );

        } else if (
            type === "foundation"
        ) {

            drawFoundation(
                landmarks,
                width,
                height
            );

        } else {

            /*
             * Default to lipstick-style application
             * for unknown makeup types.
             */

            drawLipstick(
                landmarks,
                width,
                height
            );
        }
    }


    /* =====================================================
       LIPSTICK
       ===================================================== */

    function drawLipstick(
        landmarks,
        width,
        height
    ) {

        /*
         * MediaPipe outer lips.
         */

        const indices = [
            61, 146, 91, 181, 84,
            17, 314, 405, 321, 375,
            291, 409, 270, 269, 267,
            0, 37, 39, 40, 185
        ];


        const points = [];


        indices.forEach(index => {

            const p =
                point(
                    landmarks,
                    index,
                    width,
                    height
                );

            if (p) {
                points.push(p);
            }
        });


        if (!points.length) {
            return;
        }


        ctx.save();

        ctx.globalAlpha = 0.58;

        ctx.fillStyle =
            makeupColor;

        ctx.globalCompositeOperation =
            "multiply";


        drawPolygon(points);


        ctx.restore();
    }


    /* =====================================================
       EYESHADOW
       ===================================================== */

    function drawEyeshadow(
        landmarks,
        width,
        height
    ) {

        const leftEye = [
            33, 7, 163, 144, 145,
            153, 154, 155, 133
        ];


        const rightEye = [
            362, 382, 381, 380,
            374, 373, 390, 263
        ];


        ctx.save();

        ctx.globalAlpha = 0.28;

        ctx.fillStyle =
            makeupColor;

        ctx.globalCompositeOperation =
            "multiply";


        drawPolygon(
            leftEye
                .map(i =>
                    point(
                        landmarks,
                        i,
                        width,
                        height
                    )
                )
                .filter(Boolean)
        );


        drawPolygon(
            rightEye
                .map(i =>
                    point(
                        landmarks,
                        i,
                        width,
                        height
                    )
                )
                .filter(Boolean)
        );


        ctx.restore();
    }


    /* =====================================================
       EYELINER
       ===================================================== */

    function drawEyeliner(
        landmarks,
        width,
        height
    ) {

        const left = [
            33, 133, 159, 158, 157
        ];


        const right = [
            362, 263, 386, 385, 384
        ];


        ctx.save();

        ctx.strokeStyle =
            makeupColor;

        ctx.lineWidth =
            Math.max(2, width / 300);

        ctx.lineCap =
            "round";

        ctx.lineJoin =
            "round";


        function drawLine(indices) {

            const pts =
                indices
                    .map(i =>
                        point(
                            landmarks,
                            i,
                            width,
                            height
                        )
                    )
                    .filter(Boolean);


            if (pts.length < 2) {
                return;
            }


            ctx.beginPath();

            ctx.moveTo(
                pts[0].x,
                pts[0].y
            );


            for (
                let i = 1;
                i < pts.length;
                i++
            ) {

                ctx.lineTo(
                    pts[i].x,
                    pts[i].y
                );
            }


            ctx.stroke();
        }


        drawLine(left);

        drawLine(right);


        ctx.restore();
    }


    /* =====================================================
       MASCARA
       ===================================================== */

    function drawMascara(
        landmarks,
        width,
        height
    ) {

        const left = [
            33, 133, 159, 158, 157
        ];


        const right = [
            362, 263, 386, 385, 384
        ];


        ctx.save();

        ctx.strokeStyle =
            makeupColor;

        ctx.lineWidth =
            Math.max(2, width / 250);

        ctx.lineCap =
            "round";


        function drawMascaraLine(indices) {

            const pts =
                indices
                    .map(i =>
                        point(
                            landmarks,
                            i,
                            width,
                            height
                        )
                    )
                    .filter(Boolean);


            if (pts.length < 2) {
                return;
            }


            ctx.beginPath();

            ctx.moveTo(
                pts[0].x,
                pts[0].y
            );


            for (
                let i = 1;
                i < pts.length;
                i++
            ) {

                ctx.lineTo(
                    pts[i].x,
                    pts[i].y
                );
            }


            ctx.stroke();
        }


        drawMascaraLine(left);

        drawMascaraLine(right);


        ctx.restore();
    }


    /* =====================================================
       BLUSH
       ===================================================== */

    function drawBlush(
        landmarks,
        width,
        height
    ) {

        const leftCheek =
            point(
                landmarks,
                50,
                width,
                height
            );


        const rightCheek =
            point(
                landmarks,
                280,
                width,
                height
            );


        ctx.save();

        ctx.globalAlpha = 0.18;

        ctx.fillStyle =
            makeupColor;

        ctx.globalCompositeOperation =
            "multiply";


        const radius =
            Math.max(
                25,
                width * 0.07
            );


        if (leftCheek) {

            ctx.beginPath();

            ctx.arc(
                leftCheek.x,
                leftCheek.y,
                radius,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }


        if (rightCheek) {

            ctx.beginPath();

            ctx.arc(
                rightCheek.x,
                rightCheek.y,
                radius,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }


        ctx.restore();
    }


    /* =====================================================
       HIGHLIGHTER
       ===================================================== */

    function drawHighlighter(
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


        const leftCheek =
            point(
                landmarks,
                50,
                width,
                height
            );


        const rightCheek =
            point(
                landmarks,
                280,
                width,
                height
            );


        ctx.save();

        ctx.globalAlpha =
            0.20;

        ctx.fillStyle =
            makeupColor;


        const radius =
            Math.max(
                12,
                width * 0.025
            );


        [
            nose,
            leftCheek,
            rightCheek
        ].forEach(p => {

            if (!p) {
                return;
            }


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
        landmarks,
        width,
        height
    ) {

        const faceIndices = [

            10, 338, 297, 332,
            284, 251, 389, 356,
            454, 323, 361, 288,
            397, 365, 379, 378,
            400, 377, 152, 148,
            176, 149, 150, 136,
            172, 58, 132, 93,
            234, 127, 162, 21,
            54, 103, 67
        ];


        const points =
            faceIndices
                .map(i =>
                    point(
                        landmarks,
                        i,
                        width,
                        height
                    )
                )
                .filter(Boolean);


        if (!points.length) {
            return;
        }


        ctx.save();

        ctx.globalAlpha =
            0.08;

        ctx.fillStyle =
            makeupColor;

        ctx.globalCompositeOperation =
            "multiply";


        drawPolygon(points);


        ctx.restore();
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


        hideError();


        const objectURL =
            URL.createObjectURL(file);


        stopCamera(false);


        if (tryOnVideo) {
            tryOnVideo.style.display =
                "none";
        }


        if (tryOnCanvas) {
            tryOnCanvas.style.display =
                "block";
        }


        if (tryOnPlaceholder) {
            tryOnPlaceholder.style.display =
                "none";
        }


        if (tryOnImage) {

            tryOnImage.src =
                objectURL;

            tryOnImage.style.display =
                "block";

            /*
             * Uploaded image stays NORMAL.
             */
            tryOnImage.style.transform =
                "none";

            tryOnImage.style.webkitTransform =
                "none";
        }


        if (!faceLandmarker) {

            const loaded =
                await loadMediaPipe();

            if (!loaded) {
                return;
            }
        }


        try {

            setStatus(
                "Detecting face in image..."
            );


            /*
             * IMAGE mode.
             */

            try {

                await faceLandmarker.setOptions({
                    runningMode: "IMAGE"
                });

            } catch (error) {

                console.warn(
                    "[Glamora AR] Could not switch to IMAGE mode:",
                    error
                );
            }


            const result =
                await faceLandmarker.detect(
                    tryOnImage
                );


            if (
                !result ||
                !result.faceLandmarks ||
                !result.faceLandmarks.length
            ) {

                showError(
                    "No face was detected in the uploaded image."
                );

                return;
            }


            const width =
                tryOnImage.naturalWidth;

            const height =
                tryOnImage.naturalHeight;


            if (
                !width ||
                !height
            ) {

                showError(
                    "Unable to read uploaded image dimensions."
                );

                return;
            }


            if (tryOnCanvas) {

                tryOnCanvas.width =
                    width;

                tryOnCanvas.height =
                    height;
            }


            ctx.clearRect(
                0,
                0,
                width,
                height
            );


            ctx.setTransform(
                1,
                0,
                0,
                1,
                0,
                0
            );


            /*
             * Uploaded image remains unmirrored.
             */

            if (tryOnCanvas) {

                tryOnCanvas.style.transform =
                    "none";

                tryOnCanvas.style.webkitTransform =
                    "none";
            }


            drawMakeup(
                result.faceLandmarks[0],
                width,
                height
            );


            hideStatus();


        } catch (error) {

            console.error(
                "[Glamora AR] Image detection failed:",
                error
            );


            showError(
                "Unable to process the uploaded image."
            );


        } finally {

            /*
             * Restore VIDEO mode.
             */

            try {

                await faceLandmarker.setOptions({
                    runningMode: "VIDEO"
                });

            } catch (error) {

                console.warn(
                    "[Glamora AR] Could not restore VIDEO mode:",
                    error
                );
            }
        }
    }


    /* =====================================================
       OPEN TRY ON
       ===================================================== */

    async function openTryOn() {

        console.log(
            "[Glamora AR] Opening Try-On."
        );


        hideError();


        if (!tryOnModal) {

            console.error(
                "[Glamora AR] tryOnModal not found."
            );

            return;
        }


        tryOnModal.classList.add("show");

        tryOnModal.style.display =
            "flex";


        /*
         * Camera orientation.
         */

        resetPreviewOrientation();


        /*
         * Start camera.
         */

        await startCamera();
    }


    /* =====================================================
       CLOSE TRY ON
       ===================================================== */

    function closeTryOn() {

        stopCamera(false);


        if (tryOnModal) {

            tryOnModal.classList.remove("show");

            tryOnModal.style.display =
                "none";
        }


        if (tryOnImage) {

            tryOnImage.src = "";

            tryOnImage.style.display =
                "none";

            tryOnImage.style.transform =
                "none";

            tryOnImage.style.webkitTransform =
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


        if (tryOnPlaceholder) {

            tryOnPlaceholder.style.display =
                "flex";
        }


        hideError();

        hideStatus();
    }


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

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


    if (stopCameraBtn) {

        stopCameraBtn.addEventListener(
            "click",
            () => stopCamera(true)
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


    /*
     * Close when clicking outside modal.
     */

    if (tryOnModal) {

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
    }


    /*
     * ESC closes modal.
     */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                tryOnModal &&
                tryOnModal.classList.contains("show")
            ) {

                closeTryOn();
            }
        }
    );


    /* =====================================================
       CLEANUP
       ===================================================== */

    window.addEventListener(
        "beforeunload",
        () => {

            stopCamera(false);

        }
    );


    /* =====================================================
       INITIAL ORIENTATION
       ===================================================== */

    resetPreviewOrientation();


    console.log(
        "[Glamora AR] product_details.js loaded."
    );

})();



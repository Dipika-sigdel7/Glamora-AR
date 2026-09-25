
/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS - VIRTUAL TRY ON

   CAMERA FIRST
   LOCAL MEDIAPIPE
   LOCAL WASM
   LOCAL FACE LANDMARK MODEL
   ========================================================= */

(() => {
    "use strict";


    /* =====================================================
       STARTUP
       ===================================================== */

    console.log(
        "[Glamora AR] product_details.js loaded"
    );


    /* =====================================================
       DOM
       ===================================================== */

    const body = document.body;

    const tryOnBtn =
        document.getElementById("tryOnBtn");

    const tryOnModal =
        document.getElementById("tryOnModal");

    const tryOnClose =
        document.getElementById("tryOnClose");

    const tryOnVideo =
        document.getElementById("tryOnVideo");

    const tryOnCanvas =
        document.getElementById("tryOnCanvas");

    const tryOnImage =
        document.getElementById("tryOnImage");

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
       CHECK REQUIRED ELEMENTS
       ===================================================== */

    console.log(
        "[Glamora AR] Try On button:",
        !!tryOnBtn
    );

    console.log(
        "[Glamora AR] Try On modal:",
        !!tryOnModal
    );

    console.log(
        "[Glamora AR] Video element:",
        !!tryOnVideo
    );

    console.log(
        "[Glamora AR] Canvas element:",
        !!tryOnCanvas
    );


    /* =====================================================
       PRODUCT DATA
       ===================================================== */

    const productName =
        body?.dataset?.productName ||
        "Makeup Product";

    const productType =
        body?.dataset?.productType ||
        body?.dataset?.product_type ||
        "";

    const productShade =
        body?.dataset?.productShade ||
        "";

    const productColor =
        body?.dataset?.productColor ||
        "";


    /* =====================================================
       NORMALIZE PRODUCT TYPE
       ===================================================== */

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
            text.includes("eye liner") ||
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
            text.includes("blush") ||
            text.includes("rouge")
        ) {
            return "blush";
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


    const normalizedType =
        normalizeProductType(
            productType
        );


    console.log(
        "[Glamora AR] Product:",
        productName
    );

    console.log(
        "[Glamora AR] Product type:",
        normalizedType
    );


    /* =====================================================
       STATE
       ===================================================== */

    let faceLandmarker =
        null;

    let mediaStream =
        null;

    let animationFrame =
        null;

    let cameraRunning =
        false;

    let cameraFacingMode =
        "user";

    let mediaPipeLoading =
        false;

    let mediaPipeReady =
        false;


    /* =====================================================
       UI STATUS
       ===================================================== */

    function setStatus(message) {

        if (tryOnStatusText) {

            tryOnStatusText.textContent =
                message;
        }


        if (tryOnStatus) {

            tryOnStatus.classList.add(
                "show"
            );
        }
    }


    function clearStatus() {

        if (tryOnStatus) {

            tryOnStatus.classList.remove(
                "show"
            );
        }
    }


    /* =====================================================
       ERROR
       ===================================================== */

    function showError(message) {

        console.error(
            "[Glamora AR]",
            message
        );


        if (tryOnError) {

            tryOnError.textContent =
                message;

            tryOnError.classList.add(
                "show"
            );
        }
    }


    function clearError() {

        if (tryOnError) {

            tryOnError.textContent =
                "";

            tryOnError.classList.remove(
                "show"
            );
        }
    }


    /* =====================================================
       OPEN TRY-ON
       ===================================================== */

    async function openTryOn(event) {

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


        /*
         * Open modal FIRST.
         */

        tryOnModal.classList.add(
            "active"
        );


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
         * Start camera.
         */

        await startCamera();
    }


    /* =====================================================
       CLOSE TRY-ON
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


        if (tryOnImage) {

            tryOnImage.classList.remove(
                "show"
            );

            tryOnImage.removeAttribute(
                "src"
            );
        }


        if (tryOnPlaceholder) {

            tryOnPlaceholder.classList.add(
                "show"
            );
        }
    }


    /* =====================================================
       START CAMERA
       ===================================================== */

    async function startCamera() {

        clearError();


        /*
         * Check browser support.
         */

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            showError(
                "Your browser does not support camera access. " +
                "Please use a recent version of Chrome or Firefox."
            );

            return false;
        }


        /*
         * Stop old camera.
         */

        stopCamera();


        try {

            setStatus(
                "Requesting camera permission..."
            );


            console.log(
                "[Glamora AR] Requesting camera..."
            );


            /*
             * Camera constraints.
             */

            const constraints = {

                audio: false,

                video: {

                    facingMode: {
                        ideal:
                            cameraFacingMode
                    },

                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    }
                }
            };


            /*
             * Request camera.
             */

            mediaStream =
                await navigator.mediaDevices
                    .getUserMedia(
                        constraints
                    );


            console.log(
                "[Glamora AR] Camera permission granted"
            );


            /*
             * Verify video element.
             */

            if (!tryOnVideo) {

                throw new Error(
                    "Camera video element was not found."
                );
            }


            /*
             * Attach stream.
             */

            tryOnVideo.srcObject =
                mediaStream;


            tryOnVideo.muted =
                true;


            tryOnVideo.autoplay =
                true;


            tryOnVideo.playsInline =
                true;


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


            tryOnVideo.classList.add(
                "show"
            );


            /*
             * Hide placeholder.
             */

            if (tryOnPlaceholder) {

                tryOnPlaceholder.classList.remove(
                    "show"
                );
            }


            /*
             * Hide uploaded image.
             */

            if (tryOnImage) {

                tryOnImage.classList.remove(
                    "show"
                );
            }


            /*
             * Start video.
             */

            await tryOnVideo.play();


            console.log(
                "[Glamora AR] Camera video playing"
            );


            /*
             * Wait until dimensions exist.
             */

            await waitForVideoDimensions();


            resizeCanvas(
                tryOnVideo.videoWidth,
                tryOnVideo.videoHeight
            );


            cameraRunning =
                true;


            /*
             * Show controls.
             */

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


            /*
             * Camera is now running.
             */

            setStatus(
                "Camera ready. Loading face tracking..."
            );


            /*
             * Start camera rendering immediately.
             */

            renderCameraFrame();


            /*
             * Load MediaPipe AFTER camera.
             */

            loadMediaPipe();


            return true;


        } catch (error) {

            handleCameraError(
                error
            );

            return false;
        }
    }


    /* =====================================================
       WAIT FOR VIDEO DIMENSIONS
       ===================================================== */

    async function waitForVideoDimensions() {

        if (!tryOnVideo) {
            throw new Error(
                "Video element is missing."
            );
        }


        let attempts =
            0;


        while (
            (
                !tryOnVideo.videoWidth ||
                !tryOnVideo.videoHeight
            ) &&
            attempts < 180
        ) {

            await new Promise(
                resolve => {

                    requestAnimationFrame(
                        resolve
                    );
                }
            );


            attempts++;
        }


        if (
            !tryOnVideo.videoWidth ||
            !tryOnVideo.videoHeight
        ) {

            throw new Error(
                "Camera started, but the video dimensions are unavailable."
            );
        }


        console.log(
            "[Glamora AR] Video size:",
            tryOnVideo.videoWidth,
            "x",
            tryOnVideo.videoHeight
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
                "The camera is already being used by another application. " +
                "Close Zoom, Meet, OBS, Cheese, or another camera application."
            );

            return;
        }


        if (
            error.name ===
            "OverconstrainedError"
        ) {

            showError(
                "The camera does not support the requested settings. " +
                "Trying a basic camera mode may solve this problem."
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


        if (
            error.name ===
            "AbortError"
        ) {

            showError(
                "Camera startup was interrupted. Please try again."
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

        cameraRunning =
            false;


        /*
         * Stop animation.
         */

        if (animationFrame) {

            cancelAnimationFrame(
                animationFrame
            );

            animationFrame =
                null;
        }


        /*
         * Stop tracks.
         */

        if (mediaStream) {

            mediaStream
                .getTracks()
                .forEach(
                    track => {
                        track.stop();
                    }
                );


            mediaStream =
                null;
        }


        /*
         * Disconnect video.
         */

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


            tryOnVideo.classList.remove(
                "show"
            );
        }


        /*
         * Hide controls.
         */

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
       LOCAL MEDIAPIPE
       ===================================================== */

    async function loadMediaPipe() {

        /*
         * Already loaded.
         */

        if (
            mediaPipeReady &&
            faceLandmarker
        ) {

            return;
        }


        /*
         * Already loading.
         */

        if (
            mediaPipeLoading
        ) {

            return;
        }


        mediaPipeLoading =
            true;


        try {

            console.log(
                "[Glamora AR] Loading LOCAL MediaPipe library..."
            );


            setStatus(
                "Loading face tracking..."
            );


            /* =================================================
               LOCAL JAVASCRIPT MODULE

               IMPORTANT:
               NO CDN HERE
               ================================================= */

            const module =
                await import(
                    "/static/mediapipe/vision_bundle.mjs"
                );


            console.log(
                "[Glamora AR] Local MediaPipe library loaded"
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


            /* =================================================
               LOCAL WASM

               IMPORTANT:
               NO CDN HERE
               ================================================= */

            console.log(
                "[Glamora AR] Loading LOCAL MediaPipe WASM..."
            );


            const vision =
                await FilesetResolver.forVisionTasks(
                    "/static/mediapipe/wasm"
                );


            console.log(
                "[Glamora AR] Local MediaPipe WASM loaded"
            );


            /* =================================================
               LOCAL FACE MODEL
               ================================================= */

            const modelUrl =
                "/static/models/face_landmarker.task";


            console.log(
                "[Glamora AR] Loading face model:",
                modelUrl
            );


            /* =================================================
               GPU
               ================================================= */

            try {

                console.log(
                    "[Glamora AR] Trying GPU..."
                );


                faceLandmarker =
                    await FaceLandmarker
                        .createFromOptions(
                            vision,
                            {

                                baseOptions: {

                                    modelAssetPath:
                                        modelUrl,

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


            } catch (gpuError) {

                console.warn(
                    "[Glamora AR] GPU initialization failed."
                );


                console.warn(
                    "[Glamora AR] GPU error:",
                    gpuError
                );


                console.log(
                    "[Glamora AR] Trying CPU..."
                );


                /* =================================================
                   CPU FALLBACK
                   ================================================= */

                faceLandmarker =
                    await FaceLandmarker
                        .createFromOptions(
                            vision,
                            {

                                baseOptions: {

                                    modelAssetPath:
                                        modelUrl,

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
            }


            if (!faceLandmarker) {

                throw new Error(
                    "Face Landmarker could not be created."
                );
            }


            mediaPipeReady =
                true;


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


            mediaPipeReady =
                false;


            faceLandmarker =
                null;


            /*
             * IMPORTANT:
             *
             * We DO NOT stop the camera here.
             */

            showError(
                "Face tracking failed.\n\n" +
                error.message
            );


            setStatus(
                "Camera is active"
            );


        } finally {

            mediaPipeLoading =
                false;
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


        if (
            !width ||
            !height
        ) {
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

        const landmark =
            landmarks[index];


        if (!landmark) {

            return {
                x: 0,
                y: 0
            };
        }


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
       PRODUCT COLOR
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


        /*
         * Hex color.
         */

        if (
            /^#[0-9a-f]{3,8}$/i
                .test(text)
        ) {

            return text;
        }


        /*
         * RGB color.
         */

        if (
            text.startsWith(
                "rgb"
            )
        ) {

            return text;
        }


        if (
            text.includes("black")
        ) {

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
       HEX TO RGBA
       ===================================================== */

    function hexToRgba(
        hex,
        alpha
    ) {

        let value =
            String(hex)
                .replace(
                    "#",
                    ""
                )
                .trim();


        if (
            value.length === 3
        ) {

            value =
                value
                    .split("")
                    .map(
                        x => x + x
                    )
                    .join("");
        }


        if (
            value.length !== 6
        ) {

            return (
                `rgba(200,95,122,${alpha})`
            );
        }


        const number =
            parseInt(
                value,
                16
            );


        const r =
            (number >> 16) &
            255;


        const g =
            (number >> 8) &
            255;


        const b =
            number &
            255;


        return (
            `rgba(${r},${g},${b},${alpha})`
        );
    }


    /* =====================================================
       MAKEUP LANDMARKS
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
        42,
        183
    ];


    const LEFT_EYE = [

        33,
        7,
        163,
        144,
        145,
        153,
        154,
        155,
        133,
        173,
        157,
        158,
        159,
        160,
        161,
        246
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
        263,
        466,
        388,
        387,
        386,
        385,
        384,
        398
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


        /*
         * Outer lips.
         */

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


        /*
         * Remove inner mouth area.
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
        ].forEach(
            indexes => {

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
                    points.map(
                        p => p.x
                    );


                const ys =
                    points.map(
                        p => p.y
                    );


                const minX =
                    Math.min(
                        ...xs
                    );


                const maxX =
                    Math.max(
                        ...xs
                    );


                const minY =
                    Math.min(
                        ...ys
                    );


                const maxY =
                    Math.max(
                        ...ys
                    );


                const centerX =
                    (
                        minX +
                        maxX
                    ) / 2;


                const centerY =
                    (
                        minY +
                        maxY
                    ) / 2;


                const radius =
                    Math.max(
                        25,
                        (
                            maxX -
                            minX
                        ) * 0.9
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
                        (
                            maxY -
                            minY
                        ) * 2
                    ),
                    0,
                    0,
                    Math.PI * 2
                );


                ctx.fill();
            }
        );
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

        const eyes = [

            [
                33,
                246,
                161,
                160,
                159,
                158,
                157,
                173,
                133
            ],

            [
                362,
                398,
                384,
                385,
                386,
                387,
                388,
                466,
                263
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


        ctx.lineCap =
            "round";


        ctx.lineJoin =
            "round";


        eyes.forEach(
            indexes => {

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
            }
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

        /*
         * Simple lash-line effect.
         */

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


        [
            50,
            280
        ].forEach(
            index => {

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
            }
        );
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

        [
            1,
            116,
            345
        ].forEach(
            index => {

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
            }
        );
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


        const gradient =
            ctx.createRadialGradient(
                nose.x,
                nose.y,
                10,
                nose.x,
                nose.y,
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
            nose.x,
            nose.y,
            width * 0.18,
            height * 0.28,
            0,
            0,
            Math.PI * 2
        );


        ctx.fill();
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
            !landmarks
        ) {
            return;
        }


        switch (
            normalizedType
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
            tryOnCanvas.getContext(
                "2d"
            );


        if (!ctx) {

            console.error(
                "[Glamora AR] Canvas context unavailable."
            );

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


        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        /* =================================================
           DRAW CAMERA
           ================================================= */

        ctx.save();


        /*
         * Front camera behaves like a selfie camera.
         */

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


        /* =================================================
           FACE TRACKING
           ================================================= */

        if (
            faceLandmarker &&
            mediaPipeReady
        ) {

            try {

                const result =
                    faceLandmarker
                        .detectForVideo(
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


                    /*
                     * Mirror makeup to match
                     * mirrored front camera.
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

    async function switchCamera(
        event
    ) {

        if (event) {

            event.preventDefault();

            event.stopPropagation();
        }


        console.log(
            "[Glamora AR] Switching camera..."
        );


        cameraFacingMode =
            cameraFacingMode === "user"
                ? "environment"
                : "user";


        await startCamera();
    }


    /* =====================================================
       UPLOAD IMAGE
       ===================================================== */

    function handleImageUpload(
        event
    ) {

        const file =
            event.target.files?.[0];


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


        /*
         * Stop live camera.
         */

        stopCamera();


        clearError();


        setStatus(
            "Processing image..."
        );


        const objectUrl =
            URL.createObjectURL(
                file
            );


        if (tryOnImage) {

            tryOnImage.src =
                objectUrl;


            tryOnImage.classList.add(
                "show"
            );
        }


        if (tryOnPlaceholder) {

            tryOnPlaceholder.classList.remove(
                "show"
            );
        }


        if (!tryOnImage) {

            URL.revokeObjectURL(
                objectUrl
            );

            showError(
                "Image preview element was not found."
            );

            return;
        }


        tryOnImage.onload =
            async () => {

                try {

                    /*
                     * Make sure MediaPipe exists.
                     */

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


                    /*
                     * Draw uploaded image.
                     */

                    ctx.drawImage(
                        tryOnImage,
                        0,
                        0,
                        width,
                        height
                    );


                    /*
                     * Switch to IMAGE mode.
                     */

                    await faceLandmarker
                        .setOptions({
                            runningMode:
                                "IMAGE"
                        });


                    /*
                     * Detect face.
                     */

                    const result =
                        faceLandmarker.detect(
                            tryOnImage
                        );


                    /*
                     * Return to VIDEO mode.
                     */

                    await faceLandmarker
                        .setOptions({
                            runningMode:
                                "VIDEO"
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


                    /*
                     * Apply makeup.
                     */

                    drawMakeup(
                        ctx,
                        result.faceLandmarks[0],
                        width,
                        height
                    );


                    clearStatus();


                } catch (error) {

                    console.error(
                        "[Glamora AR] Image processing error:",
                        error
                    );


                    showError(
                        "Unable to process the uploaded image.\n\n" +
                        error.message
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


    /* =====================================================
       MODAL BACKDROP
       ===================================================== */

    if (tryOnModal) {

        tryOnModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    tryOnModal
                ) {

                    closeTryOn(
                        event
                    );
                }
            }
        );
    }


    /* =====================================================
       ESC KEY
       ===================================================== */

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

                closeTryOn(
                    event
                );
            }
        }
    );


    /* =====================================================
       CLEANUP
       ===================================================== */

    window.addEventListener(
        "beforeunload",
        () => {

            stopCamera();
        }
    );


    /* =====================================================
       FINAL DEBUG
       ===================================================== */

    console.log(
        "[Glamora AR] Virtual Try-On initialized"
    );

    console.log(
        "[Glamora AR] Camera mode:",
        cameraFacingMode
    );

    console.log(
        "[Glamora AR] MediaPipe source: LOCAL"
    );

})();


/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS - VIRTUAL TRY ON

   CAMERA FIRST
   LOCAL MEDIAPIPE
   LOCAL WASM
   LOCAL FACE LANDMARK MODEL

   IMPORTANT:
   CAMERA DOES NOT WAIT FOR MEDIAPIPE
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       STARTUP
       ===================================================== */

    console.log(
        "[Glamora AR] ================================="
    );

    console.log(
        "[Glamora AR] product_details.js loaded"
    );

    console.log(
        "[Glamora AR] ================================="
    );


    /* =====================================================
       DOM
       ===================================================== */

    const body =
        document.body;

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
       DOM DEBUG
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

    console.log(
        "[Glamora AR] Placeholder:",
        !!tryOnPlaceholder
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

    console.log(
        "[Glamora AR] Product shade:",
        productShade
    );

    console.log(
        "[Glamora AR] Product color:",
        productColor
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

    let cameraStartAttempts =
        0;

    let currentVideoWidth =
        0;

    let currentVideoHeight =
        0;


    /* =====================================================
       STATUS
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
       OPEN TRY ON
       ===================================================== */

    async function openTryOn(event) {

        if (event) {

            event.preventDefault();

            event.stopPropagation();
        }


        console.log(
            "[Glamora AR] ================================="
        );

        console.log(
            "[Glamora AR] TRY ON BUTTON CLICKED"
        );

        console.log(
            "[Glamora AR] ================================="
        );


        if (!tryOnModal) {

            console.error(
                "[Glamora AR] #tryOnModal not found."
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
       CLOSE TRY ON
       ===================================================== */

    function closeTryOn(event) {

        if (event) {

            event.preventDefault();

            event.stopPropagation();
        }


        console.log(
            "[Glamora AR] Closing Try On."
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

        clearStatus();

        clearCanvas();


        if (tryOnImage) {

            tryOnImage.classList.remove(
                "show"
            );

            tryOnImage.style.display =
                "none";

            tryOnImage.removeAttribute(
                "src"
            );
        }


        if (tryOnPlaceholder) {

            tryOnPlaceholder.classList.add(
                "show"
            );

            tryOnPlaceholder.style.display =
                "flex";
        }
    }


    /* =====================================================
       CAMERA SUPPORT
       ===================================================== */

    function checkCameraSupport() {

        if (
            !navigator.mediaDevices
        ) {

            return false;
        }


        if (
            !navigator.mediaDevices.getUserMedia
        ) {

            return false;
        }


        return true;
    }


    /* =====================================================
       START CAMERA
       ===================================================== */

    async function startCamera() {

        clearError();


        if (
            !checkCameraSupport()
        ) {

            showError(
                "Camera access is not supported by this browser. " +
                "Please use a recent version of Chrome or Firefox."
            );

            return false;
        }


        if (!tryOnVideo) {

            showError(
                "The camera video element #tryOnVideo was not found."
            );

            return false;
        }


        /*
         * Prevent duplicate startup.
         */

        if (
            cameraRunning &&
            mediaStream
        ) {

            console.log(
                "[Glamora AR] Camera is already running."
            );

            return true;
        }


        /*
         * Stop any old stream.
         */

        stopCamera();


        cameraStartAttempts++;


        console.log(
            "[Glamora AR] Camera start attempt:",
            cameraStartAttempts
        );


        try {

            setStatus(
                "Requesting camera permission..."
            );


            console.log(
                "[Glamora AR] Requesting browser camera permission..."
            );


            /*
             * IMPORTANT
             *
             * Start with the simplest possible
             * getUserMedia request.
             *
             * This avoids Linux/Chrome rejecting
             * complicated camera constraints.
             */

            const constraints = {

                video: true,

                audio: false
            };


            console.log(
                "[Glamora AR] Camera constraints:",
                constraints
            );


            /*
             * REQUEST CAMERA
             */

            const stream =
                await navigator.mediaDevices
                    .getUserMedia(
                        constraints
                    );


            console.log(
                "[Glamora AR] ================================="
            );

            console.log(
                "[Glamora AR] CAMERA PERMISSION GRANTED"
            );

            console.log(
                "[Glamora AR] ================================="
            );


            if (!stream) {

                throw new Error(
                    "Browser returned an empty camera stream."
                );
            }


            const tracks =
                stream.getVideoTracks();


            console.log(
                "[Glamora AR] Video tracks:",
                tracks.length
            );


            if (!tracks.length) {

                throw new Error(
                    "Camera stream contains no video track."
                );
            }


            const videoTrack =
                tracks[0];


            console.log(
                "[Glamora AR] Camera label:",
                videoTrack.label
            );


            console.log(
                "[Glamora AR] Camera settings:",
                videoTrack.getSettings()
            );


            /*
             * Save stream.
             */

            mediaStream =
                stream;


            /* =================================================
               VIDEO CONFIGURATION
               ================================================= */

            tryOnVideo.autoplay =
                true;

            tryOnVideo.muted =
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


            /*
             * IMPORTANT:
             *
             * Attach stream DIRECTLY to video.
             */

            tryOnVideo.srcObject =
                mediaStream;


            console.log(
                "[Glamora AR] Stream attached to #tryOnVideo."
            );


            /*
             * Make the VIDEO visible.
             *
             * We intentionally don't rely only
             * on the .show CSS class.
             */

            tryOnVideo.style.display =
                "block";

            tryOnVideo.style.visibility =
                "visible";

            tryOnVideo.style.opacity =
                "1";


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

                tryOnPlaceholder.style.display =
                    "none";
            }


            /*
             * Hide uploaded image.
             */

            if (tryOnImage) {

                tryOnImage.classList.remove(
                    "show"
                );

                tryOnImage.style.display =
                    "none";
            }


            /* =================================================
               WAIT FOR VIDEO METADATA
               ================================================= */

            setStatus(
                "Starting camera..."
            );


            await waitForVideoMetadata();


            /* =================================================
               START VIDEO PLAYBACK
               ================================================= */

            try {

                await tryOnVideo.play();

            } catch (playError) {

                console.warn(
                    "[Glamora AR] First video.play() failed:",
                    playError
                );


                /*
                 * Retry after a short delay.
                 */

                await new Promise(
                    resolve => {

                        setTimeout(
                            resolve,
                            300
                        );
                    }
                );


                await tryOnVideo.play();
            }


            console.log(
                "[Glamora AR] video.play() successful."
            );


            /* =================================================
               VIDEO DIMENSIONS
               ================================================= */

            currentVideoWidth =
                tryOnVideo.videoWidth;

            currentVideoHeight =
                tryOnVideo.videoHeight;


            console.log(
                "[Glamora AR] Camera dimensions:",
                currentVideoWidth,
                "x",
                currentVideoHeight
            );


            if (
                !currentVideoWidth ||
                !currentVideoHeight
            ) {

                throw new Error(
                    "Camera opened, but no video frames are available."
                );
            }


            /* =================================================
               CANVAS
               ================================================= */

            resizeCanvas(
                currentVideoWidth,
                currentVideoHeight
            );


            /* =================================================
               CAMERA READY
               ================================================= */

            cameraRunning =
                true;


            cameraStartAttempts =
                0;


            /*
             * Track ended handler.
             */

            videoTrack.onended =
                () => {

                    console.warn(
                        "[Glamora AR] Camera track ended."
                    );


                    cameraRunning =
                        false;


                    showError(
                        "The camera stopped unexpectedly. " +
                        "Please click Start Camera and try again."
                    );
                };


            /*
             * Show controls.
             */

            if (switchCameraBtn) {

                switchCameraBtn.style.display =
                    "flex";

                switchCameraBtn.classList.add(
                    "show"
                );
            }


            if (stopCameraBtn) {

                stopCameraBtn.style.display =
                    "flex";

                stopCameraBtn.classList.add(
                    "show"
                );
            }


            /* =================================================
               IMPORTANT CAMERA DEBUG
               ================================================= */

            console.log(
                "[Glamora AR] ================================="
            );

            console.log(
                "[Glamora AR] CAMERA IS NOW RUNNING"
            );

            console.log(
                "[Glamora AR] videoWidth:",
                tryOnVideo.videoWidth
            );

            console.log(
                "[Glamora AR] videoHeight:",
                tryOnVideo.videoHeight
            );

            console.log(
                "[Glamora AR] readyState:",
                tryOnVideo.readyState
            );

            console.log(
                "[Glamora AR] paused:",
                tryOnVideo.paused
            );

            console.log(
                "[Glamora AR] stream active:",
                mediaStream.active
            );

            console.log(
                "[Glamora AR] ================================="
            );


            setStatus(
                "Camera ready. Loading face tracking..."
            );


            /* =================================================
               START CAMERA RENDER LOOP
               ================================================= */

            renderCameraFrame();


            /* =================================================
               LOAD MEDIAPIPE IN BACKGROUND
               ================================================= */

            loadMediaPipe();


            return true;


        } catch (error) {

            console.error(
                "[Glamora AR] ================================="
            );

            console.error(
                "[Glamora AR] CAMERA START ERROR"
            );

            console.error(
                "[Glamora AR] Error name:",
                error?.name
            );

            console.error(
                "[Glamora AR] Error message:",
                error?.message
            );

            console.error(
                "[Glamora AR] Full error:",
                error
            );

            console.error(
                "[Glamora AR] ================================="
            );


            /*
             * Retry AbortError once.
             */

            if (
                error?.name === "AbortError" &&
                cameraStartAttempts < 2
            ) {

                console.warn(
                    "[Glamora AR] Camera startup interrupted."
                );


                stopCamera();


                await new Promise(
                    resolve => {

                        setTimeout(
                            resolve,
                            700
                        );
                    }
                );


                return await startCamera();
            }


            handleCameraError(
                error
            );


            return false;
        }
    }


    /* =====================================================
       WAIT FOR VIDEO METADATA
       ===================================================== */

    function waitForVideoMetadata() {

        return new Promise(
            (resolve, reject) => {

                if (!tryOnVideo) {

                    reject(
                        new Error(
                            "Video element is missing."
                        )
                    );

                    return;
                }


                /*
                 * Already ready.
                 */

                if (
                    tryOnVideo.readyState >= 1 &&
                    tryOnVideo.videoWidth > 0 &&
                    tryOnVideo.videoHeight > 0
                ) {

                    resolve();

                    return;
                }


                let finished =
                    false;


                const cleanup =
                    () => {

                        tryOnVideo.removeEventListener(
                            "loadedmetadata",
                            onMetadata
                        );

                        tryOnVideo.removeEventListener(
                            "canplay",
                            onCanPlay
                        );

                        tryOnVideo.removeEventListener(
                            "error",
                            onError
                        );
                    };


                const finish =
                    () => {

                        if (finished) {

                            return;
                        }


                        if (
                            !tryOnVideo.videoWidth ||
                            !tryOnVideo.videoHeight
                        ) {

                            return;
                        }


                        finished =
                            true;


                        cleanup();


                        resolve();
                    };


                const onMetadata =
                    () => {

                        console.log(
                            "[Glamora AR] Video metadata loaded."
                        );


                        finish();
                    };


                const onCanPlay =
                    () => {

                        console.log(
                            "[Glamora AR] Video can play."
                        );


                        finish();
                    };


                const onError =
                    () => {

                        if (finished) {

                            return;
                        }


                        finished =
                            true;


                        cleanup();


                        reject(
                            new Error(
                                "The browser reported an error while loading the camera video."
                            )
                        );
                    };


                tryOnVideo.addEventListener(
                    "loadedmetadata",
                    onMetadata
                );


                tryOnVideo.addEventListener(
                    "canplay",
                    onCanPlay
                );


                tryOnVideo.addEventListener(
                    "error",
                    onError
                );


                /*
                 * Safety timeout.
                 */

                setTimeout(
                    () => {

                        if (finished) {

                            return;
                        }


                        if (
                            tryOnVideo.videoWidth &&
                            tryOnVideo.videoHeight
                        ) {

                            finish();

                            return;
                        }


                        finished =
                            true;


                        cleanup();


                        reject(
                            new Error(
                                "Camera connected, but the browser did not provide video dimensions within 5 seconds."
                            )
                        );

                    },
                    5000
                );
            }
        );
    }


    /* =====================================================
       CAMERA ERROR
       ===================================================== */

    function handleCameraError(error) {

        stopCamera();


        if (!error) {

            showError(
                "Unable to start the camera."
            );

            return;
        }


        const name =
            error.name ||
            "UnknownError";


        const message =
            error.message ||
            "Unknown camera error.";


        /* =================================================
           PERMISSION
           ================================================= */

        if (
            name === "NotAllowedError"
        ) {

            showError(
                "Camera permission was denied.\n\n" +
                "Click the camera/permission icon beside " +
                "127.0.0.1 in Chrome and select Allow for Camera."
            );

            return;
        }


        /* =================================================
           CAMERA NOT FOUND
           ================================================= */

        if (
            name === "NotFoundError"
        ) {

            showError(
                "No camera was found by the browser.\n\n" +
                "Please check that your webcam is connected " +
                "and available to Chrome."
            );

            return;
        }


        /* =================================================
           CAMERA BUSY
           ================================================= */

        if (
            name === "NotReadableError"
        ) {

            showError(
                "Chrome could not read the camera.\n\n" +
                "Close applications or browser tabs using the webcam, " +
                "such as Zoom, Meet, OBS, Cheese, Discord, or another camera tab."
            );

            return;
        }


        /* =================================================
           CONSTRAINT
           ================================================= */

        if (
            name === "OverconstrainedError"
        ) {

            showError(
                "The camera rejected the requested settings."
            );

            return;
        }


        /* =================================================
           SECURITY
           ================================================= */

        if (
            name === "SecurityError"
        ) {

            showError(
                "The browser blocked camera access because of a security restriction."
            );

            return;
        }


        /* =================================================
           ABORT
           ================================================= */

        if (
            name === "AbortError"
        ) {

            showError(
                "Chrome interrupted camera startup.\n\n" +
                "Close other camera applications/tabs and try again."
            );

            return;
        }


        /* =================================================
           UNKNOWN
           ================================================= */

        showError(
            "Camera error:\n\n" +
            name +
            "\n" +
            message
        );
    }


    /* =====================================================
       STOP CAMERA
       ===================================================== */

    function stopCamera() {

        console.log(
            "[Glamora AR] Stopping camera..."
        );


        cameraRunning =
            false;


        /* =================================================
           STOP ANIMATION
           ================================================= */

        if (animationFrame) {

            cancelAnimationFrame(
                animationFrame
            );

            animationFrame =
                null;
        }


        /* =================================================
           STOP STREAM
           ================================================= */

        if (mediaStream) {

            try {

                mediaStream
                    .getTracks()
                    .forEach(
                        track => {

                            try {

                                track.stop();

                            } catch (error) {

                                console.warn(
                                    "[Glamora AR] Could not stop track:",
                                    error
                                );
                            }
                        }
                    );

            } catch (error) {

                console.warn(
                    "[Glamora AR] Stream cleanup error:",
                    error
                );
            }


            mediaStream =
                null;
        }


        /* =================================================
           CLEAR VIDEO
           ================================================= */

        if (tryOnVideo) {

            try {

                tryOnVideo.pause();

            } catch (error) {

                console.warn(
                    "[Glamora AR] Video pause error:",
                    error
                );
            }


            tryOnVideo.srcObject =
                null;


            tryOnVideo.classList.remove(
                "show"
            );


            tryOnVideo.style.display =
                "none";
        }


        /* =================================================
           CONTROLS
           ================================================= */

        if (switchCameraBtn) {

            switchCameraBtn.classList.remove(
                "show"
            );

            switchCameraBtn.style.display =
                "none";
        }


        if (stopCameraBtn) {

            stopCameraBtn.classList.remove(
                "show"
            );

            stopCameraBtn.style.display =
                "none";
        }


        console.log(
            "[Glamora AR] Camera stopped."
        );
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
                "[Glamora AR] Loading LOCAL MediaPipe..."
            );


            setStatus(
                "Loading face tracking..."
            );


            /* =================================================
               LOCAL JAVASCRIPT MODULE
               ================================================= */

            const module =
                await import(
                    "/static/mediapipe/vision_bundle.mjs"
                );


            console.log(
                "[Glamora AR] Local MediaPipe module loaded."
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
                    "FaceLandmarker or FilesetResolver is unavailable."
                );
            }


            /* =================================================
               LOCAL WASM
               ================================================= */

            console.log(
                "[Glamora AR] Loading LOCAL WASM..."
            );


            const vision =
                await FilesetResolver.forVisionTasks(
                    "/static/mediapipe/wasm"
                );


            console.log(
                "[Glamora AR] Local WASM loaded."
            );


            /* =================================================
               LOCAL FACE MODEL
               ================================================= */

            const modelUrl =
                "/static/models/face_landmarker.task";


            console.log(
                "[Glamora AR] Loading model:",
                modelUrl
            );


            /* =================================================
               TRY GPU
               ================================================= */

            try {

                console.log(
                    "[Glamora AR] Trying GPU delegate..."
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


                console.log(
                    "[Glamora AR] GPU delegate ready."
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
                    "[Glamora AR] Falling back to CPU..."
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


            if (
                !faceLandmarker
            ) {

                throw new Error(
                    "Face Landmarker could not be created."
                );
            }


            mediaPipeReady =
                true;


            console.log(
                "[Glamora AR] ================================="
            );

            console.log(
                "[Glamora AR] FACE TRACKING READY"
            );

            console.log(
                "[Glamora AR] ================================="
            );


            if (cameraRunning) {

                setStatus(
                    "Face tracking ready. Look at the camera."
                );
            }


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
             * DO NOT STOP THE CAMERA.
             */

            showError(
                "Face tracking failed.\n\n" +
                error.message
            );


            if (cameraRunning) {

                setStatus(
                    "Camera is active."
                );
            }


        } finally {

            mediaPipeLoading =
                false;
        }
    }


    /* =====================================================
       RESIZE CANVAS
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


        tryOnCanvas.style.width =
            "100%";


        tryOnCanvas.style.height =
            "100%";
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
         * HEX
         */

        if (
            /^#[0-9a-f]{3,8}$/i.test(
                text
            )
        ) {

            return text;
        }


        /*
         * RGB
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
                        x =>
                            x + x
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
         * Remove inner mouth.
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
                        p =>
                            p.x
                    );


                const ys =
                    points.map(
                        p =>
                            p.y
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

        if (!landmarks) {

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


        /*
         * Clear overlay.
         */
        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        /* =================================================
           IMPORTANT
           
           The VIDEO element itself displays the camera.

           The canvas only draws makeup.

           Therefore we DO NOT draw the camera
           into the canvas anymore.
           ================================================= */


        /* =================================================
           FACE DETECTION
           ================================================= */

        if (
            faceLandmarker &&
            mediaPipeReady &&
            tryOnVideo.readyState >= 2
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
                    result.faceLandmarks.length > 0
                ) {

                    const landmarks =
                        result.faceLandmarks[0];


                    /*
                     * The video is normally mirrored
                     * for selfie view using CSS.
                     *
                     * Mirror the canvas makeup as well.
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
                    "[Glamora AR] Face detection error:",
                    error
                );
            }
        }


        /*
         * Continue animation.
         */

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

            event.stopPropagation();
        }


        console.log(
            "[Glamora AR] Switching camera..."
        );


        cameraFacingMode =
            cameraFacingMode === "user"
                ? "environment"
                : "user";


        /*
         * Stop current stream.
         */

        stopCamera();


        /*
         * Use the selected camera direction
         * for the next request.
         *
         * If the device/browser doesn't support
         * the requested facing mode, fall back
         * to the default camera.
         */

        try {

            setStatus(
                "Switching camera..."
            );


            const constraints = {

                video: {

                    facingMode: {
                        ideal:
                            cameraFacingMode
                    }
                },

                audio: false
            };


            const stream =
                await navigator.mediaDevices
                    .getUserMedia(
                        constraints
                    );


            mediaStream =
                stream;


            const track =
                stream.getVideoTracks()[0];


            if (!track) {

                throw new Error(
                    "No camera track was returned."
                );
            }


            tryOnVideo.srcObject =
                stream;


            tryOnVideo.autoplay =
                true;

            tryOnVideo.muted =
                true;

            tryOnVideo.playsInline =
                true;


            tryOnVideo.style.display =
                "block";

            tryOnVideo.style.visibility =
                "visible";

            tryOnVideo.style.opacity =
                "1";


            tryOnVideo.classList.add(
                "show"
            );


            if (tryOnPlaceholder) {

                tryOnPlaceholder.style.display =
                    "none";

                tryOnPlaceholder.classList.remove(
                    "show"
                );
            }


            await waitForVideoMetadata();


            await tryOnVideo.play();


            currentVideoWidth =
                tryOnVideo.videoWidth;

            currentVideoHeight =
                tryOnVideo.videoHeight;


            resizeCanvas(
                currentVideoWidth,
                currentVideoHeight
            );


            cameraRunning =
                true;


            track.onended =
                () => {

                    cameraRunning =
                        false;

                    showError(
                        "The camera stopped unexpectedly."
                    );
                };


            setStatus(
                "Camera switched."
            );


            renderCameraFrame();


            console.log(
                "[Glamora AR] Camera switched to:",
                cameraFacingMode
            );


        } catch (error) {

            console.error(
                "[Glamora AR] Camera switch failed:",
                error
            );


            /*
             * If switching fails,
             * return to the default camera.
             */

            cameraFacingMode =
                cameraFacingMode === "user"
                    ? "environment"
                    : "user";


            await startCamera();
        }
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


        if (!tryOnImage) {

            URL.revokeObjectURL(
                objectUrl
            );


            showError(
                "Image preview element was not found."
            );


            return;
        }


        tryOnImage.src =
            objectUrl;


        tryOnImage.style.display =
            "block";


        tryOnImage.classList.add(
            "show"
        );


        if (tryOnPlaceholder) {

            tryOnPlaceholder.classList.remove(
                "show"
            );

            tryOnPlaceholder.style.display =
                "none";
        }


        tryOnImage.onload =
            async () => {

                try {

                    /*
                     * Load MediaPipe if necessary.
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
                     * Draw uploaded image
                     * into the canvas.
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
                     * Draw makeup.
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
       TRY ON BUTTON
       ===================================================== */

    if (tryOnBtn) {

        tryOnBtn.addEventListener(
            "click",
            openTryOn
        );

    } else {

        console.error(
            "[Glamora AR] ERROR: #tryOnBtn was not found."
        );
    }


    /* =====================================================
       CLOSE BUTTON
       ===================================================== */

    if (tryOnClose) {

        tryOnClose.addEventListener(
            "click",
            closeTryOn
        );
    }


    /* =====================================================
       START CAMERA BUTTON
       ===================================================== */

    if (startCameraBtn) {

        startCameraBtn.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                clearError();

                await startCamera();
            }
        );
    }


    /* =====================================================
       STOP CAMERA BUTTON
       ===================================================== */

    if (stopCameraBtn) {

        stopCameraBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                stopCamera();
            }
        );
    }


    /* =====================================================
       SWITCH CAMERA BUTTON
       ===================================================== */

    if (switchCameraBtn) {

        switchCameraBtn.addEventListener(
            "click",
            switchCamera
        );
    }


    /* =====================================================
       UPLOAD BUTTON
       ===================================================== */

    if (
        uploadImageBtn &&
        tryOnImageInput
    ) {

        uploadImageBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                tryOnImageInput.click();
            }
        );
    }


    /* =====================================================
       IMAGE INPUT
       ===================================================== */

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
       ESCAPE KEY
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
       PAGE CLEANUP
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

    console.log(
        "[Glamora AR] ================================="
    );

    console.log(
        "[Glamora AR] VIRTUAL TRY-ON INITIALIZED"
    );

    console.log(
        "[Glamora AR] Camera: browser getUserMedia"
    );

    console.log(
        "[Glamora AR] MediaPipe: LOCAL"
    );

    console.log(
        "[Glamora AR] ================================="
    );

})();
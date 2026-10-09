
/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS - VIRTUAL TRY ON

   CAMERA:
   - Requests access only after user confirmation
   - Handles permission delays and camera errors
   - Mirrors the front-camera preview horizontally
   - Safely starts, stops, and switches cameras
   - Cancels outdated camera startup operations
   - Stops late-arriving camera streams

   MEDIAPIPE:
   - Uses local JavaScript bundle, WASM, and face model
   - Supports GPU with CPU fallback
   - Supports VIDEO and IMAGE modes

   PRODUCT IMAGE:
   - Opens product images in a popup
   - No page navigation
   - No new tab
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

    const tryOnStatus = document.getElementById("tryOnStatus");
    const tryOnStatusText =
        document.getElementById("tryOnStatusText");
    const tryOnError = document.getElementById("tryOnError");

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

    /* Product image popup */

    const mainProductImg =
        document.getElementById("mainProductImg");
    const thumbnailGallery =
        document.getElementById("thumbnailGallery");
    const productImageModal =
        document.getElementById("productImageModal");
    const productImageModalImg =
        document.getElementById("productImageModalImg");
    const productImageModalClose =
        document.getElementById("productImageModalClose");

    /* =====================================================
       PRODUCT DATA
       ===================================================== */

    const body = document.body;

    const productId = body.dataset.productId || "";
    const productName = body.dataset.productName || "";

    const productType =
        body.dataset.productType ||
        body.dataset.product_type ||
        "";

    const productShade = body.dataset.productShade || "";
    const productColor = body.dataset.productColor || "";

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
    let cameraStarting = false;
    let cameraFacingMode = "user";

    let mediaPipeLoading = false;
    let mediaPipeReady = false;

    let lastFaceDetected = false;
    let activeImageURL = null;

    /*
     * Every startup receives an ID.
     * Stopping or switching the camera invalidates old IDs.
     * This prevents a delayed camera request from reopening
     * the camera after the user has stopped or closed it.
     */
    let cameraStartupId = 0;

    let imageProcessingId = 0;

    const CAMERA_REQUEST_TIMEOUT = 15000;
    const VIDEO_READY_TIMEOUT = 12000;

    /* =====================================================
       CANVAS
       ===================================================== */

    const ctx = tryOnCanvas
        ? tryOnCanvas.getContext("2d")
        : null;

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

        if (tryOnStatusText) {
            tryOnStatusText.textContent = message;
        }

        if (tryOnStatus) {
            tryOnStatus.style.display = "flex";
        }
    }

    function hideError() {
        if (tryOnError) {
            tryOnError.textContent = "";
            tryOnError.style.display = "none";
        }
    }

    function isTryOnModalOpen() {
        if (!tryOnModal) {
            return false;
        }

        if (tryOnModal.classList.contains("show")) {
            return true;
        }

        return window.getComputedStyle(tryOnModal).display !== "none";
    }

    function stopStream(stream) {
        if (!stream) {
            return;
        }

        stream.getTracks().forEach(track => {
            try {
                track.stop();
            } catch (error) {
                console.warn(
                    "[Glamora AR] Could not stop camera track:",
                    error
                );
            }
        });
    }

    /* =====================================================
       CAMERA ORIENTATION
       ===================================================== */

    function resetPreviewOrientation() {
        const mirrored = cameraFacingMode === "user";
        const transform = mirrored ? "scaleX(-1)" : "none";

        if (tryOnVideo) {
            tryOnVideo.style.transform = transform;
            tryOnVideo.style.webkitTransform = transform;
        }

        if (tryOnCanvas) {
            tryOnCanvas.style.transform = transform;
            tryOnCanvas.style.webkitTransform = transform;
        }

        if (tryOnImage) {
            tryOnImage.style.transform = "none";
            tryOnImage.style.webkitTransform = "none";
        }
    }

    /* =====================================================
       PRODUCT IMAGE POPUP
       ===================================================== */

    function openProductImagePopup(imageSrc, imageAlt) {
        if (
            !productImageModal ||
            !productImageModalImg ||
            !imageSrc
        ) {
            return;
        }

        productImageModalImg.src = imageSrc;
        productImageModalImg.alt =
            imageAlt || productName || "Product image";

        productImageModal.classList.add("active");
        productImageModal.setAttribute("aria-hidden", "false");

        document.body.classList.add("image-modal-open");

        console.log("[Glamora AR] Product image popup opened.");
    }

    function closeProductImagePopup() {
        if (!productImageModal) {
            return;
        }

        productImageModal.classList.remove("active");
        productImageModal.setAttribute("aria-hidden", "true");

        document.body.classList.remove("image-modal-open");

        window.setTimeout(() => {
            if (
                !productImageModal.classList.contains("active") &&
                productImageModalImg
            ) {
                productImageModalImg.src = "";
            }
        }, 250);
    }

    if (mainProductImg) {
        mainProductImg.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            const imageSrc =
                mainProductImg.dataset.fullImage ||
                mainProductImg.currentSrc ||
                mainProductImg.src;

            openProductImagePopup(
                imageSrc,
                mainProductImg.alt || productName
            );
        });
    }

    if (thumbnailGallery) {
        const thumbnails =
            thumbnailGallery.querySelectorAll(".thumbnail");

        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();

                const imageSrc = thumbnail.dataset.image;

                const imageAlt =
                    thumbnail.dataset.alt ||
                    productName ||
                    "Product image";

                if (!imageSrc) {
                    return;
                }

                if (mainProductImg) {
                    mainProductImg.src = imageSrc;
                    mainProductImg.dataset.fullImage = imageSrc;
                    mainProductImg.alt = imageAlt;
                }

                thumbnails.forEach(item => {
                    item.classList.remove("thumbnail-active");
                    item.classList.remove("thumbnail-primary");
                });

                thumbnail.classList.add("thumbnail-active");

                openProductImagePopup(imageSrc, imageAlt);
            });
        });
    }

    if (productImageModalClose) {
        productImageModalClose.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            closeProductImagePopup();
        });
    }

    if (productImageModal) {
        productImageModal.addEventListener("click", event => {
            if (event.target === productImageModal) {
                closeProductImagePopup();
            }
        });
    }

    /* =====================================================
       PRODUCT TYPE AND COLOR
       ===================================================== */

    function normalizeProductType(type) {
        return String(type || "")
            .trim()
            .toLowerCase()
            .replace(/[_\s-]+/g, "");
    }

    const normalizedType = normalizeProductType(productType);

    function getProductColor() {
        const value = String(productColor || productShade || "")
            .trim()
            .toLowerCase();

        if (!value) {
            return "#b84d6b";
        }

        if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value)) {
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
            red: "#c92d45",
            pink: "#d96c8c",
            peach: "#ed9b82"
        };

        for (const key of Object.keys(colorMap)) {
            if (value.includes(key)) {
                return colorMap[key];
            }
        }

        return "#b84d6b";
    }

    const makeupColor = getProductColor();

    /* =====================================================
       CAMERA PERMISSION PROMPT
       ===================================================== */

    function showCameraPermissionPrompt() {
        const existing = document.getElementById(
            "glamoraCameraPermission"
        );

        if (existing) {
            existing.style.display = "flex";
            return;
        }

        const overlay = document.createElement("div");
        overlay.id = "glamoraCameraPermission";

        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            zIndex: "999999",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(30, 15, 20, 0.65)",
            backdropFilter: "blur(8px)"
        });

        const card = document.createElement("div");

        Object.assign(card.style, {
            width: "min(420px, 100%)",
            background: "#fff5f7",
            borderRadius: "24px",
            padding: "32px 26px",
            textAlign: "center",
            boxShadow: "0 25px 70px rgba(164,73,98,.25)"
        });

        const icon = document.createElement("div");
        icon.textContent = "📷";

        Object.assign(icon.style, {
            fontSize: "48px",
            marginBottom: "14px"
        });

        const title = document.createElement("h2");
        title.textContent = "Camera Access Required";

        Object.assign(title.style, {
            margin: "0 0 10px",
            color: "#26191d",
            fontFamily: "Playfair Display, serif"
        });

        const message = document.createElement("p");

        message.textContent =
            "Glamora AR needs access to your camera to detect your face and show how this product looks on you.";

        Object.assign(message.style, {
            margin: "0 auto 22px",
            maxWidth: "340px",
            lineHeight: "1.6",
            color: "#806b72",
            fontFamily: "DM Sans, sans-serif"
        });

        const allowButton = document.createElement("button");
        allowButton.type = "button";
        allowButton.textContent = "Allow Camera Access";

        Object.assign(allowButton.style, {
            width: "100%",
            padding: "14px 20px",
            border: "0",
            borderRadius: "999px",
            background: "#c85f7a",
            color: "#ffffff",
            fontWeight: "600",
            fontSize: "15px",
            cursor: "pointer"
        });

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.textContent = "Not Now";

        Object.assign(cancelButton.style, {
            marginTop: "10px",
            width: "100%",
            padding: "12px 20px",
            border: "0",
            background: "transparent",
            color: "#806b72",
            cursor: "pointer"
        });

        card.append(
            icon,
            title,
            message,
            allowButton,
            cancelButton
        );

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        allowButton.addEventListener("click", async () => {
            overlay.remove();

            /*
             * Start directly from the user's click so the browser
             * permission request is initiated by explicit action.
             */
            await startCamera();
        });

        cancelButton.addEventListener("click", () => {
            overlay.remove();
            setStatus("Camera access was not requested.");
        });
    }

    /* =====================================================
       WAIT FOR VIDEO TO BECOME READY
       ===================================================== */

    function waitForVideoReady(
        video,
        timeoutMs = VIDEO_READY_TIMEOUT
    ) {
        return new Promise((resolve, reject) => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                resolve();
                return;
            }

            let finished = false;
            let intervalId = null;
            let timeoutId = null;

            const cleanup = () => {
                video.removeEventListener("loadedmetadata", checkReady);
                video.removeEventListener("loadeddata", checkReady);

                if (intervalId !== null) {
                    window.clearInterval(intervalId);
                }

                if (timeoutId !== null) {
                    window.clearTimeout(timeoutId);
                }
            };

            const finish = error => {
                if (finished) {
                    return;
                }

                finished = true;
                cleanup();

                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            };

            const checkReady = () => {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    finish();
                }
            };

            video.addEventListener("loadedmetadata", checkReady);
            video.addEventListener("loadeddata", checkReady);

            intervalId = window.setInterval(checkReady, 100);

            timeoutId = window.setTimeout(() => {
                const error = new Error(
                    "The camera opened, but the video preview did not become ready. Check whether another application is using the camera."
                );

                error.name = "VideoReadyTimeout";
                finish(error);
            }, timeoutMs);

            checkReady();
        });
    }

    /* =====================================================
       REQUEST CAMERA WITH TIMEOUT AND LATE-STREAM CLEANUP
       ===================================================== */

    async function requestCameraStream(
        constraints,
        startupId
    ) {
        if (
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices.getUserMedia !== "function"
        ) {
            const error = new Error(
                "Camera access is unavailable. Use localhost or HTTPS and check browser support."
            );

            error.name = "CameraUnavailableError";
            throw error;
        }

        let timedOut = false;
        let timeoutId = null;

        /*
         * A browser permission request cannot be forcibly cancelled.
         * If it resolves after this startup is obsolete, immediately
         * stop the stream rather than allowing the camera to reopen.
         */
        const cameraPromise =
            navigator.mediaDevices.getUserMedia(constraints);

        cameraPromise.then(stream => {
            if (
                timedOut ||
                startupId !== cameraStartupId ||
                !isTryOnModalOpen()
            ) {
                stopStream(stream);
            }
        }).catch(() => {
            // The awaited promise below handles the error.
        });

        const timeoutPromise = new Promise((resolve, reject) => {
            timeoutId = window.setTimeout(() => {
                timedOut = true;

                const error = new Error(
                    "The camera permission request did not finish in time."
                );

                error.name = "CameraRequestTimeout";
                reject(error);
            }, CAMERA_REQUEST_TIMEOUT);
        });

        try {
            const stream = await Promise.race([
                cameraPromise,
                timeoutPromise
            ]);

            if (
                startupId !== cameraStartupId ||
                !isTryOnModalOpen()
            ) {
                stopStream(stream);

                const error = new Error(
                    "Camera startup was cancelled."
                );

                error.name = "AbortError";
                throw error;
            }

            return stream;

        } finally {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
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
            const startedAt = Date.now();

            while (mediaPipeLoading) {
                if (Date.now() - startedAt > 30000) {
                    throw new Error(
                        "Timed out while waiting for face tracking to initialize."
                    );
                }

                await new Promise(resolve => {
                    window.setTimeout(resolve, 100);
                });
            }

            return Boolean(mediaPipeReady && faceLandmarker);
        }

        mediaPipeLoading = true;

        try {
            setStatus("Loading face tracking...");

            console.log("[Glamora AR] Loading local MediaPipe...");

            const vision = await import(
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

            const options = {
                runningMode: "VIDEO",
                numFaces: 1,
                minFaceDetectionConfidence: 0.35,
                minFacePresenceConfidence: 0.35,
                minTrackingConfidence: 0.35
            };

            try {
                faceLandmarker =
                    await FaceLandmarker.createFromOptions(
                        filesetResolver,
                        {
                            ...options,
                            baseOptions: {
                                modelAssetPath:
                                    "/static/models/face_landmarker.task",
                                delegate: "GPU"
                            }
                        }
                    );

            } catch (gpuError) {
                console.warn(
                    "[Glamora AR] GPU initialization failed; trying CPU.",
                    gpuError
                );

                faceLandmarker =
                    await FaceLandmarker.createFromOptions(
                        filesetResolver,
                        {
                            ...options,
                            baseOptions: {
                                modelAssetPath:
                                    "/static/models/face_landmarker.task",
                                delegate: "CPU"
                            }
                        }
                    );
            }

            mediaPipeReady = true;

            console.log("[Glamora AR] MediaPipe ready.");

            return true;

        } catch (error) {
            console.error(
                "[Glamora AR] MediaPipe loading failed:",
                error
            );

            if (faceLandmarker) {
                try {
                    faceLandmarker.close();
                } catch (closeError) {
                    console.warn(closeError);
                }
            }

            faceLandmarker = null;
            mediaPipeReady = false;

            showError(
                "Face tracking failed. Check the local MediaPipe files and model path. " +
                (error.message || "")
            );

            return false;

        } finally {
            mediaPipeLoading = false;
        }
    }

    /* =====================================================
       START CAMERA
       ===================================================== */

    async function startCamera() {
        if (cameraStarting) {
            console.log(
                "[Glamora AR] Camera startup is already in progress."
            );
            return;
        }

        if (!isTryOnModalOpen()) {
            console.warn(
                "[Glamora AR] Open the try-on modal before starting the camera."
            );
            return;
        }

        if (
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices.getUserMedia !== "function"
        ) {
            showError(
                "Camera access is unavailable. Open Glamora AR through localhost or HTTPS and check browser support."
            );
            return;
        }

        if (!tryOnVideo || !tryOnCanvas || !ctx) {
            showError(
                "Camera preview elements are missing. Check tryOnVideo and tryOnCanvas in your HTML."
            );
            return;
        }

        /*
         * Each startup gets its own ID. Only this startup may
         * update the camera UI or retain the resulting stream.
         */
        const startupId = ++cameraStartupId;

        cameraStarting = true;

        /*
         * Do not invalidate the startup ID created just above.
         */
        stopCamera(false, false);

        hideError();
        setStatus("Requesting camera access...");

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

            const stream = await requestCameraStream(
                constraints,
                startupId
            );

            /*
             * Ignore any result from an outdated startup.
             */
            if (
                startupId !== cameraStartupId ||
                !isTryOnModalOpen()
            ) {
                stopStream(stream);
                return;
            }

            mediaStream = stream;

            console.log("[Glamora AR] Camera permission granted.");

            tryOnVideo.srcObject = mediaStream;
            tryOnVideo.muted = true;
            tryOnVideo.playsInline = true;
            tryOnVideo.autoplay = true;

            tryOnVideo.style.display = "block";

            await tryOnVideo.play();

            if (
                startupId !== cameraStartupId ||
                !isTryOnModalOpen()
            ) {
                return;
            }

            await waitForVideoReady(tryOnVideo);

            if (
                startupId !== cameraStartupId ||
                !isTryOnModalOpen() ||
                !mediaStream
            ) {
                return;
            }

            const width = tryOnVideo.videoWidth;
            const height = tryOnVideo.videoHeight;

            if (!width || !height) {
                throw new Error(
                    "The camera returned an empty video frame."
                );
            }

            tryOnCanvas.width = width;
            tryOnCanvas.height = height;
            tryOnCanvas.style.display = "block";

            if (tryOnImage) {
                tryOnImage.style.display = "none";
            }

            if (tryOnPlaceholder) {
                tryOnPlaceholder.style.display = "none";
            }

            resetPreviewOrientation();

            cameraRunning = true;

            setStatus("Camera ready. Loading face tracking...");

            const loaded = await loadMediaPipe();

            if (
                startupId !== cameraStartupId ||
                !isTryOnModalOpen()
            ) {
                return;
            }

            if (!loaded || !faceLandmarker) {
                stopCamera(false);
                return;
            }

            hideError();

            setStatus("Move your face into the camera.");

            renderCameraFrame();

        } catch (error) {
            /*
             * An older startup must never overwrite the state
             * or error message of a newer camera operation.
             */
            if (startupId !== cameraStartupId) {
                console.log(
                    "[Glamora AR] Ignoring an outdated camera error."
                );
                return;
            }

            console.error("[Glamora AR] Camera error:", error);

            cameraRunning = false;

            if (error.name === "NotAllowedError") {
                showError(
                    "Camera permission was denied. Allow camera access in Chrome site settings and try again."
                );

            } else if (error.name === "NotFoundError") {
                showError(
                    "No camera was found. Check that your camera is connected and enabled."
                );

            } else if (error.name === "NotReadableError") {
                showError(
                    "The camera is busy or unavailable. Close other applications using it and try again."
                );

            } else if (error.name === "OverconstrainedError") {
                showError(
                    "The requested camera settings are not supported. Try another camera."
                );

            } else if (error.name === "SecurityError") {
                showError(
                    "Camera access was blocked by browser security. Use localhost or HTTPS."
                );

            } else if (error.name === "CameraRequestTimeout") {
                showError(
                    "Still waiting for camera access. If Chrome shows a permission prompt, allow it. If no prompt appears, check this site's camera permission in Chrome settings."
                );

            } else if (error.name === "VideoReadyTimeout") {
                showError(error.message);

            } else if (error.name === "NotSupportedError") {
                showError(
                    "The browser could not play the camera preview. Try updating Chrome."
                );

            } else if (error.name === "AbortError") {
                console.log("[Glamora AR] Camera startup cancelled.");

            } else {
                showError(
                    "Unable to start camera: " +
                    (error.message || error.name || "Unknown error")
                );
            }

            stopCamera(false);

        } finally {
            /*
             * Only the current startup can release the startup
             * lock. A cancelled startup cannot unlock a newer one.
             */
            if (startupId === cameraStartupId) {
                cameraStarting = false;
            }
        }
    }

    /* =====================================================
       STOP CAMERA
       ===================================================== */

    function stopCamera(
        showMessage = true,
        cancelStartup = true
    ) {
        /*
         * Invalidate any pending startup unless this is the
         * internal cleanup performed by startCamera().
         */
        if (cancelStartup) {
            cameraStartupId++;
            cameraStarting = false;
        }

        cameraRunning = false;
        lastFaceDetected = false;

        if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }

        if (mediaStream) {
            stopStream(mediaStream);
            mediaStream = null;
        }

        if (tryOnVideo) {
            try {
                tryOnVideo.pause();
            } catch (error) {
                // Ignore errors during video cleanup.
            }

            tryOnVideo.srcObject = null;
        }

        if (ctx && tryOnCanvas) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            ctx.clearRect(
                0,
                0,
                tryOnCanvas.width,
                tryOnCanvas.height
            );
        }

        if (showMessage) {
            setStatus("Camera stopped.");
        }
    }

    /* =====================================================
       SWITCH CAMERA
       ===================================================== */

    async function switchCamera() {
        /*
         * Cancel any pending request before changing cameras.
         * Its late-arriving stream will be stopped automatically.
         */
        if (cameraStarting) {
            stopCamera(false);
        }

        cameraFacingMode =
            cameraFacingMode === "user"
                ? "environment"
                : "user";

        resetPreviewOrientation();

        if (!isTryOnModalOpen()) {
            return;
        }

        hideError();

        if (cameraRunning || cameraStarting) {
            stopCamera(false);
        }

        setStatus(
            cameraFacingMode === "user"
                ? "Switching to front camera..."
                : "Switching to rear camera..."
        );

        await startCamera();
    }

    /* =====================================================
       RENDER CAMERA FRAME
       ===================================================== */

    function renderCameraFrame() {
        if (
            !cameraRunning ||
            !tryOnVideo ||
            !tryOnCanvas ||
            !ctx
        ) {
            animationFrame = null;
            return;
        }

        const width = tryOnVideo.videoWidth;
        const height = tryOnVideo.videoHeight;

        if (!width || !height) {
            animationFrame =
                requestAnimationFrame(renderCameraFrame);
            return;
        }

        if (
            tryOnCanvas.width !== width ||
            tryOnCanvas.height !== height
        ) {
            tryOnCanvas.width = width;
            tryOnCanvas.height = height;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);

        /*
         * Mirror the preview using CSS only. Do not mirror the
         * canvas drawing internally as well.
         */
        ctx.drawImage(
            tryOnVideo,
            0,
            0,
            width,
            height
        );

        if (faceLandmarker && mediaPipeReady) {
            try {
                const result = faceLandmarker.detectForVideo(
                    tryOnVideo,
                    performance.now()
                );

                if (
                    result &&
                    result.faceLandmarks &&
                    result.faceLandmarks.length > 0
                ) {
                    lastFaceDetected = true;

                    const landmarks = result.faceLandmarks[0];

                    drawMakeup(landmarks, width, height);

                    setStatus(
                        "Face detected — " +
                        (productName || "Product") +
                        " ready to try."
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
            requestAnimationFrame(renderCameraFrame);
    }

    /* =====================================================
       LANDMARK HELPER
       ===================================================== */

    function point(landmarks, index, width, height) {
        const p = landmarks[index];

        if (!p) {
            return null;
        }

        return {
            x: p.x * width,
            y: p.y * height
        };
    }

    /* =====================================================
       POLYGON
       ===================================================== */

    function drawPolygon(points) {
        if (!ctx || !points || points.length < 3) {
            return;
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        ctx.closePath();
        ctx.fill();
    }

    /* =====================================================
       MAKEUP DISPATCHER
       ===================================================== */

    function drawMakeup(landmarks, width, height) {
        if (!ctx || !landmarks) {
            return;
        }

        switch (normalizedType) {
            case "lipstick":
            case "lip":
                drawLipstick(landmarks, width, height);
                break;

            case "eyeshadow":
                drawEyeshadow(landmarks, width, height);
                break;

            case "eyeliner":
                drawEyeliner(landmarks, width, height);
                break;

            case "mascara":
                drawMascara(landmarks, width, height);
                break;

            case "blush":
                drawBlush(landmarks, width, height);
                break;

            case "highlighter":
                drawHighlighter(landmarks, width, height);
                break;

            case "foundation":
                drawFoundation(landmarks, width, height);
                break;

            default:
                drawLipstick(landmarks, width, height);
                break;
        }
    }

    /* =====================================================
       LIPSTICK
       ===================================================== */

    function drawLipstick(landmarks, width, height) {
        const indices = [
            61, 146, 91, 181, 84,
            17, 314, 405, 321, 375,
            291, 409, 270, 269, 267,
            0, 37, 39, 40, 185
        ];

        const points = indices
            .map(i => point(landmarks, i, width, height))
            .filter(Boolean);

        if (points.length < 3) {
            return;
        }

        ctx.save();
        ctx.globalAlpha = 0.58;
        ctx.fillStyle = makeupColor;
        ctx.globalCompositeOperation = "multiply";

        drawPolygon(points);

        ctx.restore();
    }

    /* =====================================================
       EYESHADOW
       ===================================================== */

    function drawEyeshadow(landmarks, width, height) {
        const leftEye = [
            33, 7, 163, 144, 145, 153, 154, 155, 133
        ];

        const rightEye = [
            362, 382, 381, 380, 374, 373, 390, 263
        ];

        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = makeupColor;
        ctx.globalCompositeOperation = "multiply";

        drawPolygon(
            leftEye
                .map(i => point(landmarks, i, width, height))
                .filter(Boolean)
        );

        drawPolygon(
            rightEye
                .map(i => point(landmarks, i, width, height))
                .filter(Boolean)
        );

        ctx.restore();
    }

    /* =====================================================
       EYELINER
       ===================================================== */

    function drawEyeliner(landmarks, width, height) {
        const left = [33, 133, 159, 158, 157];
        const right = [362, 263, 386, 385, 384];

        ctx.save();

        ctx.strokeStyle = makeupColor;
        ctx.lineWidth = Math.max(2, width / 300);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        function drawLine(indices) {
            const points = indices
                .map(i => point(landmarks, i, width, height))
                .filter(Boolean);

            if (points.length < 2) {
                return;
            }

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
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

    function drawMascara(landmarks, width, height) {
        const left = [33, 133, 159, 158, 157];
        const right = [362, 263, 386, 385, 384];

        ctx.save();

        ctx.strokeStyle = makeupColor;
        ctx.lineWidth = Math.max(2, width / 250);
        ctx.lineCap = "round";

        function drawMascaraLine(indices) {
            const points = indices
                .map(i => point(landmarks, i, width, height))
                .filter(Boolean);

            if (points.length < 2) {
                return;
            }

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
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

    function drawBlush(landmarks, width, height) {
        const leftCheek = point(landmarks, 50, width, height);
        const rightCheek = point(landmarks, 280, width, height);

        ctx.save();

        ctx.globalAlpha = 0.18;
        ctx.fillStyle = makeupColor;
        ctx.globalCompositeOperation = "multiply";

        const radius = Math.max(25, width * 0.07);

        [leftCheek, rightCheek].forEach(p => {
            if (!p) {
                return;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    /* =====================================================
       HIGHLIGHTER
       ===================================================== */

    function drawHighlighter(landmarks, width, height) {
        const nose = point(landmarks, 1, width, height);
        const leftCheek = point(landmarks, 50, width, height);
        const rightCheek = point(landmarks, 280, width, height);

        ctx.save();

        ctx.globalAlpha = 0.20;
        ctx.fillStyle = makeupColor;

        const radius = Math.max(12, width * 0.025);

        [nose, leftCheek, rightCheek].forEach(p => {
            if (!p) {
                return;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    /* =====================================================
       FOUNDATION
       ===================================================== */

    function drawFoundation(landmarks, width, height) {
        const faceIndices = [
            10, 338, 297, 332, 284, 251, 389, 356,
            454, 323, 361, 288, 397, 365, 379, 378,
            400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21,
            54, 103, 67
        ];

        const points = faceIndices
            .map(i => point(landmarks, i, width, height))
            .filter(Boolean);

        if (points.length < 3) {
            return;
        }

        ctx.save();

        ctx.globalAlpha = 0.08;
        ctx.fillStyle = makeupColor;
        ctx.globalCompositeOperation = "multiply";

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

        if (!file.type || !file.type.startsWith("image/")) {
            showError("Please select a valid image file.");
            event.target.value = "";
            return;
        }

        /*
         * Prevent an old upload operation from overwriting a
         * newer upload or a newly started camera session.
         */
        const processingId = ++imageProcessingId;

        stopCamera(false);
        hideError();

        if (activeImageURL) {
            URL.revokeObjectURL(activeImageURL);
            activeImageURL = null;
        }

        const imageURL = URL.createObjectURL(file);
        activeImageURL = imageURL;

        if (tryOnVideo) {
            tryOnVideo.style.display = "none";
        }

        if (tryOnCanvas) {
            tryOnCanvas.style.display = "block";
        }

        if (tryOnPlaceholder) {
            tryOnPlaceholder.style.display = "none";
        }

        if (!tryOnImage || !tryOnCanvas || !ctx) {
            URL.revokeObjectURL(imageURL);

            if (activeImageURL === imageURL) {
                activeImageURL = null;
            }

            showError(
                "The uploaded-image preview elements are missing."
            );

            event.target.value = "";
            return;
        }

        tryOnImage.style.display = "block";
        tryOnImage.style.transform = "none";
        tryOnImage.style.webkitTransform = "none";

        try {
            await new Promise((resolve, reject) => {
                tryOnImage.onload = () => resolve();

                tryOnImage.onerror = () => {
                    reject(
                        new Error(
                            "The selected image could not be opened."
                        )
                    );
                };

                tryOnImage.src = imageURL;
            });

            if (processingId !== imageProcessingId) {
                return;
            }

            const loaded = await loadMediaPipe();

            if (
                processingId !== imageProcessingId ||
                !loaded ||
                !faceLandmarker
            ) {
                return;
            }

            setStatus("Detecting face in image...");

            await faceLandmarker.setOptions({
                runningMode: "IMAGE"
            });

            if (processingId !== imageProcessingId) {
                return;
            }

            const result = faceLandmarker.detect(tryOnImage);

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

            const width = tryOnImage.naturalWidth;
            const height = tryOnImage.naturalHeight;

            if (!width || !height) {
                showError(
                    "Unable to read uploaded image dimensions."
                );
                return;
            }

            tryOnCanvas.width = width;
            tryOnCanvas.height = height;

            tryOnCanvas.style.transform = "none";
            tryOnCanvas.style.webkitTransform = "none";

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, width, height);

            ctx.drawImage(
                tryOnImage,
                0,
                0,
                width,
                height
            );

            drawMakeup(
                result.faceLandmarks[0],
                width,
                height
            );

            hideStatus();
            hideError();

        } catch (error) {
            if (processingId === imageProcessingId) {
                console.error(
                    "[Glamora AR] Image processing failed:",
                    error
                );

                showError(
                    error.message ||
                    "Unable to process the uploaded image."
                );
            }

        } finally {
            if (faceLandmarker) {
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

            event.target.value = "";
        }
    }

    /* =====================================================
       OPEN TRY-ON
       ===================================================== */

    function openTryOn() {
        console.log("[Glamora AR] Opening Try-On.");

        hideError();

        if (!tryOnModal) {
            console.error("[Glamora AR] tryOnModal not found.");
            return;
        }

        tryOnModal.classList.add("show");
        tryOnModal.style.display = "flex";
        tryOnModal.setAttribute("aria-hidden", "false");

        resetPreviewOrientation();

        /*
         * Camera access is requested only after confirmation.
         */
        showCameraPermissionPrompt();
    }

    /* =====================================================
       CLOSE TRY-ON
       ===================================================== */

    function closeTryOn() {
        /*
         * Invalidate camera and image operations so pending
         * work cannot reopen the camera or change the closed UI.
         */
        stopCamera(false);
        imageProcessingId++;

        const permissionPrompt = document.getElementById(
            "glamoraCameraPermission"
        );

        if (permissionPrompt) {
            permissionPrompt.remove();
        }

        if (tryOnModal) {
            tryOnModal.classList.remove("show");
            tryOnModal.style.display = "none";
            tryOnModal.setAttribute("aria-hidden", "true");
        }

        if (tryOnImage) {
            tryOnImage.onload = null;
            tryOnImage.onerror = null;
            tryOnImage.src = "";
            tryOnImage.style.display = "none";
            tryOnImage.style.transform = "none";
            tryOnImage.style.webkitTransform = "none";
        }

        if (activeImageURL) {
            URL.revokeObjectURL(activeImageURL);
            activeImageURL = null;
        }

        if (tryOnCanvas && ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            ctx.clearRect(
                0,
                0,
                tryOnCanvas.width,
                tryOnCanvas.height
            );

            tryOnCanvas.style.display = "none";
        }

        if (tryOnVideo) {
            tryOnVideo.style.display = "none";
        }

        if (tryOnPlaceholder) {
            tryOnPlaceholder.style.display = "flex";
        }

        hideError();
        hideStatus();
    }

    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

    if (tryOnBtn) {
        tryOnBtn.addEventListener("click", openTryOn);
    }

    if (tryOnClose) {
        tryOnClose.addEventListener("click", closeTryOn);
    }

    if (startCameraBtn) {
        startCameraBtn.addEventListener("click", async () => {
            await startCamera();
        });
    }

    if (stopCameraBtn) {
        stopCameraBtn.addEventListener("click", () => {
            stopCamera(true);
        });
    }

    if (switchCameraBtn) {
        switchCameraBtn.addEventListener("click", async () => {
            await switchCamera();
        });
    }

    if (uploadImageBtn) {
        uploadImageBtn.addEventListener("click", () => {
            if (tryOnImageInput) {
                tryOnImageInput.click();
            }
        });
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
        tryOnModal.addEventListener("click", event => {
            if (event.target === tryOnModal) {
                closeTryOn();
            }
        });
    }

    /* =====================================================
       ESCAPE KEY
       ===================================================== */

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") {
            return;
        }

        if (
            productImageModal &&
            productImageModal.classList.contains("active")
        ) {
            closeProductImagePopup();
        }

        if (isTryOnModalOpen()) {
            closeTryOn();
        }
    });

    /* =====================================================
       CLEANUP
       ===================================================== */

    window.addEventListener("beforeunload", () => {
        stopCamera(false);
        imageProcessingId++;

        if (activeImageURL) {
            URL.revokeObjectURL(activeImageURL);
            activeImageURL = null;
        }

        if (faceLandmarker) {
            try {
                faceLandmarker.close();
            } catch (error) {
                console.warn(
                    "[Glamora AR] Face tracker cleanup failed:",
                    error
                );
            }

            faceLandmarker = null;
            mediaPipeReady = false;
        }
    });

    /* =====================================================
       INITIALIZATION
       ===================================================== */

    resetPreviewOrientation();

    console.log(
        "[Glamora AR] product_details.js loaded successfully."
    );

})();
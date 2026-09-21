/* =========================================================
   GLAMORA AR
   REAL-TIME VIRTUAL MAKEUP TRY-ON
========================================================= */


/* =========================================================
   DOM
========================================================= */

const tryOnBtn =
    document.getElementById("tryOnBtn");

const arModal =
    document.getElementById("arModal");

const closeArModal =
    document.getElementById("closeArModal");

const startCameraBtn =
    document.getElementById("startCameraBtn");

const uploadImageBtn =
    document.getElementById("uploadImageBtn");

const arImageInput =
    document.getElementById("arImageInput");

const arViewer =
    document.getElementById("arViewer");

const arCamera =
    document.getElementById("arCamera");

const arUserImage =
    document.getElementById("arUserImage");

const arFaceCanvas =
    document.getElementById("arFaceCanvas");

const arInstruction =
    document.getElementById("arInstruction");

const arLoading =
    document.getElementById("arLoading");


/* =========================================================
   MANUAL CONTROLS
========================================================= */

const arMoveUp =
    document.getElementById("arMoveUp");

const arMoveDown =
    document.getElementById("arMoveDown");

const arMoveLeft =
    document.getElementById("arMoveLeft");

const arMoveRight =
    document.getElementById("arMoveRight");

const arZoomIn =
    document.getElementById("arZoomIn");

const arZoomOut =
    document.getElementById("arZoomOut");


/* =========================================================
   CANVAS
========================================================= */

const ctx =
    arFaceCanvas
        ? arFaceCanvas.getContext("2d")
        : null;


/* =========================================================
   STATE
========================================================= */

let cameraStream = null;

let faceLandmarker = null;

let animationFrame = null;

let lastVideoTime = -1;

let mediaPipeReady = false;

let currentProductType = "";

let currentProductColor = null;

let currentMode = "camera";

let manualX = 0;

let manualY = 0;

let manualScale = 1;


/* =========================================================
   PRODUCT DATA
========================================================= */

function getCurrentProduct() {

    if (
        typeof currentProduct !== "undefined" &&
        currentProduct
    ) {

        return currentProduct;

    }

    return window.currentProduct || null;

}


/* =========================================================
   NORMALIZE PRODUCT TYPE
========================================================= */

function normalizeProductType(value) {

    if (!value) {

        return "face";

    }

    const type =
        String(value)
            .trim()
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/-/g, " ");


    if (
        type.includes("lipstick") ||
        type.includes("lip gloss") ||
        type === "lip"
    ) {

        return "lipstick";

    }


    if (
        type.includes("eyeshadow") ||
        type.includes("eye shadow")
    ) {

        return "eyeshadow";

    }


    if (
        type.includes("eyeliner") ||
        type.includes("eye liner")
    ) {

        return "eyeliner";

    }


    if (
        type.includes("mascara")
    ) {

        return "mascara";

    }


    if (
        type.includes("blush")
    ) {

        return "blush";

    }


    if (
        type.includes("foundation")
    ) {

        return "foundation";

    }


    if (
        type.includes("highlighter") ||
        type.includes("highlight")
    ) {

        return "highlighter";

    }


    return "face";

}


/* =========================================================
   COLOR PARSER
========================================================= */

function getProductColor(product) {

    if (!product) {

        return null;

    }


    const value =
        product.color ||
        product.shade ||
        product.hex_color ||
        product.hex ||
        null;


    if (!value) {

        return null;

    }


    return String(value).trim();

}


/* =========================================================
   CSS COLOR VALIDATION
========================================================= */

function validColor(value) {

    if (!value) {

        return false;

    }


    const test =
        new Option().style;


    test.color =
        value;


    return Boolean(
        test.color
    );

}


/* =========================================================
   DEFAULT COLORS
========================================================= */

function defaultColor(type) {

    switch (type) {

        case "lipstick":

            return "#b8325d";


        case "eyeshadow":

            return "#8f596e";


        case "eyeliner":

            return "#21171a";


        case "blush":

            return "#dc7188";


        case "mascara":

            return "#181114";


        case "foundation":

            return "#c98f70";


        case "highlighter":

            return "#f3c89b";


        default:

            return "#c85f7a";

    }

}


/* =========================================================
   PREPARE PRODUCT
========================================================= */

function prepareProduct() {

    const product =
        getCurrentProduct();


    currentProductType =
        normalizeProductType(
            product?.product_type ||
            product?.type ||
            product?.category ||
            ""
        );


    currentProductColor =
        getProductColor(
            product
        );


    if (
        !validColor(
            currentProductColor
        )
    ) {

        currentProductColor =
            defaultColor(
                currentProductType
            );

    }

}


/* =========================================================
   OPEN TRY ON
========================================================= */

async function openTryOn() {

    prepareProduct();


    if (!arModal) {

        console.error(
            "Glamora AR modal was not found."
        );

        return;

    }


    arModal.classList.add(
        "active"
    );

    arModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    currentMode =
        "camera";


    resetManualControls();


    clearCanvas();


    if (arLoading) {

        arLoading.classList.remove(
            "hidden"
        );

    }


    if (arInstruction) {

        arInstruction.style.opacity =
            "1";

        arInstruction.textContent =
            "Preparing camera...";

    }


    await startCamera();

}


/* =========================================================
   CLOSE TRY ON
========================================================= */

function closeTryOn() {

    stopCamera();

    stopTracking();

    clearCanvas();


    if (arModal) {

        arModal.classList.remove(
            "active"
        );

        arModal.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    document.body.style.overflow =
        "";


    if (arInstruction) {

        arInstruction.style.opacity =
            "1";

        arInstruction.textContent =
            "Allow camera access to start virtual try-on.";

    }

}


/* =========================================================
   START CAMERA
========================================================= */

async function startCamera() {

    stopCamera();

    stopTracking();


    try {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Camera API is not supported by this browser."
            );

        }


        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: {
                        ideal: "user"
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

                },

                audio: false

            });


        arCamera.srcObject =
            cameraStream;


        arCamera.style.display =
            "block";


        arUserImage.style.display =
            "none";


        setMode(
            "camera"
        );


        await arCamera.play();


        resizeCanvas();


        if (arInstruction) {

            arInstruction.textContent =
                "Loading face tracking...";

        }


        await initializeFaceLandmarker();


        if (arLoading) {

            arLoading.classList.add(
                "hidden"
            );

        }


        if (arInstruction) {

            arInstruction.textContent =
                "Move your face into view.";

        }


        startTracking();

    }

    catch (error) {

        console.error(
            "GLAMORA AR CAMERA ERROR:",
            error
        );


        stopCamera();


        if (arLoading) {

            arLoading.classList.add(
                "hidden"
            );

        }


        if (arInstruction) {

            arInstruction.textContent =
                "Camera access failed. Please allow camera permission.";

        }

    }

}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track => track.stop()
            );

        cameraStream =
            null;

    }


    if (arCamera) {

        arCamera.pause();

        arCamera.srcObject =
            null;

    }

}


/* =========================================================
   INITIALIZE MEDIAPIPE
========================================================= */

async function initializeFaceLandmarker() {

    if (
        mediaPipeReady &&
        faceLandmarker
    ) {

        return;

    }


    if (
        !window.glamoraFaceLandmarkerPromise
    ) {

        throw new Error(
            "MediaPipe loader was not found."
        );

    }


    const vision =
        await window.glamoraFaceLandmarkerPromise;


    if (
        !vision ||
        !vision.FaceLandmarker ||
        !vision.FilesetResolver
    ) {

        throw new Error(
            "MediaPipe Face Landmarker is unavailable."
        );

    }


    const fileset =
        await vision.FilesetResolver.forVisionTasks(

            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"

        );


    faceLandmarker =
        await vision.FaceLandmarker.createFromOptions(

            fileset,

            {

                baseOptions: {

                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",

                    delegate:
                        "GPU"

                },

                runningMode:
                    "VIDEO",

                numFaces:
                    1,

                minFaceDetectionConfidence:
                    0.5,

                minFacePresenceConfidence:
                    0.5,

                minTrackingConfidence:
                    0.5

            }

        );


    mediaPipeReady =
        true;

}


/* =========================================================
   START TRACKING
========================================================= */

function startTracking() {

    stopTracking();

    lastVideoTime =
        -1;


    function loop() {

        if (
            !arModal ||
            !arModal.classList.contains(
                "active"
            )
        ) {

            return;

        }


        if (
            currentMode === "camera" &&
            arCamera.readyState >= 2 &&
            faceLandmarker
        ) {

            if (
                arCamera.currentTime !==
                lastVideoTime
            ) {

                lastVideoTime =
                    arCamera.currentTime;


                const result =
                    faceLandmarker.detectForVideo(

                        arCamera,

                        performance.now()

                    );


                drawAR(
                    result
                );

            }

        }


        animationFrame =
            requestAnimationFrame(
                loop
            );

    }


    loop();

}


/* =========================================================
   STOP TRACKING
========================================================= */

function stopTracking() {

    if (animationFrame) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame =
            null;

    }

}


/* =========================================================
   RESIZE CANVAS
========================================================= */

function resizeCanvas() {

    if (
        !arViewer ||
        !arFaceCanvas
    ) {

        return;

    }


    const rect =
        arViewer.getBoundingClientRect();


    const dpr =
        window.devicePixelRatio ||
        1;


    arFaceCanvas.width =
        Math.round(
            rect.width * dpr
        );


    arFaceCanvas.height =
        Math.round(
            rect.height * dpr
        );


    arFaceCanvas.style.width =
        `${rect.width}px`;


    arFaceCanvas.style.height =
        `${rect.height}px`;


    if (ctx) {

        ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );

    }

}


/* =========================================================
   LANDMARK → VIEWER
========================================================= */

function point(
    landmark
) {

    if (!landmark) {

        return null;

    }


    const rect =
        arViewer.getBoundingClientRect();


    return {

        x:
            (1 - landmark.x) *
            rect.width,

        y:
            landmark.y *
            rect.height

    };

}


/* =========================================================
   DISTANCE
========================================================= */

function distance(
    a,
    b
) {

    if (!a || !b) {

        return 0;

    }


    return Math.hypot(

        a.x - b.x,

        a.y - b.y

    );

}


/* =========================================================
   ANGLE
========================================================= */

function angle(
    a,
    b
) {

    if (!a || !b) {

        return 0;

    }


    return Math.atan2(

        b.y - a.y,

        b.x - a.x

    );

}


/* =========================================================
   GET LANDMARK
========================================================= */

function landmark(
    landmarks,
    index
) {

    return landmarks[index];

}


/* =========================================================
   DRAW AR
========================================================= */

function drawAR(
    result
) {

    clearCanvas();


    if (
        !result ||
        !result.faceLandmarks ||
        !result.faceLandmarks.length
    ) {

        if (arInstruction) {

            arInstruction.style.opacity =
                "1";

            arInstruction.textContent =
                "Move your face into view.";

        }

        return;

    }


    if (arInstruction) {

        arInstruction.style.opacity =
            "0";

    }


    const landmarks =
        result.faceLandmarks[0];


    switch (
        currentProductType
    ) {

        case "lipstick":

            drawLipstick(
                landmarks
            );

            break;


        case "eyeshadow":

            drawEyeshadow(
                landmarks
            );

            break;


        case "eyeliner":

            drawEyeliner(
                landmarks
            );

            break;


        case "blush":

            drawBlush(
                landmarks
            );

            break;


        case "mascara":

            drawMascara(
                landmarks
            );

            break;


        case "foundation":

            drawFoundation(
                landmarks
            );

            break;


        case "highlighter":

            drawHighlighter(
                landmarks
            );

            break;


        default:

            drawFoundation(
                landmarks
            );

    }

}


/* =========================================================
   LIPSTICK
========================================================= */

function drawLipstick(
    landmarks
) {

    const upper =
        [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];

    const lower =
        [291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61];


    drawFilledLandmarkShape(
        landmarks,
        upper,
        currentProductColor,
        0.72
    );


    drawFilledLandmarkShape(
        landmarks,
        lower,
        currentProductColor,
        0.68
    );

}


/* =========================================================
   EYESHADOW
========================================================= */

function drawEyeshadow(
    landmarks
) {

    const leftEye =
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
        ];


    const rightEye =
        [
            263,
            466,
            388,
            387,
            386,
            385,
            384,
            398,
            362
        ];


    drawFilledLandmarkShape(
        landmarks,
        leftEye,
        currentProductColor,
        0.32
    );


    drawFilledLandmarkShape(
        landmarks,
        rightEye,
        currentProductColor,
        0.32
    );

}


/* =========================================================
   EYELINER
========================================================= */

function drawEyeliner(
    landmarks
) {

    const left =
        [
            33,
            246,
            161,
            160,
            159,
            158,
            157,
            173
        ];


    const right =
        [
            263,
            466,
            388,
            387,
            386,
            385,
            384,
            398
        ];


    drawLandmarkLine(
        landmarks,
        left,
        currentProductColor,
        3.2
    );


    drawLandmarkLine(
        landmarks,
        right,
        currentProductColor,
        3.2
    );

}


/* =========================================================
   BLUSH
========================================================= */

function drawBlush(
    landmarks
) {

    const left =
        point(
            landmark(
                landmarks,
                205
            )
        );


    const right =
        point(
            landmark(
                landmarks,
                425
            )
        );


    if (left) {

        drawSoftCircle(
            left.x,
            left.y,
            48,
            currentProductColor,
            0.28
        );

    }


    if (right) {

        drawSoftCircle(
            right.x,
            right.y,
            48,
            currentProductColor,
            0.28
        );

    }

}


/* =========================================================
   MASCARA
========================================================= */

function drawMascara(
    landmarks
) {

    const left =
        [
            33,
            246,
            161,
            160,
            159,
            158,
            157
        ];


    const right =
        [
            263,
            466,
            388,
            387,
            386,
            385,
            384
        ];


    drawLandmarkLine(
        landmarks,
        left,
        currentProductColor,
        4
    );


    drawLandmarkLine(
        landmarks,
        right,
        currentProductColor,
        4
    );

}


/* =========================================================
   FOUNDATION
========================================================= */

function drawFoundation(
    landmarks
) {

    const face = [

        10,
        338,
        297,
        332,
        284,
        251,
        389,
        356,
        454,
        323,
        361,
        288,
        397,
        365,
        379,
        378,
        400,
        377,
        152,
        148,
        176,
        149,
        150,
        136,
        172,
        58,
        132,
        93,
        234,
        127,
        162,
        21,
        54,
        103,
        67,
        109

    ];


    drawFilledLandmarkShape(
        landmarks,
        face,
        currentProductColor,
        0.12
    );

}


/* =========================================================
   HIGHLIGHTER
========================================================= */

function drawHighlighter(
    landmarks
) {

    const leftCheek =
        point(
            landmark(
                landmarks,
                205
            )
        );


    const rightCheek =
        point(
            landmark(
                landmarks,
                425
            )
        );


    const nose =
        point(
            landmark(
                landmarks,
                1
            )
        );


    if (leftCheek) {

        drawSoftCircle(
            leftCheek.x,
            leftCheek.y,
            26,
            currentProductColor,
            0.30
        );

    }


    if (rightCheek) {

        drawSoftCircle(
            rightCheek.x,
            rightCheek.y,
            26,
            currentProductColor,
            0.30
        );

    }


    if (nose) {

        drawSoftCircle(
            nose.x,
            nose.y,
            14,
            currentProductColor,
            0.30
        );

    }

}


/* =========================================================
   FILLED LANDMARK SHAPE
========================================================= */

function drawFilledLandmarkShape(
    landmarks,
    indexes,
    color,
    alpha
) {

    if (
        !ctx ||
        !indexes.length
    ) {

        return;

    }


    const points = [];


    indexes.forEach(
        index => {

            const p =
                point(
                    landmark(
                        landmarks,
                        index
                    )
                );


            if (p) {

                points.push(p);

            }

        }
    );


    if (
        points.length < 3
    ) {

        return;

    }


    ctx.save();


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


    ctx.globalAlpha =
        alpha;


    ctx.fillStyle =
        color;


    ctx.shadowColor =
        color;

    ctx.shadowBlur =
        10;


    ctx.fill();


    ctx.restore();

}


/* =========================================================
   LANDMARK LINE
========================================================= */

function drawLandmarkLine(
    landmarks,
    indexes,
    color,
    width
) {

    if (
        !ctx ||
        indexes.length < 2
    ) {

        return;

    }


    ctx.save();


    ctx.beginPath();


    let first =
        true;


    indexes.forEach(
        index => {

            const p =
                point(
                    landmark(
                        landmarks,
                        index
                    )
                );


            if (!p) {

                return;

            }


            if (first) {

                ctx.moveTo(
                    p.x,
                    p.y
                );

                first =
                    false;

            }

            else {

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
        width;


    ctx.lineCap =
        "round";


    ctx.lineJoin =
        "round";


    ctx.globalAlpha =
        0.9;


    ctx.shadowColor =
        color;

    ctx.shadowBlur =
        5;


    ctx.stroke();


    ctx.restore();

}


/* =========================================================
   SOFT CIRCLE
========================================================= */

function drawSoftCircle(
    x,
    y,
    radius,
    color,
    alpha
) {

    if (!ctx) {

        return;

    }


    ctx.save();


    const gradient =
        ctx.createRadialGradient(

            x,
            y,
            0,

            x,
            y,
            radius

        );


    gradient.addColorStop(
        0,
        color
    );


    gradient.addColorStop(
        0.55,
        color
    );


    gradient.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );


    ctx.globalAlpha =
        alpha;


    ctx.fillStyle =
        gradient;


    ctx.beginPath();


    ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );


    ctx.fill();


    ctx.restore();

}


/* =========================================================
   CLEAR CANVAS
========================================================= */

function clearCanvas() {

    if (
        !ctx ||
        !arFaceCanvas
    ) {

        return;

    }


    const rect =
        arViewer.getBoundingClientRect();


    ctx.clearRect(
        0,
        0,
        rect.width,
        rect.height
    );

}


/* =========================================================
   MODE
========================================================= */

function setMode(
    mode
) {

    currentMode =
        mode;


    if (startCameraBtn) {

        startCameraBtn.classList.toggle(
            "active",
            mode === "camera"
        );

    }


    if (uploadImageBtn) {

        uploadImageBtn.classList.toggle(
            "active",
            mode === "image"
        );

    }

}


/* =========================================================
   UPLOAD IMAGE
========================================================= */

async function handleImageUpload(
    event
) {

    const file =
        event.target.files?.[0];


    if (!file) {

        return;

    }


    stopCamera();

    stopTracking();


    const reader =
        new FileReader();


    reader.onload =
        function () {

            arUserImage.src =
                reader.result;


            arUserImage.style.display =
                "block";


            arCamera.style.display =
                "none";


            setMode(
                "image"
            );


            if (arInstruction) {

                arInstruction.textContent =
                    "Uploaded-photo AR requires a compatible image detector.";

            }

        };


    reader.readAsDataURL(
        file
    );

}


/* =========================================================
   RESET MANUAL
========================================================= */

function resetManualControls() {

    manualX =
        0;

    manualY =
        0;

    manualScale =
        1;

}


/* =========================================================
   MANUAL CONTROLS
========================================================= */

function setupManualControls() {

    arMoveUp?.addEventListener(
        "click",
        () => {

            manualY -= 5;

        }
    );


    arMoveDown?.addEventListener(
        "click",
        () => {

            manualY += 5;

        }
    );


    arMoveLeft?.addEventListener(
        "click",
        () => {

            manualX -= 5;

        }
    );


    arMoveRight?.addEventListener(
        "click",
        () => {

            manualX += 5;

        }
    );


    arZoomIn?.addEventListener(
        "click",
        () => {

            manualScale +=
                0.05;

        }
    );


    arZoomOut?.addEventListener(
        "click",
        () => {

            manualScale =
                Math.max(
                    0.5,
                    manualScale - 0.05
                );

        }
    );

}


/* =========================================================
   EVENTS
========================================================= */

tryOnBtn?.addEventListener(
    "click",
    async () => {

        /*
         * If your existing product page requires login
         * before Try-On, keep your existing login check here.
         */

        await openTryOn();

    }
);


closeArModal?.addEventListener(
    "click",
    closeTryOn
);


startCameraBtn?.addEventListener(
    "click",
    async () => {

        await startCamera();

    }
);


uploadImageBtn?.addEventListener(
    "click",
    () => {

        arImageInput?.click();

    }
);


arImageInput?.addEventListener(
    "change",
    handleImageUpload
);


window.addEventListener(
    "resize",
    resizeCanvas
);


arModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            arModal
        ) {

            closeTryOn();

        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape" &&
            arModal?.classList.contains(
                "active"
            )
        ) {

            closeTryOn();

        }

    }
);


setupManualControls();


console.log(
    "Glamora AR Try-On initialized."
);
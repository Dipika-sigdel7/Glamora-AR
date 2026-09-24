/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS + VIRTUAL TRY-ON

   Features:
   - Camera access
   - Face landmark detection
   - Lipstick AR
   - Eyeshadow AR
   - Eyeliner AR
   - Blush AR
   - Product-specific color
   - Uploaded image face detection
   ========================================================= */


/* =========================================================
   MEDIAPIPE IMPORT
   ========================================================= */

import {
    FaceLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs";


/* =========================================================
   MEDIAPIPE RESOURCES
   ========================================================= */

const WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const tryOnBtn = document.getElementById("tryOnBtn");
const tryOnModal = document.getElementById("tryOnModal");
const tryOnClose = document.getElementById("tryOnClose");

const video = document.getElementById("tryOnVideo");
const canvas = document.getElementById("tryOnCanvas");
const image = document.getElementById("tryOnImage");

const placeholder = document.getElementById("tryOnPlaceholder");

const status = document.getElementById("tryOnStatus");
const statusText = document.getElementById("tryOnStatusText");

const errorBox = document.getElementById("tryOnError");

const startCameraBtn = document.getElementById("startCameraBtn");
const uploadImageBtn = document.getElementById("uploadImageBtn");
const imageInput = document.getElementById("tryOnImageInput");

const switchCameraBtn = document.getElementById("switchCameraBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");

const ctx = canvas ? canvas.getContext("2d") : null;


/* =========================================================
   PRODUCT DATA

   These values come from the data-* attributes
   on the HTML body element.
   ========================================================= */

const product = {

    id: document.body.dataset.productId || "",

    name: document.body.dataset.productName || "",

    type: document.body.dataset.productType || "",

    shade: document.body.dataset.productShade || "",

    color: document.body.dataset.productColor || ""

};


/* =========================================================
   STATE
   ========================================================= */

let faceLandmarker = null;

let mediaStream = null;

let cameraFacingMode = "user";

let animationFrameId = null;

let lastVideoTime = -1;

let faceTrackingReady = false;

let cameraRunning = false;


/* =========================================================
   PRODUCT TYPE NORMALIZATION
   ========================================================= */

function normalizeProductType(value) {

    const type = String(value || "")
        .trim()
        .toLowerCase();

    if (type.includes("lip")) {
        return "lipstick";
    }

    if (
        type.includes("eye") &&
        type.includes("shadow")
    ) {
        return "eyeshadow";
    }

    if (type.includes("blush")) {
        return "blush";
    }

    if (
        type.includes("liner") ||
        type.includes("eyeliner")
    ) {
        return "eyeliner";
    }

    if (type.includes("mascara")) {
        return "mascara";
    }

    if (type.includes("foundation")) {
        return "foundation";
    }

    if (
        type.includes("highlight") ||
        type.includes("highlighter")
    ) {
        return "highlighter";
    }

    return type || "lipstick";
}


const productType = normalizeProductType(product.type);


/* =========================================================
   COLOR HELPERS
   ========================================================= */

function normalizeColor(value) {

    if (!value) {
        return null;
    }

    const color = String(value).trim();

    /*
       Accept:
       #ff0000
       #fff
       rgb(...)
       rgba(...)
    */

    if (
        /^#[0-9a-f]{3}$/i.test(color) ||
        /^#[0-9a-f]{6}$/i.test(color) ||
        /^rgb\(/i.test(color) ||
        /^rgba\(/i.test(color)
    ) {
        return color;
    }

    return null;
}


/* =========================================================
   DETERMINE PRODUCT COLOR
   ========================================================= */

function getProductColor() {

    const directColor = normalizeColor(product.color);

    if (directColor) {
        return directColor;
    }


    const text = (
        `${product.color} ${product.shade} ${product.name}`
    ).toLowerCase();


    if (text.includes("black")) {
        return "#171114";
    }

    if (
        text.includes("burgundy") ||
        text.includes("oxblood")
    ) {
        return "#741f3b";
    }

    if (
        text.includes("wine") ||
        text.includes("maroon")
    ) {
        return "#72243d";
    }

    if (text.includes("berry")) {
        return "#8f294b";
    }

    if (text.includes("plum")) {
        return "#6b294f";
    }

    if (text.includes("mauve")) {
        return "#a84f6e";
    }

    if (
        text.includes("coral") ||
        text.includes("peach")
    ) {
        return "#e67b66";
    }

    if (text.includes("orange")) {
        return "#e46d39";
    }

    if (
        text.includes("brown") ||
        text.includes("chocolate")
    ) {
        return "#7a4b3a";
    }

    if (
        text.includes("nude") ||
        text.includes("beige")
    ) {
        return "#b96f68";
    }

    if (
        text.includes("rose") ||
        text.includes("pink")
    ) {
        return "#d96b8a";
    }

    if (text.includes("red")) {
        return "#c6284f";
    }

    /*
       Default Glamora AR shade
    */

    return "#c85f7a";
}


const makeupColor = getProductColor();


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(message) {

    if (statusText) {
        statusText.textContent = message;
    }

    if (status) {
        status.classList.add("active");
    }
}


/* =========================================================
   ERROR
   ========================================================= */

function showError(message) {

    console.error("Glamora AR:", message);

    if (errorBox) {
        errorBox.textContent = message;
        errorBox.classList.add("show");
    }

    setStatus(message);
}


function clearError() {

    if (errorBox) {
        errorBox.textContent = "";
        errorBox.classList.remove("show");
    }

}


/* =========================================================
   CANVAS SIZE
   ========================================================= */

function resizeCanvas(width, height) {

    if (!canvas) {
        return;
    }

    if (
        canvas.width !== width ||
        canvas.height !== height
    ) {

        canvas.width = width;
        canvas.height = height;

    }

}


/* =========================================================
   CLEAR CANVAS
   ========================================================= */

function clearCanvas() {

    if (!ctx || !canvas) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

}


/* =========================================================
   CONVERT LANDMARK TO CANVAS COORDINATES
   ========================================================= */

function point(landmark) {

    return {
        x: landmark.x * canvas.width,
        y: landmark.y * canvas.height
    };

}


/* =========================================================
   DRAW POLYGON
   ========================================================= */

function drawPolygon(
    landmarks,
    indices,
    fillStyle
) {

    if (!landmarks || !indices.length) {
        return;
    }

    ctx.beginPath();

    const first = point(
        landmarks[indices[0]]
    );

    ctx.moveTo(first.x, first.y);


    for (let i = 1; i < indices.length; i++) {

        const p = point(
            landmarks[indices[i]]
        );

        ctx.lineTo(
            p.x,
            p.y
        );

    }

    ctx.closePath();

    ctx.fillStyle = fillStyle;

    ctx.fill();

}


/* =========================================================
   LIP LANDMARKS
   ========================================================= */

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
    80,
    191

];


/* =========================================================
   DRAW LIPSTICK
   ========================================================= */

function drawLipstick(landmarks) {

    if (!landmarks) {
        return;
    }


    /*
       Slight transparency gives the lipstick
       a more realistic appearance.
    */

    ctx.save();


    /*
       Outer lip
    */

    drawPolygon(
        landmarks,
        OUTER_LIPS,
        hexToRgba(makeupColor, 0.72)
    );


    /*
       Remove the inner mouth area.
    */

    ctx.globalCompositeOperation =
        "destination-out";


    drawPolygon(
        landmarks,
        INNER_LIPS,
        "rgba(0,0,0,1)"
    );


    ctx.globalCompositeOperation =
        "source-over";


    /*
       Add subtle shine.
    */

    drawLipHighlight(
        landmarks
    );


    ctx.restore();

}


/* =========================================================
   LIP HIGHLIGHT
   ========================================================= */

function drawLipHighlight(landmarks) {

    const upperCenter =
        point(landmarks[13]);

    const lowerCenter =
        point(landmarks[14]);


    const width =
        Math.abs(
            point(landmarks[61]).x -
            point(landmarks[291]).x
        );


    const gradient =
        ctx.createRadialGradient(
            lowerCenter.x,
            lowerCenter.y,
            1,
            lowerCenter.x,
            lowerCenter.y,
            width * 0.45
        );


    gradient.addColorStop(
        0,
        "rgba(255,255,255,0.16)"
    );

    gradient.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );


    ctx.fillStyle = gradient;


    ctx.beginPath();

    ctx.ellipse(
        lowerCenter.x,
        lowerCenter.y,
        width * 0.30,
        width * 0.10,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

}


/* =========================================================
   HEX TO RGBA
   ========================================================= */

function hexToRgba(hex, alpha) {

    if (!hex) {
        return `rgba(200,95,122,${alpha})`;
    }


    if (
        !hex.startsWith("#")
    ) {

        return hex;

    }


    let value =
        hex.substring(1);


    if (value.length === 3) {

        value =
            value[0] + value[0] +
            value[1] + value[1] +
            value[2] + value[2];

    }


    const r =
        parseInt(
            value.substring(0, 2),
            16
        );

    const g =
        parseInt(
            value.substring(2, 4),
            16
        );

    const b =
        parseInt(
            value.substring(4, 6),
            16
        );


    return `rgba(${r},${g},${b},${alpha})`;

}


/* =========================================================
   EYE LANDMARKS
   ========================================================= */

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
    263,
    249,
    390,
    373,
    374,
    380,
    381,
    382,
    362,
    398,
    384,
    385,
    386,
    387,
    388,
    466
];


/* =========================================================
   EYESHADOW
   ========================================================= */

function drawEyeshadow(
    landmarks
) {

    ctx.save();


    drawPolygon(
        landmarks,
        LEFT_EYE,
        hexToRgba(
            makeupColor,
            0.30
        )
    );


    drawPolygon(
        landmarks,
        RIGHT_EYE,
        hexToRgba(
            makeupColor,
            0.30
        )
    );


    ctx.restore();

}


/* =========================================================
   EYELINER
   ========================================================= */

function drawEyeliner(
    landmarks
) {

    ctx.save();

    ctx.strokeStyle =
        hexToRgba(
            makeupColor,
            0.90
        );

    ctx.lineWidth =
        Math.max(
            2,
            canvas.width * 0.004
        );

    ctx.lineCap = "round";


    drawEyeLine(
        landmarks,
        [
            33,
            133
        ]
    );


    drawEyeLine(
        landmarks,
        [
            263,
            362
        ]
    );


    ctx.restore();

}


function drawEyeLine(
    landmarks,
    indices
) {

    const start =
        point(
            landmarks[indices[0]]
        );

    const end =
        point(
            landmarks[indices[1]]
        );


    ctx.beginPath();

    ctx.moveTo(
        start.x,
        start.y
    );

    ctx.lineTo(
        end.x,
        end.y
    );

    ctx.stroke();

}


/* =========================================================
   BLUSH
   ========================================================= */

function drawBlush(
    landmarks
) {

    drawBlushSpot(
        landmarks[50],
        0.16
    );


    drawBlushSpot(
        landmarks[280],
        0.16
    );

}


function drawBlushSpot(
    landmark,
    opacity
) {

    const p =
        point(landmark);


    const radius =
        canvas.width * 0.065;


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
        hexToRgba(
            makeupColor,
            opacity
        )
    );


    gradient.addColorStop(
        0.55,
        hexToRgba(
            makeupColor,
            opacity * 0.45
        )
    );


    gradient.addColorStop(
        1,
        hexToRgba(
            makeupColor,
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


/* =========================================================
   HIGHLIGHTER
   ========================================================= */

function drawHighlighter(
    landmarks
) {

    const nose =
        point(
            landmarks[1]
        );


    const chin =
        point(
            landmarks[152]
        );


    drawGlow(
        nose.x,
        nose.y,
        canvas.width * 0.025
    );


    drawGlow(
        chin.x,
        chin.y,
        canvas.width * 0.020
    );

}


function drawGlow(
    x,
    y,
    radius
) {

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
        "rgba(255,255,255,0.45)"
    );


    gradient.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );


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

}


/* =========================================================
   MAKEUP DISPATCHER
   ========================================================= */

function drawMakeup(
    landmarks
) {

    if (!landmarks) {
        return;
    }


    switch (productType) {

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


        case "highlighter":

            drawHighlighter(
                landmarks
            );

            break;


        case "mascara":

            drawEyeliner(
                landmarks
            );

            break;


        case "foundation":

            /*
               Foundation is intentionally subtle.
               A full skin-segmentation foundation effect
               requires a different segmentation model.
            */

            break;


        default:

            drawLipstick(
                landmarks
            );

            break;

    }

}


/* =========================================================
   CREATE FACE LANDMARKER
   ========================================================= */

async function createFaceLandmarker() {

    setStatus(
        "Loading AR face tracking..."
    );


    try {

        const vision =
            await FilesetResolver.forVisionTasks(
                WASM_URL
            );


        /*
           First attempt GPU.
        */

        try {

            faceLandmarker =
                await FaceLandmarker.createFromOptions(
                    vision,
                    {

                        baseOptions: {

                            modelAssetPath:
                                MODEL_URL,

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


        } catch (gpuError) {

            console.warn(
                "GPU FaceLandmarker failed. Falling back to CPU.",
                gpuError
            );


            faceLandmarker =
                await FaceLandmarker.createFromOptions(
                    vision,
                    {

                        baseOptions: {

                            modelAssetPath:
                                MODEL_URL,

                            delegate:
                                "CPU"

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

        }


        faceTrackingReady =
            true;


        setStatus(
            "AR ready • Start your camera"
        );


        console.log(
            "Glamora AR FaceLandmarker ready."
        );


    } catch (error) {

        console.error(
            "Failed to load MediaPipe:",
            error
        );


        faceTrackingReady =
            false;


        showError(
            "Unable to load AR face tracking. Check your internet connection and reload the page."
        );

    }

}


/* =========================================================
   START CAMERA
   ========================================================= */

async function startCamera() {

    clearError();


    if (!faceTrackingReady) {

        setStatus(
            "Loading AR face tracking..."
        );


        await createFaceLandmarker();


        if (!faceTrackingReady) {
            return;
        }

    }


    stopCamera();


    try {

        setStatus(
            "Requesting camera permission..."
        );


        mediaStream =
            await navigator.mediaDevices.getUserMedia(
                {

                    video: {

                        facingMode:
                            cameraFacingMode,

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        }

                    },

                    audio:
                        false

                }
            );


        video.srcObject =
            mediaStream;


        video.classList.add(
            "active"
        );


        image.classList.remove(
            "active"
        );


        placeholder.style.display =
            "none";


        video.classList.add(
            "mirrored"
        );


        canvas.classList.add(
            "active"
        );

        canvas.classList.add(
            "mirrored"
        );


        await video.play();


        cameraRunning =
            true;


        startCameraBtn.hidden =
            false;


        stopCameraBtn.hidden =
            false;


        switchCameraBtn.hidden =
            false;


        setStatus(
            "Looking for your face..."
        );


        lastVideoTime =
            -1;


        detectCameraFrame();


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        cameraRunning =
            false;


        if (
            error.name ===
            "NotAllowedError"
        ) {

            showError(
                "Camera permission was denied. Please allow camera access in your browser."
            );

        } else if (
            error.name ===
            "NotFoundError"
        ) {

            showError(
                "No camera was found on this device."
            );

        } else if (
            error.name ===
            "NotReadableError"
        ) {

            showError(
                "The camera is already being used by another application."
            );

        } else {

            showError(
                "Unable to start the camera. Please check your browser camera permissions."
            );

        }

    }

}


/* =========================================================
   CAMERA DETECTION LOOP
   ========================================================= */

function detectCameraFrame() {

    if (!cameraRunning) {
        return;
    }


    if (
        !faceLandmarker ||
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {

        animationFrameId =
            requestAnimationFrame(
                detectCameraFrame
            );

        return;

    }


    /*
       Do not process the exact same video frame repeatedly.
    */

    if (
        video.currentTime !==
        lastVideoTime
    ) {

        lastVideoTime =
            video.currentTime;


        try {

            const results =
                faceLandmarker.detectForVideo(
                    video,
                    performance.now()
                );


            clearCanvas();


            /*
               Canvas dimensions match the actual
               video frame.
            */

            resizeCanvas(
                video.videoWidth ||
                1280,

                video.videoHeight ||
                720
            );


            const landmarks =
                results.faceLandmarks &&
                results.faceLandmarks.length
                    ? results.faceLandmarks[0]
                    : null;


            if (landmarks) {

                drawMakeup(
                    landmarks
                );


                setStatus(
                    `Face detected • ${product.name} applied`
                );


            } else {

                setStatus(
                    "Move your face into the frame"
                );

            }


        } catch (error) {

            console.error(
                "Face detection error:",
                error
            );

        }

    }


    animationFrameId =
        requestAnimationFrame(
            detectCameraFrame
        );

}


/* =========================================================
   STOP CAMERA
   ========================================================= */

function stopCamera() {

    cameraRunning =
        false;


    if (animationFrameId) {

        cancelAnimationFrame(
            animationFrameId
        );

        animationFrameId =
            null;

    }


    if (mediaStream) {

        mediaStream
            .getTracks()
            .forEach(
                track => track.stop()
            );

        mediaStream =
            null;

    }


    if (video) {

        video.pause();

        video.srcObject =
            null;

        video.classList.remove(
            "active"
        );

    }


    if (canvas) {

        canvas.classList.remove(
            "active"
        );

        canvas.classList.remove(
            "mirrored"
        );

        clearCanvas();

    }


    switchCameraBtn.hidden =
        true;

    stopCameraBtn.hidden =
        true;

}


/* =========================================================
   OPEN TRY-ON MODAL
   ========================================================= */

async function openTryOn() {

    clearError();


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


    setStatus(
        "Loading AR face tracking..."
    );


    /*
       Load the face model and then
       automatically start the camera.
    */

    if (!faceTrackingReady) {

        await createFaceLandmarker();

    }


    if (faceTrackingReady) {

        await startCamera();

    }

}


/* =========================================================
   CLOSE TRY-ON MODAL
   ========================================================= */

function closeTryOn() {

    stopCamera();


    tryOnModal.classList.remove(
        "active"
    );


    tryOnModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "tryon-open"
    );


    clearCanvas();


    if (image) {

        image.src =
            "";

        image.classList.remove(
            "active"
        );

    }


    if (placeholder) {

        placeholder.style.display =
            "";

    }


    setStatus(
        "Starting AR..."
    );

}


/* =========================================================
   SWITCH CAMERA
   ========================================================= */

async function switchCamera() {

    if (!cameraRunning) {
        return;
    }


    cameraFacingMode =
        cameraFacingMode === "user"
            ? "environment"
            : "user";


    await startCamera();

}


/* =========================================================
   UPLOAD IMAGE
   ========================================================= */

function handleImageUpload(event) {

    const file =
        event.target.files &&
        event.target.files[0];


    if (!file) {
        return;
    }


    clearError();


    stopCamera();


    const objectUrl =
        URL.createObjectURL(file);


    image.onload =
        async function () {

            URL.revokeObjectURL(
                objectUrl
            );


            image.classList.add(
                "active"
            );


            video.classList.remove(
                "active"
            );


            placeholder.style.display =
                "none";


            canvas.classList.add(
                "active"
            );


            canvas.classList.remove(
                "mirrored"
            );


            resizeCanvas(
                image.naturalWidth,
                image.naturalHeight
            );


            clearCanvas();


            setStatus(
                "Detecting your face..."
            );


            if (!faceTrackingReady) {

                await createFaceLandmarker();

            }


            if (!faceTrackingReady) {
                return;
            }


            try {

                const results =
                    faceLandmarker.detect(
                        image
                    );


                const landmarks =
                    results.faceLandmarks &&
                    results.faceLandmarks.length
                        ? results.faceLandmarks[0]
                        : null;


                clearCanvas();


                if (landmarks) {

                    drawMakeup(
                        landmarks
                    );


                    setStatus(
                        `Face detected • ${product.name} applied`
                    );


                } else {

                    setStatus(
                        "No face detected in this image"
                    );

                }


            } catch (error) {

                console.error(
                    "Uploaded image detection error:",
                    error
                );


                showError(
                    "Unable to detect a face in this image."
                );

            }

        };


    image.onerror =
        function () {

            URL.revokeObjectURL(
                objectUrl
            );


            showError(
                "Unable to load the selected image."
            );

        };


    image.src =
        objectUrl;

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

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
        stopCamera
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
        function () {

            imageInput.click();

        }
    );

}


if (imageInput) {

    imageInput.addEventListener(
        "change",
        handleImageUpload
    );

}


/* =========================================================
   CLOSE WHEN CLICKING OUTSIDE MODAL
   ========================================================= */

if (tryOnModal) {

    tryOnModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                tryOnModal
            ) {

                closeTryOn();

            }

        }
    );

}


/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            tryOnModal &&
            tryOnModal.classList.contains("active")
        ) {

            closeTryOn();

        }

    }
);


/* =========================================================
   INITIAL AR MODEL LOAD

   The model is loaded when the page is ready.
   This means clicking Try On does not have to wait
   for the model in many cases.
   ========================================================= */

createFaceLandmarker()
    .catch(
        error => {

            console.error(
                "Initial AR setup failed:",
                error
            );

        }
    );
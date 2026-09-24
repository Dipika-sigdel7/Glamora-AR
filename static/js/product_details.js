/* =========================================================
   GLAMORA AR
   PRODUCT DETAILS + VIRTUAL TRY-ON

   Features:
   - MediaPipe Face Landmarker
   - Live camera face tracking
   - Product-specific makeup
   - Lipstick on lips
   - Eyeshadow on eyes
   - Eyeliner on eyelids
   - Blush on cheeks
   - Mascara on eyelashes
   - Highlighter
   - Uploaded image face detection
   - Front / rear camera switching
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

const tryOnBtn =
    document.getElementById("tryOnBtn");

const tryOnModal =
    document.getElementById("tryOnModal");

const tryOnClose =
    document.getElementById("tryOnClose");

const video =
    document.getElementById("tryOnVideo");

const canvas =
    document.getElementById("tryOnCanvas");

const image =
    document.getElementById("tryOnImage");

const placeholder =
    document.getElementById("tryOnPlaceholder");

const status =
    document.getElementById("tryOnStatus");

const statusText =
    document.getElementById("tryOnStatusText");

const errorBox =
    document.getElementById("tryOnError");

const startCameraBtn =
    document.getElementById("startCameraBtn");

const uploadImageBtn =
    document.getElementById("uploadImageBtn");

const imageInput =
    document.getElementById("tryOnImageInput");

const switchCameraBtn =
    document.getElementById("switchCameraBtn");

const stopCameraBtn =
    document.getElementById("stopCameraBtn");

const ctx =
    canvas
        ? canvas.getContext("2d", {
            alpha: false,
            desynchronized: true
        })
        : null;


/* =========================================================
   CHECK REQUIRED ELEMENTS
   ========================================================= */

if (!tryOnBtn) {
    console.warn(
        "Glamora AR: Try On button was not found."
    );
}

if (!tryOnModal) {
    console.warn(
        "Glamora AR: Try On modal was not found."
    );
}

if (!canvas) {
    console.error(
        "Glamora AR: Canvas was not found."
    );
}


/* =========================================================
   PRODUCT DATA
   ========================================================= */

const product = {

    id:
        document.body.dataset.productId || "",

    name:
        document.body.dataset.productName || "",

    type:
        document.body.dataset.productType || "",

    shade:
        document.body.dataset.productShade || "",

    color:
        document.body.dataset.productColor || ""

};


/* =========================================================
   PRODUCT TYPE
   ========================================================= */

function normalizeProductType(value) {

    const type =
        String(value || "")
            .trim()
            .toLowerCase();


    if (
        type.includes("lipstick") ||
        type.includes("lip")
    ) {
        return "lipstick";
    }


    if (
        type.includes("eyeshadow") ||
        (
            type.includes("eye") &&
            type.includes("shadow")
        )
    ) {
        return "eyeshadow";
    }


    if (
        type.includes("eyeliner") ||
        type.includes("liner")
    ) {
        return "eyeliner";
    }


    if (
        type.includes("blush")
    ) {
        return "blush";
    }


    if (
        type.includes("mascara")
    ) {
        return "mascara";
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


    return type || "lipstick";

}


const productType =
    normalizeProductType(
        product.type
    );


/* =========================================================
   PRODUCT COLOR
   ========================================================= */

function normalizeColor(value) {

    if (!value) {
        return null;
    }


    const color =
        String(value).trim();


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


function getProductColor() {

    const directColor =
        normalizeColor(
            product.color
        );


    if (directColor) {
        return directColor;
    }


    const text =
        (
            `${product.color} ${product.shade} ${product.name}`
        )
            .toLowerCase();


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


    return "#c85f7a";

}


const makeupColor =
    getProductColor();


/* =========================================================
   STATE
   ========================================================= */

let faceLandmarker =
    null;

let visionFileset =
    null;

let mediaStream =
    null;

let cameraFacingMode =
    "user";

let animationFrameId =
    null;

let lastVideoTime =
    -1;

let faceTrackingReady =
    false;

let faceTrackingLoading =
    false;

let cameraRunning =
    false;

let imageMode =
    false;


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(message) {

    if (statusText) {

        statusText.textContent =
            message;

    }


    if (status) {

        status.classList.add(
            "active"
        );

    }

}


/* =========================================================
   ERROR
   ========================================================= */

function showError(message) {

    console.error(
        "Glamora AR:",
        message
    );


    if (errorBox) {

        errorBox.textContent =
            message;

        errorBox.classList.add(
            "show"
        );

        errorBox.classList.add(
            "active"
        );

    }


    setStatus(
        message
    );

}


function clearError() {

    if (!errorBox) {
        return;
    }


    errorBox.textContent =
        "";

    errorBox.classList.remove(
        "show"
    );

    errorBox.classList.remove(
        "active"
    );

}


/* =========================================================
   CANVAS
   ========================================================= */

function resizeCanvas(
    width,
    height
) {

    if (!canvas) {
        return;
    }


    if (
        canvas.width !== width ||
        canvas.height !== height
    ) {

        canvas.width =
            width;

        canvas.height =
            height;

    }

}


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
   LANDMARK POINT
   ========================================================= */

function point(
    landmarks,
    index
) {

    if (
        !landmarks ||
        !landmarks[index]
    ) {

        return {
            x: 0,
            y: 0
        };

    }


    return {

        x:
            landmarks[index].x *
            canvas.width,

        y:
            landmarks[index].y *
            canvas.height

    };

}


/* =========================================================
   POLYGON
   ========================================================= */

function createPolygonPath(
    landmarks,
    indices
) {

    if (
        !landmarks ||
        !indices ||
        !indices.length
    ) {

        return false;

    }


    const first =
        point(
            landmarks,
            indices[0]
        );


    ctx.beginPath();

    ctx.moveTo(
        first.x,
        first.y
    );


    for (
        let i = 1;
        i < indices.length;
        i++
    ) {

        const p =
            point(
                landmarks,
                indices[i]
            );


        ctx.lineTo(
            p.x,
            p.y
        );

    }


    ctx.closePath();


    return true;

}


function drawPolygon(
    landmarks,
    indices,
    fillStyle
) {

    if (
        !createPolygonPath(
            landmarks,
            indices
        )
    ) {

        return;

    }


    ctx.fillStyle =
        fillStyle;

    ctx.fill();

}


/* =========================================================
   COLOR → RGBA
   ========================================================= */

function hexToRgba(
    color,
    alpha
) {

    if (!color) {

        return `rgba(200,95,122,${alpha})`;

    }


    if (
        !color.startsWith("#")
    ) {

        return color;

    }


    let value =
        color.substring(1);


    if (value.length === 3) {

        value =
            value[0] + value[0] +
            value[1] + value[1] +
            value[2] + value[2];

    }


    if (value.length !== 6) {

        return `rgba(200,95,122,${alpha})`;

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
   LIP LANDMARKS

   MediaPipe Face Mesh / Face Landmarker
   ========================================================= */

const OUTER_LIPS = [

    61,
    185,
    40,
    39,
    37,
    0,
    267,
    269,
    270,
    409,
    291,
    375,
    321,
    405,
    314,
    17,
    84,
    181,
    91,
    146

];


const INNER_LIPS = [

    78,
    191,
    80,
    81,
    82,
    13,
    312,
    311,
    310,
    415,
    308,
    324,
    318,
    402,
    317,
    14,
    87,
    178,
    88,
    95

];


/* =========================================================
   LIPSTICK
   ========================================================= */

function drawLipstick(
    landmarks
) {

    if (!landmarks) {
        return;
    }


    const left =
        point(
            landmarks,
            61
        );

    const right =
        point(
            landmarks,
            291
        );


    const lipWidth =
        Math.abs(
            right.x - left.x
        );


    if (lipWidth < 5) {
        return;
    }


    ctx.save();


    /*
       Main lipstick.
    */

    createPolygonPath(
        landmarks,
        OUTER_LIPS
    );


    ctx.fillStyle =
        hexToRgba(
            makeupColor,
            0.68
        );


    ctx.fill();


    /*
       Remove inner mouth.
    */

    ctx.globalCompositeOperation =
        "destination-out";


    createPolygonPath(
        landmarks,
        INNER_LIPS
    );


    ctx.fillStyle =
        "rgba(0,0,0,1)";

    ctx.fill();


    ctx.globalCompositeOperation =
        "source-over";


    /*
       Slight second layer makes
       the product easier to see.
    */

    createPolygonPath(
        landmarks,
        OUTER_LIPS
    );


    ctx.strokeStyle =
        hexToRgba(
            makeupColor,
            0.45
        );

    ctx.lineWidth =
        Math.max(
            1,
            lipWidth * 0.012
        );

    ctx.stroke();


    /*
       Lip shine.
    */

    const center =
        point(
            landmarks,
            14
        );


    const gradient =
        ctx.createRadialGradient(
            center.x,
            center.y,
            0,
            center.x,
            center.y,
            lipWidth * 0.35
        );


    gradient.addColorStop(
        0,
        "rgba(255,255,255,0.18)"
    );


    gradient.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );


    ctx.fillStyle =
        gradient;


    ctx.beginPath();

    ctx.ellipse(
        center.x,
        center.y,
        lipWidth * 0.25,
        lipWidth * 0.075,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.restore();

}


/* =========================================================
   EYE LANDMARKS
   ========================================================= */

const LEFT_EYE = [

    33,
    246,
    161,
    160,
    159,
    158,
    157,
    173,
    133,
    155,
    154,
    153,
    145,
    144,
    163,
    7

];


const RIGHT_EYE = [

    362,
    398,
    384,
    385,
    386,
    387,
    388,
    466,
    263,
    249,
    390,
    373,
    374,
    380,
    381,
    382

];


/* =========================================================
   EYESHADOW
   ========================================================= */

function drawEyeshadow(
    landmarks
) {

    ctx.save();


    /*
       Soft shadow above left eye.
    */

    drawSoftEyeShadow(
        landmarks,
        LEFT_EYE
    );


    /*
       Soft shadow above right eye.
    */

    drawSoftEyeShadow(
        landmarks,
        RIGHT_EYE
    );


    ctx.restore();

}


function drawSoftEyeShadow(
    landmarks,
    indices
) {

    const points =
        indices.map(
            index =>
                point(
                    landmarks,
                    index
                )
        );


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
        minY +
        (maxY - minY) *
        0.35;


    const radiusX =
        (maxX - minX) *
        0.65;


    const radiusY =
        Math.max(
            (maxY - minY) *
            1.1,

            canvas.height *
            0.025
        );


    const gradient =
        ctx.createRadialGradient(
            centerX,
            centerY,
            0,
            centerX,
            centerY,
            radiusX
        );


    gradient.addColorStop(
        0,
        hexToRgba(
            makeupColor,
            0.38
        )
    );


    gradient.addColorStop(
        0.55,
        hexToRgba(
            makeupColor,
            0.20
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


/* =========================================================
   EYELINER
   ========================================================= */

const LEFT_UPPER_EYE = [

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


const RIGHT_UPPER_EYE = [

    362,
    398,
    384,
    385,
    386,
    387,
    388,
    466,
    263

];


function drawEyeliner(
    landmarks
) {

    ctx.save();


    ctx.strokeStyle =
        hexToRgba(
            makeupColor,
            0.92
        );


    const faceWidth =
        Math.abs(
            point(
                landmarks,
                234
            ).x -
            point(
                landmarks,
                454
            ).x
        );


    ctx.lineWidth =
        Math.max(
            1.5,
            faceWidth * 0.006
        );


    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";


    drawSmoothLine(
        landmarks,
        LEFT_UPPER_EYE
    );


    drawSmoothLine(
        landmarks,
        RIGHT_UPPER_EYE
    );


    ctx.restore();

}


function drawSmoothLine(
    landmarks,
    indices
) {

    if (
        !indices ||
        indices.length < 2
    ) {

        return;

    }


    ctx.beginPath();


    const first =
        point(
            landmarks,
            indices[0]
        );


    ctx.moveTo(
        first.x,
        first.y
    );


    for (
        let i = 1;
        i < indices.length;
        i++
    ) {

        const p =
            point(
                landmarks,
                indices[i]
            );


        ctx.lineTo(
            p.x,
            p.y
        );

    }


    ctx.stroke();

}


/* =========================================================
   MASCARA
   ========================================================= */

function drawMascara(
    landmarks
) {

    ctx.save();


    ctx.strokeStyle =
        hexToRgba(
            makeupColor === "#c85f7a"
                ? "#171114"
                : makeupColor,
            0.85
        );


    const faceWidth =
        Math.abs(
            point(
                landmarks,
                234
            ).x -
            point(
                landmarks,
                454
            ).x
        );


    ctx.lineWidth =
        Math.max(
            2,
            faceWidth * 0.008
        );


    ctx.lineCap =
        "round";


    drawSmoothLine(
        landmarks,
        LEFT_UPPER_EYE
    );


    drawSmoothLine(
        landmarks,
        RIGHT_UPPER_EYE
    );


    ctx.restore();

}


/* =========================================================
   BLUSH
   ========================================================= */

function drawBlush(
    landmarks
) {

    drawBlushSpot(
        landmarks,
        50
    );


    drawBlushSpot(
        landmarks,
        280
    );

}


function drawBlushSpot(
    landmarks,
    landmarkIndex
) {

    const center =
        point(
            landmarks,
            landmarkIndex
        );


    const faceWidth =
        Math.abs(
            point(
                landmarks,
                234
            ).x -
            point(
                landmarks,
                454
            ).x
        );


    const radius =
        Math.max(
            25,
            faceWidth * 0.075
        );


    const gradient =
        ctx.createRadialGradient(
            center.x,
            center.y,
            0,
            center.x,
            center.y,
            radius
        );


    gradient.addColorStop(
        0,
        hexToRgba(
            makeupColor,
            0.24
        )
    );


    gradient.addColorStop(
        0.45,
        hexToRgba(
            makeupColor,
            0.15
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
        center.x,
        center.y,
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
            landmarks,
            1
        );


    const leftCheek =
        point(
            landmarks,
            116
        );


    const rightCheek =
        point(
            landmarks,
            345
        );


    drawGlow(
        nose.x,
        nose.y,
        canvas.width * 0.025
    );


    drawGlow(
        leftCheek.x,
        leftCheek.y,
        canvas.width * 0.025
    );


    drawGlow(
        rightCheek.x,
        rightCheek.y,
        canvas.width * 0.025
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
        "rgba(255,255,255,0.48)"
    );


    gradient.addColorStop(
        0.4,
        "rgba(255,255,255,0.18)"
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
   FOUNDATION

   Kept subtle because proper foundation AR requires
   facial segmentation rather than only landmarks.
   ========================================================= */

function drawFoundation(
    landmarks
) {

    const faceWidth =
        Math.abs(
            point(
                landmarks,
                234
            ).x -
            point(
                landmarks,
                454
            ).x
        );


    const forehead =
        point(
            landmarks,
            10
        );


    const chin =
        point(
            landmarks,
            152
        );


    const centerX =
        (forehead.x + chin.x) / 2;


    const centerY =
        (forehead.y + chin.y) / 2;


    const faceHeight =
        Math.abs(
            chin.y -
            forehead.y
        );


    const gradient =
        ctx.createRadialGradient(
            centerX,
            centerY,
            faceWidth * 0.15,
            centerX,
            centerY,
            faceWidth * 0.55
        );


    gradient.addColorStop(
        0,
        "rgba(255,255,255,0.04)"
    );


    gradient.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );


    ctx.fillStyle =
        gradient;


    ctx.beginPath();

    ctx.ellipse(
        centerX,
        centerY,
        faceWidth * 0.48,
        faceHeight * 0.46,
        0,
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


        case "mascara":

            drawMascara(
                landmarks
            );

            break;


        case "highlighter":

            drawHighlighter(
                landmarks
            );

            break;


        case "foundation":

            drawFoundation(
                landmarks
            );

            break;


        default:

            /*
               Do NOT put lipstick on the user's lips
               for an unknown product type.

               Instead, keep the face clean and tell
               the user that AR has detected the face.
            */

            break;

    }

}


/* =========================================================
   INITIALIZE MEDIAPIPE
   ========================================================= */

async function initializeFaceTracking() {

    if (faceTrackingReady) {

        return true;

    }


    if (faceTrackingLoading) {

        /*
           Wait for the existing initialization
           instead of starting a second initialization.
        */

        while (faceTrackingLoading) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        100
                    )
            );

        }


        return faceTrackingReady;

    }


    faceTrackingLoading =
        true;


    clearError();


    setStatus(
        "Loading AR face tracking..."
    );


    try {

        console.log(
            "Glamora AR: Loading MediaPipe..."
        );


        /*
           Load the WASM runtime once.
        */

        visionFileset =
            await FilesetResolver.forVisionTasks(
                WASM_URL
            );


        console.log(
            "Glamora AR: WASM loaded."
        );


        /*
           Try GPU first.
        */

        try {

            console.log(
                "Glamora AR: Trying GPU..."
            );


            faceLandmarker =
                await FaceLandmarker.createFromOptions(
                    visionFileset,
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
                            0.45,

                        minFacePresenceConfidence:
                            0.45,

                        minTrackingConfidence:
                            0.45,

                        outputFaceBlendshapes:
                            false,

                        outputFacialTransformationMatrixes:
                            false

                    }
                );


            console.log(
                "Glamora AR: GPU FaceLandmarker loaded."
            );


        } catch (gpuError) {

            console.warn(
                "Glamora AR: GPU initialization failed.",
                gpuError
            );


            /*
               CPU fallback.
            */

            faceLandmarker =
                await FaceLandmarker.createFromOptions(
                    visionFileset,
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
                            0.45,

                        minFacePresenceConfidence:
                            0.45,

                        minTrackingConfidence:
                            0.45,

                        outputFaceBlendshapes:
                            false,

                        outputFacialTransformationMatrixes:
                            false

                    }
                );


            console.log(
                "Glamora AR: CPU FaceLandmarker loaded."
            );

        }


        faceTrackingReady =
            true;


        setStatus(
            "AR ready • Starting camera..."
        );


        console.log(
            "Glamora AR: Face tracking ready."
        );


        return true;


    } catch (error) {

        faceLandmarker =
            null;

        faceTrackingReady =
            false;


        console.error(
            "Glamora AR: MediaPipe initialization failed:",
            error
        );


        showError(
            "AR face tracking could not be loaded. Please check your internet connection and refresh the page."
        );


        return false;


    } finally {

        faceTrackingLoading =
            false;

    }

}


/* =========================================================
   DRAW CAMERA FRAME
   ========================================================= */

function drawCameraFrame() {

    if (
        !video ||
        !canvas ||
        !ctx
    ) {

        return;

    }


    const width =
        video.videoWidth;

    const height =
        video.videoHeight;


    if (
        !width ||
        !height
    ) {

        return;

    }


    resizeCanvas(
        width,
        height
    );


    /*
       Mirror the complete camera image.

       IMPORTANT:
       The makeup is drawn while this transform is active.
       Therefore the face landmarks and makeup remain aligned.
    */

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
        video,
        0,
        0,
        width,
        height
    );


    ctx.restore();

}


/* =========================================================
   DRAW CAMERA + MAKEUP
   ========================================================= */

function renderCameraFrame() {

    if (
        !cameraRunning ||
        !faceLandmarker ||
        !video
    ) {

        return;

    }


    if (
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {

        return;

    }


    /*
       Draw the camera first.
    */

    drawCameraFrame();


    /*
       Detect face.
    */

    try {

        if (
            video.currentTime !==
            lastVideoTime
        ) {

            lastVideoTime =
                video.currentTime;


            const results =
                faceLandmarker.detectForVideo(
                    video,
                    performance.now()
                );


            const landmarks =
                results &&
                results.faceLandmarks &&
                results.faceLandmarks.length
                    ? results.faceLandmarks[0]
                    : null;


            if (landmarks) {

                /*
                   IMPORTANT:

                   We mirror the makeup coordinates
                   inside the canvas as well.
                */

                ctx.save();


                ctx.translate(
                    canvas.width,
                    0
                );


                ctx.scale(
                    -1,
                    1
                );


                drawMakeup(
                    landmarks
                );


                ctx.restore();


                setStatus(
                    `Face detected • ${product.name || productType} applied`
                );


            } else {

                setStatus(
                    "Move your face into the frame"
                );

            }

        }


    } catch (error) {

        console.error(
            "Glamora AR face detection error:",
            error
        );


        setStatus(
            "Face tracking is starting..."
        );

    }

}


/* =========================================================
   CAMERA LOOP
   ========================================================= */

function cameraLoop() {

    if (!cameraRunning) {

        return;

    }


    renderCameraFrame();


    animationFrameId =
        requestAnimationFrame(
            cameraLoop
        );

}


/* =========================================================
   START CAMERA
   ========================================================= */

async function startCamera() {

    clearError();


    /*
       Make sure MediaPipe is ready.
    */

    const ready =
        await initializeFaceTracking();


    if (!ready) {

        return;

    }


    /*
       Stop any existing camera.
    */

    stopCamera();


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        showError(
            "Camera access is not supported by this browser."
        );

        return;

    }


    try {

        setStatus(
            "Requesting camera permission..."
        );


        mediaStream =
            await navigator.mediaDevices.getUserMedia(
                {

                    video: {

                        facingMode:
                            {
                                ideal:
                                    cameraFacingMode
                            },

                        width:
                            {
                                ideal:
                                    1280
                            },

                        height:
                            {
                                ideal:
                                    720
                            },

                        frameRate:
                            {
                                ideal:
                                    30,

                                max:
                                    30
                            }

                    },

                    audio:
                        false

                }
            );


        video.srcObject =
            mediaStream;


        imageMode =
            false;


        image.classList.remove(
            "active"
        );


        video.classList.add(
            "active"
        );


        canvas.classList.add(
            "active"
        );


        canvas.classList.remove(
            "mirrored"
        );


        if (placeholder) {

            placeholder.style.display =
                "none";

        }


        await video.play();


        /*
           Wait until actual video dimensions
           are available.
        */

        await waitForVideoDimensions();


        resizeCanvas(
            video.videoWidth,
            video.videoHeight
        );


        cameraRunning =
            true;


        lastVideoTime =
            -1;


        startCameraBtn.hidden =
            false;


        stopCameraBtn.hidden =
            false;


        switchCameraBtn.hidden =
            false;


        setStatus(
            "Looking for your face..."
        );


        cameraLoop();


    } catch (error) {

        cameraRunning =
            false;


        if (mediaStream) {

            mediaStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

            mediaStream =
                null;

        }


        console.error(
            "Glamora AR camera error:",
            error
        );


        handleCameraError(
            error
        );

    }

}


/* =========================================================
   WAIT FOR VIDEO DIMENSIONS
   ========================================================= */

function waitForVideoDimensions() {

    return new Promise(
        resolve => {

            if (
                video.videoWidth > 0 &&
                video.videoHeight > 0
            ) {

                resolve();

                return;

            }


            const check =
                () => {

                    if (
                        video.videoWidth > 0 &&
                        video.videoHeight > 0
                    ) {

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


/* =========================================================
   CAMERA ERROR HANDLER
   ========================================================= */

function handleCameraError(
    error
) {

    if (
        error &&
        error.name ===
        "NotAllowedError"
    ) {

        showError(
            "Camera permission was denied. Allow camera access in your browser, then click Use Camera."
        );


        return;

    }


    if (
        error &&
        error.name ===
        "NotFoundError"
    ) {

        showError(
            "No camera was found on this device."
        );


        return;

    }


    if (
        error &&
        error.name ===
        "NotReadableError"
    ) {

        showError(
            "The camera is already being used by another application."
        );


        return;

    }


    if (
        error &&
        error.name ===
        "SecurityError"
    ) {

        showError(
            "Camera access was blocked for security reasons. Use localhost or HTTPS."
        );


        return;

    }


    showError(
        "Unable to start the camera. Please check your browser camera permissions."
    );

}


/* =========================================================
   STOP CAMERA
   ========================================================= */

function stopCamera() {

    cameraRunning =
        false;


    if (animationFrameId !== null) {

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
                track =>
                    track.stop()
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


    if (switchCameraBtn) {

        switchCameraBtn.hidden =
            true;

    }


    if (stopCameraBtn) {

        stopCameraBtn.hidden =
            true;

    }


    lastVideoTime =
        -1;

}


/* =========================================================
   UPLOAD IMAGE
   ========================================================= */

async function handleImageUpload(
    event
) {

    const file =
        event.target.files &&
        event.target.files[0];


    if (!file) {
        return;
    }


    clearError();


    stopCamera();


    imageMode =
        true;


    setStatus(
        "Loading your image..."
    );


    const objectUrl =
        URL.createObjectURL(
            file
        );


    image.onload =
        async function () {

            URL.revokeObjectURL(
                objectUrl
            );


            video.classList.remove(
                "active"
            );


            image.classList.add(
                "active"
            );


            canvas.classList.add(
                "active"
            );


            canvas.classList.remove(
                "mirrored"
            );


            if (placeholder) {

                placeholder.style.display =
                    "none";

            }


            resizeCanvas(
                image.naturalWidth,
                image.naturalHeight
            );


            /*
               Draw original uploaded image.
            */

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );


            ctx.drawImage(
                image,
                0,
                0,
                canvas.width,
                canvas.height
            );


            const ready =
                await initializeFaceTracking();


            if (!ready) {
                return;
            }


            try {

                /*
                   Uploaded images use detect(),
                   not detectForVideo().
                */

                const results =
                    faceLandmarker.detect(
                        image
                    );


                const landmarks =
                    results &&
                    results.faceLandmarks &&
                    results.faceLandmarks.length
                        ? results.faceLandmarks[0]
                        : null;


                /*
                   Redraw the image because detection
                   does not draw anything.
                */

                ctx.clearRect(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );


                ctx.drawImage(
                    image,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );


                if (landmarks) {

                    drawMakeup(
                        landmarks
                    );


                    setStatus(
                        `Face detected • ${product.name || productType} applied`
                    );


                } else {

                    setStatus(
                        "No face detected in this image"
                    );

                }


            } catch (error) {

                console.error(
                    "Glamora AR uploaded image detection error:",
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
   OPEN TRY-ON
   ========================================================= */

async function openTryOn() {

    if (!tryOnModal) {
        return;
    }


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


    imageMode =
        false;


    setStatus(
        "Loading AR face tracking..."
    );


    /*
       Load MediaPipe first.
    */

    const ready =
        await initializeFaceTracking();


    if (!ready) {
        return;
    }


    /*
       Automatically open camera.
    */

    await startCamera();

}


/* =========================================================
   CLOSE TRY-ON
   ========================================================= */

function closeTryOn() {

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


    clearCanvas();


    if (image) {

        image.onload =
            null;

        image.onerror =
            null;

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

            if (imageInput) {

                imageInput.click();

            }

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
   CLICK OUTSIDE MODAL
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
   INITIAL PAGE SETUP
   ========================================================= */

console.log(
    "========================================"
);

console.log(
    "Glamora AR initialized"
);

console.log(
    "Product:",
    product.name
);

console.log(
    "Type:",
    productType
);

console.log(
    "Shade:",
    product.shade
);

console.log(
    "Color:",
    makeupColor
);

console.log(
    "========================================"
);


/*
   IMPORTANT:

   Do NOT initialize the model here.

   It will initialize when the user clicks
   Try On. This prevents two simultaneous
   FaceLandmarker initialization processes.
*/
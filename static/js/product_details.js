/* =========================================================
GLAMORA AR
PRODUCT DETAILS + VIRTUAL TRY-ON
================================

Features:

* MediaPipe Face Landmarker
* Live camera face tracking
* Product-specific makeup
* Lipstick
* Eyeshadow
* Eyeliner
* Blush
* Mascara
* Highlighter
* Foundation
* Uploaded image face detection
* Front / rear camera switching
* Camera stop/start
* Error handling
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
alpha: true,
desynchronized: true
})
: null;

/* =========================================================
REQUIRED ELEMENT CHECK
========================================================= */

console.log("Glamora AR: checking DOM...");

if (!tryOnBtn) {
console.warn(
"Glamora AR: #tryOnBtn was not found."
);
}

if (!tryOnModal) {
console.warn(
"Glamora AR: #tryOnModal was not found."
);
}

if (!video) {
console.warn(
"Glamora AR: #tryOnVideo was not found."
);
}

if (!canvas) {
console.warn(
"Glamora AR: #tryOnCanvas was not found."
);
}

if (!tryOnBtn || !tryOnModal || !video || !canvas) {
console.error(
"Glamora AR: Required Try-On elements are missing."
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
    type === "lip" ||
    type.includes("lip color") ||
    type.includes("lip colour")
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
    type.includes("eye liner") ||
    type === "liner"
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
    type.includes("highlighter") ||
    type === "highlight"
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
    String(value)
        .trim();


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


if (text.includes("purple")) {
    return "#7b3f98";
}


if (text.includes("gold")) {
    return "#d6a84f";
}


if (text.includes("silver")) {
    return "#bfc4cc";
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

let faceTrackingPromise =
null;

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


width =
    Math.max(
        1,
        Math.floor(width)
    );


height =
    Math.max(
        1,
        Math.floor(height)
    );


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
    !landmarks[index] ||
    !canvas
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
    !ctx ||
    !landmarks ||
    !indices ||
    indices.length < 3
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
    color.startsWith("rgb")
) {

    return color;

}


if (
    !color.startsWith("#")
) {

    return `rgba(200,95,122,${alpha})`;

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


if (
    !ctx ||
    !landmarks
) {

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
        right.x -
        left.x
    );


if (lipWidth < 5) {
    return;
}


ctx.save();


/*
   Soft lipstick base.
*/

if (
    createPolygonPath(
        landmarks,
        OUTER_LIPS
    )
) {

    ctx.fillStyle =
        hexToRgba(
            makeupColor,
            0.72
        );


    ctx.fill();

}


/*
   Remove inner mouth.
*/

ctx.globalCompositeOperation =
    "destination-out";


if (
    createPolygonPath(
        landmarks,
        INNER_LIPS
    )
) {

    ctx.fillStyle =
        "rgba(0,0,0,1)";


    ctx.fill();

}


ctx.globalCompositeOperation =
    "source-over";


/*
   Lip outline.
*/

if (
    createPolygonPath(
        landmarks,
        OUTER_LIPS
    )
) {

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

}


/*
   Subtle shine.
*/

const upperLip =
    point(
        landmarks,
        13
    );


const gradient =
    ctx.createRadialGradient(
        upperLip.x,
        upperLip.y,
        0,
        upperLip.x,
        upperLip.y,
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
    upperLip.x,
    upperLip.y,
    lipWidth * 0.22,
    lipWidth * 0.055,
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


if (!ctx) {
    return;
}


ctx.save();


drawSoftEyeShadow(
    landmarks,
    LEFT_EYE
);


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
    Math.max(
        10,
        (maxX - minX) *
        0.68
    );


const radiusY =
    Math.max(
        10,
        (maxY - minY) *
        1.15
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
        0.42
    )
);


gradient.addColorStop(
    0.5,
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


if (!ctx) {
    return;
}


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
    !ctx ||
    !landmarks ||
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


if (!ctx) {
    return;
}


ctx.save();


ctx.strokeStyle =
    "#171114";


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


/*
   Small lash extensions.
*/

drawLashLines(
    landmarks,
    LEFT_UPPER_EYE
);


drawLashLines(
    landmarks,
    RIGHT_UPPER_EYE
);


ctx.restore();


}

function drawLashLines(
landmarks,
indices
) {


if (!ctx) {
    return;
}


const selected =
    [
        indices[1],
        indices[3],
        indices[5],
        indices[7]
    ];


selected.forEach(
    index => {

        const p =
            point(
                landmarks,
                index
            );


        ctx.beginPath();


        ctx.moveTo(
            p.x,
            p.y
        );


        ctx.lineTo(
            p.x,
            p.y - 5
        );


        ctx.stroke();

    }
);


}

/* =========================================================
BLUSH
========================================================= */

function drawBlush(
landmarks
) {


if (!ctx) {
    return;
}


drawBlushSpot(
    landmarks,
    50
);


drawBlushSpot(
    landmarks,
    280
);
```

}

function drawBlushSpot(
landmarks,
landmarkIndex
) {

```
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
        0.28
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
        12,
        faceWidth * 0.025
    );


drawGlow(
    nose.x,
    nose.y,
    radius
);


drawGlow(
    leftCheek.x,
    leftCheek.y,
    radius
);


drawGlow(
    rightCheek.x,
    rightCheek.y,
    radius
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
    "rgba(255,255,255,0.55)"
);


gradient.addColorStop(
    0.4,
    "rgba(255,255,255,0.20)"
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
========================================================= */

function drawFoundation(
landmarks
) {


if (!ctx) {
    return;
}


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
    (forehead.x + chin.x) /
    2;


const centerY =
    (forehead.y + chin.y) /
    2;


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
    "rgba(255,255,255,0.035)"
);


gradient.addColorStop(
    0.65,
    "rgba(255,255,255,0.015)"
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

        console.warn(
            "Glamora AR: Unsupported product type:",
            productType
        );

        break;

}


}

/* =========================================================
INITIALIZE MEDIAPIPE
========================================================= */

async function initializeFaceTracking() {


if (faceTrackingReady && faceLandmarker) {

    return true;

}


/*
   If initialization is already happening,
   wait for that same promise.
*/

if (faceTrackingPromise) {

    return await faceTrackingPromise;

}


faceTrackingPromise =
    (async () => {

        clearError();


        setStatus(
            "Loading AR face tracking..."
        );


        try {

            console.log(
                "Glamora AR: Loading MediaPipe..."
            );


            /*
               Load WASM.
            */

            if (!visionFileset) {

                visionFileset =
                    await FilesetResolver.forVisionTasks(
                        WASM_URL
                    );

            }


            console.log(
                "Glamora AR: WASM loaded."
            );


            /*
               Try GPU.
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
                    "Glamora AR: GPU loaded."
                );


            } catch (gpuError) {

                console.warn(
                    "Glamora AR: GPU failed. Using CPU.",
                    gpuError
                );


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
                    "Glamora AR: CPU loaded."
                );

            }


            faceTrackingReady =
                true;


            setStatus(
                "AR ready"
            );


            console.log(
                "Glamora AR: FaceLandmarker ready."
            );


            return true;


        } catch (error) {

            console.error(
                "Glamora AR: MediaPipe initialization failed:",
                error
            );


            faceLandmarker =
                null;


            faceTrackingReady =
                false;


            showError(
                "AR face tracking could not be loaded. Check your internet connection and refresh the page."
            );


            return false;


        } finally {

            faceTrackingPromise =
                null;

        }

    })();


return await faceTrackingPromise;


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
    width <= 0 ||
    height <= 0
) {

    return;

}


resizeCanvas(
    width,
    height
);


ctx.clearRect(
    0,
    0,
    width,
    height
);


/*
   Draw the camera normally.

   The canvas itself can be mirrored
   with CSS if desired. We keep the
   coordinate system consistent here.
*/

ctx.drawImage(
    video,
    0,
    0,
    width,
    height
);


}

/* =========================================================
CAMERA RENDER
========================================================= */

function renderCameraFrame() {


if (
    !cameraRunning ||
    !faceLandmarker ||
    !video ||
    !canvas ||
    !ctx
) {

    return;

}


if (
    video.readyState <
    HTMLMediaElement.HAVE_CURRENT_DATA
) {

    return;

}


drawCameraFrame();


try {

    /*
       Only process a new video frame.
    */

    if (
        video.currentTime ===
        lastVideoTime
    ) {

        return;

    }


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

        drawMakeup(
            landmarks
        );


        setStatus(
            `Face detected • ${product.name || productType} applied`
        );


    } else {

        setStatus(
            "Move your face into the frame"
        );

    }


} catch (error) {

    console.error(
        "Glamora AR: face detection error:",
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


if (!video) {

    showError(
        "Camera preview element is missing."
    );

    return;

}


if (!canvas) {

    showError(
        "AR canvas element is missing."
    );

    return;

}


/*
   Browser camera support.
*/

if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
) {

    showError(
        "Camera access is not supported by this browser. Use Chrome or another modern browser."
    );

    return;

}


/*
   Make sure MediaPipe is ready.
*/

const ready =
    await initializeFaceTracking();


if (!ready) {

    return;

}


/*
   Stop the old stream first.
*/

stopCamera();


try {

    setStatus(
        "Requesting camera permission..."
    );


    const constraints = {

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

    };


    mediaStream =
        await navigator.mediaDevices.getUserMedia(
            constraints
        );


    console.log(
        "Glamora AR: Camera permission granted."
    );


    video.srcObject =
        mediaStream;


    imageMode =
        false;


    if (image) {

        image.classList.remove(
            "active"
        );

    }


    video.classList.add(
        "active"
    );


    canvas.classList.add(
        "active"
    );


    if (placeholder) {

        placeholder.style.display =
            "none";

    }


    /*
       Start video.
    */

    await video.play();


    /*
       Wait for real dimensions.
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


    if (startCameraBtn) {

        startCameraBtn.hidden =
            true;

    }


    if (stopCameraBtn) {

        stopCameraBtn.hidden =
            false;

    }


    if (switchCameraBtn) {

        switchCameraBtn.hidden =
            false;

    }


    setStatus(
        "Looking for your face..."
    );


    /*
       Start rendering.
    */

    if (animationFrameId !== null) {

        cancelAnimationFrame(
            animationFrameId
        );

    }


    cameraLoop();


} catch (error) {

    console.error(
        "Glamora AR: camera error:",
        error
    );


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


        let attempts =
            0;


        const maxAttempts =
            300;


        const check =
            () => {

                if (
                    video.videoWidth > 0 &&
                    video.videoHeight > 0
                ) {

                    resolve();

                    return;

                }


                attempts++;


                if (
                    attempts >=
                    maxAttempts
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
        "Camera permission was denied. Allow camera access in your browser and click Use Camera again."
    );

    return;

}


if (
    error &&
    error.name ===
    "PermissionDeniedError"
) {

    showError(
        "Camera permission was denied. Allow camera access and try again."
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
    "OverconstrainedError"
) {

    showError(
        "The selected camera does not support the requested settings. Try switching the camera."
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
    "Unable to start the camera. Check your browser camera permissions."
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
            track => {

                try {

                    track.stop();

                } catch (error) {

                    console.warn(
                        "Glamora AR: unable to stop camera track.",
                        error
                    );

                }

            }
        );


    mediaStream =
        null;

}


if (video) {

    try {

        video.pause();

    } catch (error) {

        console.warn(
            "Glamora AR: video pause failed.",
            error
        );

    }


    video.srcObject =
        null;


    video.classList.remove(
        "active"
    );

}


if (stopCameraBtn) {

    stopCameraBtn.hidden =
        true;

}


if (switchCameraBtn) {

    switchCameraBtn.hidden =
        true;

}


if (startCameraBtn) {

    startCameraBtn.hidden =
        false;

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


/*
   Validate image.
*/

if (
    !file.type.startsWith(
        "image/"
    )
) {

    showError(
        "Please select a valid image file."
    );


    event.target.value =
        "";


    return;

}


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


if (!image) {

    URL.revokeObjectURL(
        objectUrl
    );


    showError(
        "Image preview element is missing."
    );


    return;

}


image.onload =
    async function () {

        try {

            /*
               Hide video.
            */

            video.classList.remove(
                "active"
            );


            image.classList.add(
                "active"
            );


            canvas.classList.add(
                "active"
            );


            if (placeholder) {

                placeholder.style.display =
                    "none";

            }


            /*
               Canvas matches image exactly.
            */

            resizeCanvas(
                image.naturalWidth,
                image.naturalHeight
            );


            /*
               Draw original image.
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


            /*
               Load MediaPipe if necessary.
            */

            const ready =
                await initializeFaceTracking();


            if (!ready) {

                return;

            }


            setStatus(
                "Detecting your face..."
            );


            /*
               Detect uploaded image.
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
               Redraw original image.
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
                "Glamora AR: uploaded image detection error:",
                error
            );


            showError(
                "Unable to detect a face in this image."
            );

        } finally {

            URL.revokeObjectURL(
                objectUrl
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

async function openTryOn(
event
) {


if (event) {

    event.preventDefault();

}


console.log(
    "Glamora AR: Try On clicked."
);


if (!tryOnModal) {

    console.error(
        "Glamora AR: Try-On modal is missing."
    );


    return;

}


clearError();


/*
   Open modal FIRST.

   This is important because the user
   should immediately see that Try-On
   has responded to the click.
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


imageMode =
    false;


setStatus(
    "Loading AR face tracking..."
);


/*
   Initialize MediaPipe once.
*/

const ready =
    await initializeFaceTracking();


if (!ready) {

    return;

}


/*
   Automatically start camera.
*/

await startCamera();


}

/* =========================================================
CLOSE TRY-ON
========================================================= */

function closeTryOn(
event
) {


if (event) {

    event.preventDefault();

}


console.log(
    "Glamora AR: Closing Try-On."
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


if (imageInput) {

    imageInput.value =
        "";

}


imageMode =
    false;


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


console.log(
    "Glamora AR: Switching camera."
);


cameraFacingMode =
    cameraFacingMode === "user"
        ? "environment"
        : "user";


await startCamera();


}

/* =========================================================
START CAMERA BUTTON
========================================================= */

if (startCameraBtn) {


startCameraBtn.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        startCamera();

    }
);


}

/* =========================================================
STOP CAMERA BUTTON
========================================================= */

if (stopCameraBtn) {


stopCameraBtn.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        stopCamera();

        setStatus(
            "Camera stopped"
        );

    }
);


}

/* =========================================================
TRY ON BUTTON
========================================================= */

if (tryOnBtn) {


tryOnBtn.addEventListener(
    "click",
    openTryOn
);


console.log(
    "Glamora AR: Try On listener attached."
);


}

/* =========================================================
CLOSE BUTTON
========================================================= */

if (tryOnClose) {


tryOnClose.addEventListener(
    "click",
    closeTryOn
);

}

/* =========================================================
UPLOAD BUTTON
========================================================= */

if (uploadImageBtn) {


uploadImageBtn.addEventListener(
    "click",
    function (event) {

        event.preventDefault();


        if (imageInput) {

            imageInput.click();

        }

    }
);


}

/* =========================================================
IMAGE INPUT
========================================================= */

if (imageInput) {


imageInput.addEventListener(
    "change",
    handleImageUpload
);


}

/* =========================================================
SWITCH CAMERA BUTTON
========================================================= */

if (switchCameraBtn) {


switchCameraBtn.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        switchCamera();

    }
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
PAGE CLEANUP
========================================================= */

window.addEventListener(
"beforeunload",
function () {


    stopCamera();

}

);

/* =========================================================
INITIAL DEBUG INFORMATION
========================================================= */

console.log(
"========================================"
);

console.log(
"Glamora AR initialized"
);

console.log(
"Product ID:",
product.id
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
"Try On button:",
!!tryOnBtn
);

console.log(
"Try On modal:",
!!tryOnModal
);

console.log(
"Camera video:",
!!video
);

console.log(
"Canvas:",
!!canvas
);

console.log(
"========================================"
);

/*
IMPORTANT:

MediaPipe is NOT initialized on page load.

It initializes only when the user clicks
Try On or Use Camera.

This prevents unnecessary model loading
and duplicate FaceLandmarker instances.
*/

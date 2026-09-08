
/* =========================================================
   GLAMORA AR
   INTERACTIVE UI
   ========================================================= */


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let lastLipstickIndex = -1;
let lipstickHoverTimer = null;


/* =========================================================
   PAGE LOAD
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeLoader();

    initializeRevealAnimations();

    initializeActiveNavigation();

    initializeMakeupOptions();

    initializeHeroParallax();

    initializeMobileMenu();

    initializeProductHover();

    initializeCartDemo();


    /*
     * =====================================================
     * INITIAL RANDOM BEAUTY LOOK
     * =====================================================
     */

    randomizeLipstick();

    randomizeEyeliner();


    /*
     * =====================================================
     * AUTOMATIC LIPSTICK CHANGE
     *
     * Changes lipstick every 5 seconds.
     * =====================================================
     */

    setInterval(() => {

        randomizeLipstick();

    }, 5000);

});


/* =========================================================
   LOADER
   ========================================================= */

function initializeLoader() {

    window.addEventListener("load", () => {

        setTimeout(() => {

            const loader =
                document.getElementById("loader");

            if (loader) {

                loader.classList.add("hidden");

            }

            document.body.classList.add("loaded");

        }, 1700);

    });

}


/* =========================================================
   SCROLL REVEAL
   ========================================================= */

function initializeRevealAnimations() {

    const revealElements =
        document.querySelectorAll(".reveal");

    if (!revealElements.length) {

        return;

    }


    const revealObserver =
        new IntersectionObserver(
            (entries) => {

                entries.forEach((entry) => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "visible"
                        );

                        revealObserver.unobserve(
                            entry.target
                        );

                    }

                });

            },
            {
                threshold: 0.12
            }
        );


    revealElements.forEach((element) => {

        revealObserver.observe(element);

    });

}


/* =========================================================
   ACTIVE NAVIGATION
   ========================================================= */

function initializeActiveNavigation() {

    const navLinks =
        document.querySelectorAll(
            ".nav-links a"
        );

    if (!navLinks.length) {

        return;

    }


    let currentPath =
        window.location.pathname;


    /*
     * Remove trailing slash.
     */

    if (
        currentPath.length > 1 &&
        currentPath.endsWith("/")
    ) {

        currentPath =
            currentPath.slice(0, -1);

    }


    navLinks.forEach((link) => {

        link.classList.remove("active");


        const href =
            link.getAttribute("href");


        if (!href) {

            return;

        }


        /*
         * Remove hash from URL.
         */

        const linkPath =
            href.split("#")[0];


        /*
         * Normalize link path.
         */

        let normalizedLinkPath =
            linkPath;


        if (
            normalizedLinkPath.length > 1 &&
            normalizedLinkPath.endsWith("/")
        ) {

            normalizedLinkPath =
                normalizedLinkPath.slice(0, -1);

        }


        /*
         * Homepage handling.
         */

        if (
            normalizedLinkPath === currentPath ||
            (
                (
                    currentPath === "" ||
                    currentPath === "/"
                ) &&
                (
                    normalizedLinkPath === "" ||
                    normalizedLinkPath === "/"
                )
            )
        ) {

            link.classList.add("active");

        }

    });

}


/* =========================================================
   MAKEUP OPTIONS
   ========================================================= */

function initializeMakeupOptions() {

    const makeupOptions =
        document.querySelectorAll(
            ".makeup-option"
        );


    if (!makeupOptions.length) {

        return;

    }


    makeupOptions.forEach((option) => {

        option.addEventListener(
            "click",
            () => {

                makeupOptions.forEach((item) => {

                    item.classList.remove(
                        "active"
                    );

                });


                option.classList.add(
                    "active"
                );

            }
        );

    });

}


/* =========================================================
   HERO PARALLAX
   ========================================================= */

function initializeHeroParallax() {

    const heroVisual =
        document.querySelector(
            ".hero-visual"
        );


    if (!heroVisual) {

        return;

    }


    /*
     * Disable on touch devices.
     */

    if (
        window.matchMedia(
            "(pointer: coarse)"
        ).matches
    ) {

        return;

    }


    window.addEventListener(
        "mousemove",
        (event) => {

            const x =
                event.clientX /
                window.innerWidth -
                0.5;


            const y =
                event.clientY /
                window.innerHeight -
                0.5;


            heroVisual.style.transform =
                `translate(
                    ${x * 10}px,
                    ${y * 10}px
                )`;

        }
    );


    document.addEventListener(
        "mouseleave",
        () => {

            heroVisual.style.transform =
                "translate(0, 0)";

        }
    );

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function initializeMobileMenu() {

    const menuBtn =
        document.getElementById(
            "menuBtn"
        );


    const nav =
        document.querySelector(
            ".nav-links"
        );


    if (!menuBtn || !nav) {

        return;

    }


    menuBtn.addEventListener(
        "click",
        () => {

            const isOpen =
                nav.classList.toggle(
                    "open"
                );


            menuBtn.setAttribute(
                "aria-expanded",
                isOpen ? "true" : "false"
            );


            menuBtn.setAttribute(
                "aria-label",
                isOpen
                    ? "Close navigation menu"
                    : "Open navigation menu"
            );


            menuBtn.textContent =
                isOpen
                    ? "✕"
                    : "☰";

        }
    );


    const links =
        nav.querySelectorAll("a");


    links.forEach((link) => {

        link.addEventListener(
            "click",
            () => {

                nav.classList.remove(
                    "open"
                );


                menuBtn.setAttribute(
                    "aria-expanded",
                    "false"
                );


                menuBtn.setAttribute(
                    "aria-label",
                    "Open navigation menu"
                );


                menuBtn.textContent =
                    "☰";

            }
        );

    });

}


/* =========================================================
   PRODUCT HOVER EFFECT
   ========================================================= */

function initializeProductHover() {

    const productCards =
        document.querySelectorAll(
            ".product-card"
        );


    /* =====================================================
       FIND LIPSTICK CARD
       ===================================================== */

    const lipstickCard =
        document.querySelector(
            ".lipstick-card"
        );


    /*
     * If lipstick card does not exist,
     * show a useful console warning.
     */

    if (!lipstickCard) {

        console.warn(
            "Glamora AR: .lipstick-card was not found. " +
            "Make sure your lipstick card has class=\"lipstick-card\"."
        );

    }


    /* =====================================================
       LIPSTICK MOUSE ENTER
       ===================================================== */

    if (lipstickCard) {

        lipstickCard.addEventListener(
            "mouseenter",
            () => {

                console.log(
                    "Glamora AR: Lipstick card hovered"
                );


                /*
                 * Change immediately.
                 */

                randomizeLipstick();


                /*
                 * Clear any existing timer.
                 */

                if (lipstickHoverTimer) {

                    clearInterval(
                        lipstickHoverTimer
                    );

                    lipstickHoverTimer = null;

                }


                /*
                 * Change lipstick every second
                 * while mouse remains inside.
                 */

                lipstickHoverTimer =
                    setInterval(() => {

                        randomizeLipstick();

                    }, 1000);

            }
        );


        /* =================================================
           LIPSTICK MOUSE LEAVE
           ================================================= */

        lipstickCard.addEventListener(
            "mouseleave",
            () => {

                console.log(
                    "Glamora AR: Lipstick card mouse left"
                );


                /*
                 * Stop changing lipstick.
                 */

                if (lipstickHoverTimer) {

                    clearInterval(
                        lipstickHoverTimer
                    );

                    lipstickHoverTimer = null;

                }

            }
        );

    }


    /* =====================================================
       NORMAL PRODUCT CARD HOVER
       ===================================================== */

    if (!productCards.length) {

        return;

    }


    /*
     * Disable 3D effect on touch devices.
     */

    if (
        window.matchMedia(
            "(pointer: coarse)"
        ).matches
    ) {

        return;

    }


    productCards.forEach((card) => {

        /*
         * Do not apply the 3D effect
         * to the lipstick card itself.
         */

        if (
            card.classList.contains(
                "lipstick-card"
            )
        ) {

            return;

        }


        card.addEventListener(
            "mousemove",
            (event) => {

                const rect =
                    card.getBoundingClientRect();


                const x =
                    event.clientX -
                    rect.left;


                const y =
                    event.clientY -
                    rect.top;


                const centerX =
                    rect.width / 2;


                const centerY =
                    rect.height / 2;


                const rotateX =
                    (y - centerY) / 35;


                const rotateY =
                    (centerX - x) / 35;


                card.style.transform =
                    `perspective(800px)
                     rotateX(${rotateX}deg)
                     rotateY(${rotateY}deg)
                     translateY(-5px)`;

            }
        );


        card.addEventListener(
            "mouseleave",
            () => {

                card.style.transform =
                    "perspective(800px) " +
                    "rotateX(0deg) " +
                    "rotateY(0deg)";

            }
        );

    });

}


/* =========================================================
   CART DEMO
   ========================================================= */

function initializeCartDemo() {

    let cartCount = 0;


    const cartCounter =
        document.querySelector(
            ".cart-count"
        );


    const quickTryButtons =
        document.querySelectorAll(
            ".quick-try"
        );


    /*
     * Quick Try buttons.
     *
     * Navigation continues normally.
     */

    quickTryButtons.forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                /*
                 * Do not use preventDefault().
                 */

            }
        );

    });


    const cartButton =
        document.querySelector(
            ".cart-btn"
        );


    if (cartButton) {

        cartButton.addEventListener(
            "click",
            () => {

                cartCount++;


                if (cartCounter) {

                    cartCounter.textContent =
                        cartCount;

                }

            }
        );

    }

}


/* =========================================================
   RANDOM LIPSTICK
   ========================================================= */

function randomizeLipstick() {

    const lipstickColors = [

        {
            name: "Ruby Red",
            color: "#c6283d"
        },

        {
            name: "Cherry",
            color: "#a71930"
        },

        {
            name: "Rose Pink",
            color: "#d75d78"
        },

        {
            name: "Coral",
            color: "#ef6f61"
        },

        {
            name: "Berry",
            color: "#8f3155"
        },

        {
            name: "Wine",
            color: "#651d32"
        },

        {
            name: "Nude",
            color: "#b86f68"
        },

        {
            name: "Plum",
            color: "#71364f"
        },

        {
            name: "Mauve",
            color: "#9c536c"
        },

        {
            name: "Dusty Rose",
            color: "#b9687d"
        },

        {
            name: "Hot Pink",
            color: "#d93670"
        },

        {
            name: "Soft Pink",
            color: "#e58aa0"
        },

        {
            name: "Rosewood",
            color: "#914f54"
        },

        {
            name: "Brick Red",
            color: "#9e3f35"
        },

        {
            name: "Deep Berry",
            color: "#72243d"
        },

        {
            name: "Peach",
            color: "#df7f70"
        }

    ];


    /*
     * =====================================================
     * SELECT A DIFFERENT SHADE
     * =====================================================
     */

    let randomIndex;


    do {

        randomIndex =
            Math.floor(
                Math.random() *
                lipstickColors.length
            );

    } while (
        randomIndex === lastLipstickIndex &&
        lipstickColors.length > 1
    );


    lastLipstickIndex =
        randomIndex;


    const selected =
        lipstickColors[randomIndex];


    console.log(
        "Glamora AR lipstick:",
        selected.name,
        selected.color
    );


    /*
     * =====================================================
     * FIND LIPSTICK PRODUCT
     * =====================================================
     */

    const lipstick =
        document.querySelector(
            ".lipstick-product"
        );


    /*
     * =====================================================
     * FIND LIPSTICK TOP
     * =====================================================
     */

    const lipstickTop =
        lipstick
            ? lipstick.querySelector(
                ".lipstick-top"
            )
            : null;


    /*
     * =====================================================
     * FIND LIPSTICK NAME
     * =====================================================
     */

    const lipstickName =
        document.getElementById(
            "lipstickShade"
        );


    /*
     * =====================================================
     * APPLY COLOR ONLY TO LIPSTICK TOP
     * =====================================================
     *
     * IMPORTANT:
     *
     * We intentionally DO NOT set:
     *
     * lipstick.style.background
     *
     * This prevents the entire lipstick product
     * container from becoming the selected color.
     */

    if (lipstick) {

        /*
         * Store the selected shade as a CSS variable.
         *
         * This can still be used by your CSS
         * if needed.
         */

        lipstick.style.setProperty(
            "--lipstick-color",
            selected.color
        );

    }


    /*
     * =====================================================
     * APPLY COLOR TO LIPSTICK TOP
     * =====================================================
     */

    if (lipstickTop) {

        lipstickTop.style.transition =
            "background 0.7s ease, " +
            "box-shadow 0.7s ease";


        /*
         * Only the actual lipstick top
         * receives the random color.
         */

        lipstickTop.style.background =
            selected.color;


        /*
         * Subtle shade glow.
         */

        lipstickTop.style.boxShadow =
            `0 0 15px ${selected.color}66`;


        /*
         * CSS variable for the lipstick top.
         */

        lipstickTop.style.setProperty(
            "--lipstick-color",
            selected.color
        );

    }


    /*
     * =====================================================
     * UPDATE LIPSTICK NAME
     * =====================================================
     */

    if (lipstickName) {

        lipstickName.textContent =
            selected.name;

    }

}


/* =========================================================
   RANDOM EYELINER
   ========================================================= */

function randomizeEyeliner() {

    const eyelinerStyles = [

        {
            name: "Classic",
            className: "style-classic",
            lashClass: "soft",
            color: "#33231f"
        },

        {
            name: "Winged",
            className: "style-winged",
            lashClass: "long",
            color: "#211817"
        },

        {
            name: "Cat Eye",
            className: "style-cat",
            lashClass: "long",
            color: "#171313"
        },

        {
            name: "Double Wing",
            className: "style-double",
            lashClass: "long",
            color: "#241717"
        },

        {
            name: "Soft Line",
            className: "style-soft",
            lashClass: "soft",
            color: "#5a3934"
        },

        {
            name: "Dramatic",
            className: "style-dramatic",
            lashClass: "dramatic",
            color: "#120f0f"
        }

    ];


    /*
     * Select random eyeliner style.
     */

    const randomIndex =
        Math.floor(
            Math.random() *
            eyelinerStyles.length
        );


    const selected =
        eyelinerStyles[randomIndex];


    console.log(
        "Glamora AR eyeliner:",
        selected.name
    );


    /*
     * =====================================================
     * FIND EYE
     * =====================================================
     */

    const eye =
        document.querySelector(
            ".eye"
        );


    /*
     * =====================================================
     * FIND EYELINER NAME
     * =====================================================
     */

    const eyelinerName =
        document.getElementById(
            "eyelinerName"
        );


    /*
     * =====================================================
     * FIND TOP LASHES
     * =====================================================
     */

    const lashesTop =
        document.getElementById(
            "lashesTop"
        );


    /*
     * =====================================================
     * FIND BOTTOM LASHES
     * =====================================================
     */

    const lashesBottom =
        document.getElementById(
            "lashesBottom"
        );


    /*
     * =====================================================
     * EYE / EYELINER
     * =====================================================
     */

    if (eye) {

        eye.classList.remove(
            "style-classic",
            "style-winged",
            "style-cat",
            "style-double",
            "style-soft",
            "style-dramatic"
        );


        /*
         * Apply selected eyeliner style.
         */

        eye.classList.add(
            selected.className
        );


        /*
         * Store eyeliner color.
         */

        eye.style.setProperty(
            "--eyeliner-color",
            selected.color
        );

    }


    /*
     * =====================================================
     * TOP LASHES
     * =====================================================
     */

    if (lashesTop) {

        lashesTop.classList.remove(
            "soft",
            "long",
            "dramatic"
        );


        lashesTop.classList.add(
            selected.lashClass
        );

    }


    /*
     * =====================================================
     * BOTTOM LASHES
     * =====================================================
     */

    if (lashesBottom) {

        lashesBottom.classList.remove(
            "soft",
            "long",
            "dramatic"
        );


        lashesBottom.classList.add(
            selected.lashClass
        );

    }


    /*
     * =====================================================
     * UPDATE EYELINER NAME
     * =====================================================
     */

    if (eyelinerName) {

        eyelinerName.textContent =
            selected.name;

    }

}


/* =========================================================
   DEBUG HELPERS
   ========================================================= */

/*
 * Run these from the browser console if needed:
 *
 * randomizeLipstick()
 * randomizeEyeliner()
 *
 * If randomizeLipstick() works from the console but
 * does not work on hover, check that your HTML contains:
 *
 * class="lipstick-card"
 *
 * and:
 *
 * class="lipstick-product"
 *
 * and:
 *
 * class="lipstick-top"
 */


/* =========================================================
   GLAMORA AR READY
   ========================================================= */

console.log(
    "Glamora AR interactive UI loaded successfully."
);


/* =========================================================
   GLAMORA AR
   INTERACTIVE UI
   ========================================================= */


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
     * Initial random beauty look
     */
    randomizeLipstick();

    randomizeEyeliner();

    /*
     * Change lipstick automatically
     * every 5 seconds.
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

        const linkPath =
            href.split("#")[0];

        if (
            linkPath === currentPath ||
            (
                currentPath === "" &&
                linkPath === "/"
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
                isOpen ? "✕" : "☰";

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


    /*
     * =====================================================
     * LIPSTICK CARD HOVER
     * =====================================================
     */

    const lipstickCard =
        document.querySelector(
            ".lipstick-card"
        );

    let lipstickHoverTimer = null;


    if (lipstickCard) {

        /*
         * Change immediately when
         * pointer enters the lipstick card.
         */

        lipstickCard.addEventListener(
            "mouseenter",
            () => {

                randomizeLipstick();


                /*
                 * Keep changing while the
                 * pointer remains on the card.
                 */

                lipstickHoverTimer =
                    setInterval(() => {

                        randomizeLipstick();

                    }, 1000);

            }
        );


        /*
         * Stop changing when pointer
         * leaves the card.
         */

        lipstickCard.addEventListener(
            "mouseleave",
            () => {

                if (lipstickHoverTimer) {

                    clearInterval(
                        lipstickHoverTimer
                    );

                    lipstickHoverTimer = null;

                }

            }
        );

    }


    /*
     * Existing product hover effect.
     */

    if (!productCards.length) {

        return;

    }


    if (
        window.matchMedia(
            "(pointer: coarse)"
        ).matches
    ) {

        return;

    }


    productCards.forEach((card) => {

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
                    "perspective(800px) rotateX(0deg) rotateY(0deg)";

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

    quickTryButtons.forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                /*
                 * Do not use preventDefault().
                 * Original navigation continues.
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

let lastLipstickIndex = -1;


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
        }

    ];


    /*
     * Always select a different shade.
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


    /*
     * Find lipstick preview.
     */

    const lipstick =
        document.querySelector(
            ".lipstick-product"
        );


    /*
     * Find lipstick name.
     */

    const lipstickName =
        document.getElementById(
            "lipstickShade"
        );


    /*
     * Apply lipstick color.
     */

    if (lipstick) {

        lipstick.style.setProperty(
            "--lipstick-color",
            selected.color
        );


        const lipstickTop =
            lipstick.querySelector(
                ".lipstick-top"
            );


        if (lipstickTop) {

            lipstickTop.style.transition =
                "background 0.7s ease";

            lipstickTop.style.background =
                `linear-gradient(
                    145deg,
                    ${selected.color},
                    ${selected.color}
                )`;

        }

    }


    /*
     * Update lipstick name.
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


    /*
     * Find eye.
     */

    const eye =
        document.querySelector(
            ".eye"
        );


    /*
     * Find eyeliner name.
     */

    const eyelinerName =
        document.getElementById(
            "eyelinerName"
        );


    /*
     * Find lashes.
     */

    const lashesTop =
        document.getElementById(
            "lashesTop"
        );


    const lashesBottom =
        document.getElementById(
            "lashesBottom"
        );


    /*
     * Remove all previous eyeliner styles.
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
         * Apply new style.
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
     * Remove previous lash styles.
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
     * Update eyeliner name.
     */

    if (eyelinerName) {

        eyelinerName.textContent =
            selected.name;

    }

}


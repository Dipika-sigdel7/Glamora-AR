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

    randomizeLipstick();

    randomizeEyeliner();

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

                /*
                 * Your CSS uses:
                 * .loader.hidden
                 *
                 * Therefore we must add "hidden",
                 * not "hide".
                 */

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
   =========================================================
   
   IMPORTANT:
   
   Your navbar uses Flask routes:

       /
       /beauty
       /about
       /contact

   So we should NOT compare links with "#section".

   Instead, detect the current page.
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
     * Normalize trailing slash.
     *
     * Example:
     *
     * /about/
     *
     * becomes:
     *
     * /about
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
         * Ignore links containing anchors
         * such as /beauty#tryon
         */

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


    /*
     * Disable the effect on touch devices.
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


    /*
     * Reset when mouse leaves the window.
     */

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


            /*
             * Change hamburger icon.
             */

            menuBtn.textContent =
                isOpen ? "✕" : "☰";

        }
    );


    /*
     * Close menu when a navigation
     * link is clicked.
     */

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

                menuBtn.textContent = "☰";

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


    if (!productCards.length) {
        return;
    }


    /*
     * Disable 3D hover on touch devices.
     */

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


    if (!quickTryButtons.length) {
        return;
    }


    quickTryButtons.forEach((button) => {

        button.addEventListener(
            "click",
            (event) => {

                /*
                 * The button is actually a
                 * navigation link to AR try-on.
                 *
                 * DO NOT increment cart here.
                 *
                 * Let the user go to:
                 *
                 * /beauty#tryon
                 */

                /*
                 * Keep navigation working.
                 *
                 * Therefore we intentionally
                 * do not use preventDefault().
                 */

            }
        );

    });


    /*
     * Make the cart button work visually.
     */

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
   RANDOM BEAUTY LOOK
   =========================================================
   
   A different lipstick and eyeliner style
   will be selected every time the page loads.
   ========================================================= */


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
        }

    ];


    /*
     * Select random color.
     */

    const randomIndex =
        Math.floor(
            Math.random() *
            lipstickColors.length
        );


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
     * Apply color.
     */

    if (lipstick) {

        lipstick.style.setProperty(
            "--lipstick-color",
            selected.color
        );


        /*
         * Also update the lipstick
         * elements if they exist.
         */

        const lipstickTop =
            lipstick.querySelector(
                ".lipstick-top"
            );


        if (lipstickTop) {

            lipstickTop.style.background =
                `linear-gradient(
                    145deg,
                    ${selected.color},
                    ${selected.color}
                )`;

        }

    }


    /*
     * Update displayed name.
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
     * Select random eyeliner.
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
     * Find name.
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
     * Remove old style classes first.
     *
     * This prevents multiple styles
     * from being applied at once.
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


        eye.classList.add(
            selected.className
        );


        eye.style.setProperty(
            "--eyeliner-color",
            selected.color
        );

    }


    /*
     * Reset lash classes.
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


/* =========================================================
   RANDOMIZE AGAIN WHEN PAGE BECOMES VISIBLE
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            /*
             * Only randomize when returning
             * to the page.
             *
             * This gives the experience
             * a dynamic feeling.
             */

        }

    }
);
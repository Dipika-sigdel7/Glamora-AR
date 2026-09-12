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
     * IMPORTANT
     *
     * This was missing before.
     * It initializes the category card click events.
     */
    initializeBeautyCategoryCards();


    /*
     * Initial random beauty look
     */

    randomizeLipstick();

    randomizeEyeliner();


    /*
     * Change lipstick every 5 seconds.
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


        let normalizedLinkPath =
            linkPath;


        if (
            normalizedLinkPath.length > 1 &&
            normalizedLinkPath.endsWith("/")
        ) {

            normalizedLinkPath =
                normalizedLinkPath.slice(0, -1);

        }


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


    const lipstickCard =
        document.querySelector(
            ".lipstick-card"
        );


    if (!lipstickCard) {

        console.warn(
            "Glamora AR: .lipstick-card was not found."
        );

    }


    if (lipstickCard) {

        lipstickCard.addEventListener(
            "mouseenter",
            () => {

                randomizeLipstick();


                if (lipstickHoverTimer) {

                    clearInterval(
                        lipstickHoverTimer
                    );

                    lipstickHoverTimer = null;

                }


                lipstickHoverTimer =
                    setInterval(() => {

                        randomizeLipstick();

                    }, 1000);

            }
        );


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


    quickTryButtons.forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                /*
                 * Reserved for virtual try-on.
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


    const lipstick =
        document.querySelector(
            ".lipstick-product"
        );


    const lipstickTop =
        lipstick
            ? lipstick.querySelector(
                ".lipstick-top"
            )
            : null;


    const lipstickName =
        document.getElementById(
            "lipstickShade"
        );


    if (lipstick) {

        lipstick.style.setProperty(
            "--lipstick-color",
            selected.color
        );

    }


    if (lipstickTop) {

        lipstickTop.style.transition =
            "background 0.7s ease, " +
            "box-shadow 0.7s ease";


        lipstickTop.style.background =
            selected.color;


        lipstickTop.style.boxShadow =
            `0 0 15px ${selected.color}66`;


        lipstickTop.style.setProperty(
            "--lipstick-color",
            selected.color
        );

    }


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


    const eye =
        document.querySelector(
            ".eye"
        );


    const eyelinerName =
        document.getElementById(
            "eyelinerName"
        );


    const lashesTop =
        document.getElementById(
            "lashesTop"
        );


    const lashesBottom =
        document.getElementById(
            "lashesBottom"
        );


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


    if (eyelinerName) {

        eyelinerName.textContent =
            selected.name;

    }

}


/* =========================================================
   BEAUTY CATEGORY CARDS
   ========================================================= */

function initializeBeautyCategoryCards() {

    const categoryCards =
        document.querySelectorAll(
            ".beauty-category-card"
        );


    const productCards =
        document.querySelectorAll(
            ".product-card"
        );


    const productGrid =
        document.getElementById(
            "productGrid"
        );


    if (!categoryCards.length) {

        console.warn(
            "Glamora AR: Beauty category cards were not found."
        );

        return;

    }


    /*
     * Normalize values such as:
     *
     * lipstick
     * Lipstick
     * lip_stick
     * lip stick
     */

    function normalizeCategory(value) {

        if (!value) {

            return "";

        }


        return String(value)
            .toLowerCase()
            .trim()
            .replace(/[_\s]+/g, "-");

    }


    /*
     * =====================================================
     * CATEGORY NAMES
     * =====================================================
     */

    const categoryNames = {

        all:
            "ALL BEAUTY",

        lipstick:
            "LIPSTICKS",

        eyeshadow:
            "EYESHADOW",

        blush:
            "BLUSH",

        eyeliner:
            "EYELINER",

        mascara:
            "MASCARA",

        foundation:
            "FOUNDATION",

        highlighter:
            "HIGHLIGHTER"

    };


    /*
     * =====================================================
     * CATEGORY DESCRIPTIONS
     * =====================================================
     */

    const categoryDescriptions = {

        all:
            "Explore our complete beauty collection.",

        lipstick:
            "Explore all our lipstick shades and finishes.",

        eyeshadow:
            "Discover eyeshadow palettes for every look.",

        blush:
            "Find beautiful blush shades for a natural flush.",

        eyeliner:
            "Define your eyes with our eyeliner collection.",

        mascara:
            "Discover mascaras designed for beautiful lashes.",

        foundation:
            "Find the perfect foundation for your complexion.",

        highlighter:
            "Add radiant glow with our highlighter collection."

    };


    /*
     * =====================================================
     * CATEGORY CARD CLICK
     * =====================================================
     */

    categoryCards.forEach(function(card) {

        card.addEventListener(
            "click",
            function() {

                /*
                 * IMPORTANT:
                 *
                 * HTML uses:
                 *
                 * data-filter="lipstick"
                 *
                 * Therefore we MUST use
                 * getAttribute("data-filter").
                 */

                const selectedCategory =
                    normalizeCategory(
                        card.getAttribute(
                            "data-filter"
                        )
                    );


                console.log(
                    "Glamora AR category selected:",
                    selectedCategory
                );


                /*
                 * =================================================
                 * REMOVE ACTIVE FROM ALL CATEGORY CARDS
                 * =================================================
                 */

                categoryCards.forEach(
                    function(item) {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                /*
                 * =================================================
                 * ACTIVATE SELECTED CATEGORY
                 * =================================================
                 */

                card.classList.add(
                    "active"
                );


                /*
                 * =================================================
                 * IF THERE ARE NO PRODUCTS
                 * =================================================
                 */

                if (!productCards.length) {

                    console.warn(
                        "Glamora AR: No product cards found."
                    );

                    if (productGrid) {

                        productGrid.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });

                    }

                    return;

                }


                /*
                 * =================================================
                 * ALL BEAUTY
                 * =================================================
                 */

                if (
                    selectedCategory === "all"
                ) {

                    productCards.forEach(
                        function(product) {

                            product.style.display =
                                "";

                            product.classList.add(
                                "category-visible"
                            );

                        }
                    );

                }


                /*
                 * =================================================
                 * SPECIFIC CATEGORY
                 * =================================================
                 */

                else {

                    productCards.forEach(
                        function(product) {

                            const productType =
                                normalizeCategory(
                                    product.getAttribute(
                                        "data-product-type"
                                    )
                                );


                            /*
                             * Product belongs to
                             * selected category.
                             */

                            if (
                                productType ===
                                selectedCategory
                            ) {

                                product.style.display =
                                    "";

                                product.classList.add(
                                    "category-visible"
                                );

                            }


                            /*
                             * Product does not belong
                             * to selected category.
                             */

                            else {

                                product.style.display =
                                    "none";

                                product.classList.remove(
                                    "category-visible"
                                );

                            }

                        }
                    );

                }


                /*
                 * =================================================
                 * UPDATE OPTIONAL CATEGORY HEADING
                 * =================================================
                 */

                const categoryLabel =
                    document.getElementById(
                        "selectedCategoryLabel"
                    );


                const categoryDescription =
                    document.getElementById(
                        "selectedCategoryDescription"
                    );


                if (categoryLabel) {

                    categoryLabel.textContent =
                        categoryNames[
                            selectedCategory
                        ] || "BEAUTY";

                }


                if (categoryDescription) {

                    categoryDescription.textContent =
                        categoryDescriptions[
                            selectedCategory
                        ] ||
                        "Explore our beauty collection.";

                }


                /*
                 * =================================================
                 * SCROLL TO PRODUCTS
                 * =================================================
                 */

                if (productGrid) {

                    setTimeout(
                        function() {

                            productGrid.scrollIntoView({
                                behavior: "smooth",
                                block: "start"
                            });

                        },
                        150
                    );

                }

            }
        );

    });


    /*
     * =====================================================
     * INITIAL STATE
     * =====================================================
     */

    categoryCards.forEach(
        function(card) {

            const filter =
                normalizeCategory(
                    card.getAttribute(
                        "data-filter"
                    )
                );


            if (filter === "all") {

                card.classList.add(
                    "active"
                );

            }

        }
    );


    console.log(
        "Glamora AR: Beauty category cards initialized successfully."
    );

}

/* =========================================================
   BEAUTY CATEGORY FILTER
   ========================================================= */

function initializeBeautyCategoryCards() {

    const categoryCards = document.querySelectorAll(
        ".beauty-category-card"
    );

    const productCards = document.querySelectorAll(
        ".product-card"
    );

    if (!categoryCards.length) {
        return;
    }


    function normalize(value) {

        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[\s_-]+/g, "-");

    }


    function matchesCategory(product, filter) {

        filter = normalize(filter);

        if (filter === "all") {
            return true;
        }


        const category = normalize(
            product.dataset.category
        );


        const productType = normalize(
            product.dataset.productType
        );


        /* -----------------------------------------------
           EXACT DATABASE CATEGORY
           ----------------------------------------------- */

        if (category === filter) {
            return true;
        }


        /* -----------------------------------------------
           PLURAL CATEGORY
           ----------------------------------------------- */

        if (
            category === filter + "s"
            ||
            filter === category + "s"
        ) {

            return true;

        }


        /* -----------------------------------------------
           PRODUCT TYPE FALLBACK
           ----------------------------------------------- */

        if (
            filter === "lipstick"
            &&
            productType.includes("lipstick")
        ) {

            return true;

        }


        if (
            filter === "eyeshadow"
            &&
            productType.includes("eyeshadow")
        ) {

            return true;

        }


        if (
            filter === "blush"
            &&
            productType.includes("blush")
        ) {

            return true;

        }


        if (
            filter === "eyeliner"
            &&
            productType.includes("eyeliner")
        ) {

            return true;

        }


        if (
            filter === "mascara"
            &&
            productType.includes("mascara")
        ) {

            return true;

        }


        if (
            filter === "foundation"
            &&
            productType.includes("foundation")
        ) {

            return true;

        }


        if (
            filter === "highlighter"
            &&
            productType.includes("highlighter")
        ) {

            return true;

        }


        return false;

    }


    categoryCards.forEach(card => {

        card.addEventListener(
            "click",
            function () {

                const filter = normalize(
                    this.dataset.filter
                );


                /* ---------------------------------------
                   ACTIVE CATEGORY
                   --------------------------------------- */

                categoryCards.forEach(
                    categoryCard => {

                        categoryCard.classList.remove(
                            "active"
                        );

                    }
                );


                this.classList.add(
                    "active"
                );


                /* ---------------------------------------
                   FILTER PRODUCTS
                   --------------------------------------- */

                let visibleCount = 0;


                productCards.forEach(product => {

                    const showProduct =
                        matchesCategory(
                            product,
                            filter
                        );


                    if (showProduct) {

                        product.style.display = "";

                        product.classList.remove(
                            "category-hidden"
                        );

                        visibleCount++;

                    } else {

                        product.style.display = "none";

                        product.classList.add(
                            "category-hidden"
                        );

                    }

                });


                console.log(
                    "Glamora AR:",
                    filter,
                    "=>",
                    visibleCount,
                    "products"
                );


                /* ---------------------------------------
                   SCROLL TO PRODUCT SECTION
                   --------------------------------------- */

                if (visibleCount > 0) {

                    const productSection =
                        document.getElementById(
                            "products"
                        );


                    if (productSection) {

                        setTimeout(() => {

                            productSection.scrollIntoView({
                                behavior: "smooth",
                                block: "start"
                            });

                        }, 100);

                    }

                }

            }
        );

    });


    /* -----------------------------------------------
       DEBUG
       ----------------------------------------------- */

    console.log(
        "Glamora AR products loaded:",
        [...productCards].map(product => ({

            id:
                product.dataset.productId,

            category:
                product.dataset.category,

            type:
                product.dataset.productType

        }))
    );

}


/* =========================================================
   DEBUG
   ========================================================= */

console.log(
    "Glamora AR interactive UI loaded successfully."
);
/* =========================================================
   GLAMORA AR
   INTERACTIVE UI
   COMPLETE CORRECTED VERSION
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
     * BEAUTY CATEGORY FILTER
     *
     * This connects:
     *
     * Lipstick card
     * Eyeshadow card
     * Blush card
     * Eyeliner card
     * Mascara card
     * Foundation card
     * Highlighter card
     *
     * with products loaded from the database.
     */
    initializeBeautyCategoryCards();

    /*
     * Product card click -> product details
     */
    initializeProductDetailsLinks();

    /*
     * Initial random beauty look
     */
    randomizeLipstick();

    randomizeEyeliner();

    /*
     * Change lipstick every 5 seconds
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


    /*
     * Older browsers may not support
     * IntersectionObserver.
     */

    if (!("IntersectionObserver" in window)) {

        revealElements.forEach((element) => {

            element.classList.add("visible");

        });

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


    /*
     * Disable parallax on touch devices.
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
                isOpen
                    ? "true"
                    : "false"
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


    /*
     * Lipstick special animation
     */

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

        /*
         * Do not apply the 3D effect
         * to the lipstick demo card.
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


    quickTryButtons.forEach((button) => {

        button.addEventListener(
            "click",
            (event) => {

                /*
                 * Prevent the button from
                 * triggering product-card click.
                 */

                event.stopPropagation();

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
            (event) => {

                event.stopPropagation();

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
   =========================================================
   
   IMPORTANT
   
   This function is intentionally defined
   ONLY ONCE.
   
   It connects database products with
   the category cards.
   
   Product information comes from:
   
   app.py
   
   category_name
   product_type
   
   HTML should expose them as:
   
   data-category
   data-product-type
   
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


    const productSection =
        document.getElementById(
            "products"
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
     * =====================================================
     * NORMALIZE VALUE
     * =====================================================
     *
     * Examples:
     *
     * Lipstick
     * LIPSTICK
     * lip_stick
     * lip stick
     * Lip-Stick
     *
     * all become:
     *
     * lipstick
     *
     * =====================================================
     */

    function normalize(value) {

        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[\s_-]+/g, "");

    }


    /*
     * =====================================================
     * CATEGORY ALIASES
     * =====================================================
     *
     * This makes the system work even if
     * database category names are:
     *
     * Lipstick
     * Lipsticks
     * Lip Stick
     *
     * =====================================================
     */

    const categoryAliases = {

        all: [
            "all",
            "allbeauty",
            "beauty",
            "allproducts"
        ],

        lipstick: [
            "lipstick",
            "lipsticks",
            "lipcolor",
            "lipcolors"
        ],

        eyeshadow: [
            "eyeshadow",
            "eyeshadows",
            "eyeshadowpalette",
            "eyeshadowpalettes"
        ],

        blush: [
            "blush",
            "blushes"
        ],

        eyeliner: [
            "eyeliner",
            "eyeliners"
        ],

        mascara: [
            "mascara",
            "mascaras"
        ],

        foundation: [
            "foundation",
            "foundations"
        ],

        highlighter: [
            "highlighter",
            "highlighters"
        ]

    };


    /*
     * =====================================================
     * FIND CANONICAL CATEGORY
     * =====================================================
     */

    function getCanonicalCategory(value) {

        const normalized =
            normalize(value);


        if (!normalized) {

            return "";

        }


        for (
            const canonical in categoryAliases
        ) {

            if (
                categoryAliases[
                    canonical
                ].includes(normalized)
            ) {

                return canonical;

            }

        }


        return normalized;

    }


    /*
     * =====================================================
     * CATEGORY LABELS
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
     * CHECK IF PRODUCT BELONGS TO CATEGORY
     * =====================================================
     */

    function productMatchesCategory(
        product,
        selectedCategory
    ) {

        /*
         * ALL BEAUTY
         */

        if (
            selectedCategory === "all"
        ) {

            return true;

        }


        /*
         * Read values from HTML.
         *
         * Example:
         *
         * data-category="Lipsticks"
         * data-product-type="lipstick"
         */

        const databaseCategory =
            product.getAttribute(
                "data-category"
            );


        const databaseProductType =
            product.getAttribute(
                "data-product-type"
            );


        /*
         * Convert both into canonical names.
         */

        const categoryName =
            getCanonicalCategory(
                databaseCategory
            );


        const productType =
            getCanonicalCategory(
                databaseProductType
            );


        /*
         * Exact category match.
         */

        if (
            categoryName ===
            selectedCategory
        ) {

            return true;

        }


        /*
         * Product type match.
         *
         * This is important because the
         * admin product form stores
         * product_type separately.
         */

        if (
            productType ===
            selectedCategory
        ) {

            return true;

        }


        /*
         * Fallback for values such as:
         *
         * lipstick-liquid
         * lipstick-matte
         * eyeshadow-palette
         *
         */

        const normalizedType =
            normalize(
                databaseProductType
            );


        const normalizedCategory =
            normalize(
                databaseCategory
            );


        const selectedNormalized =
            normalize(
                selectedCategory
            );


        if (
            normalizedType.includes(
                selectedNormalized
            )
        ) {

            return true;

        }


        if (
            normalizedCategory.includes(
                selectedNormalized
            )
        ) {

            return true;

        }


        return false;

    }


    /*
     * =====================================================
     * SHOW / HIDE PRODUCTS
     * =====================================================
     */

    function filterProducts(
        selectedCategory
    ) {

        let visibleCount = 0;


        productCards.forEach(
            (product) => {

                const showProduct =
                    productMatchesCategory(
                        product,
                        selectedCategory
                    );


                if (showProduct) {

                    product.style.display = "";

                    product.classList.remove(
                        "category-hidden"
                    );

                    product.classList.add(
                        "category-visible"
                    );

                    visibleCount++;

                }

                else {

                    product.style.display =
                        "none";

                    product.classList.remove(
                        "category-visible"
                    );

                    product.classList.add(
                        "category-hidden"
                    );

                }

            }
        );


        console.log(
            "Glamora AR category:",
            selectedCategory,
            "=>",
            visibleCount,
            "products"
        );


        /*
         * If a category has no products,
         * show the product section but
         * do not create fake products.
         */

        if (
            visibleCount === 0 &&
            productGrid
        ) {

            productGrid.classList.add(
                "category-empty"
            );

        }

        else if (productGrid) {

            productGrid.classList.remove(
                "category-empty"
            );

        }


        return visibleCount;

    }


    /*
     * =====================================================
     * UPDATE CATEGORY HEADING
     * =====================================================
     */

    function updateCategoryHeading(
        selectedCategory
    ) {

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
                ] ||
                "BEAUTY";

        }


        if (categoryDescription) {

            categoryDescription.textContent =
                categoryDescriptions[
                    selectedCategory
                ] ||
                "Explore our beauty collection.";

        }

    }


    /*
     * =====================================================
     * CATEGORY CARD CLICK
     * =====================================================
     */

    categoryCards.forEach(
        (card) => {

            card.addEventListener(
                "click",
                function () {

                    const filter =
                        getCanonicalCategory(
                            this.getAttribute(
                                "data-filter"
                            )
                        );


                    console.log(
                        "Glamora AR category card clicked:",
                        filter
                    );


                    /*
                     * Remove active
                     * from every card.
                     */

                    categoryCards.forEach(
                        (categoryCard) => {

                            categoryCard.classList.remove(
                                "active"
                            );

                        }
                    );


                    /*
                     * Activate clicked card.
                     */

                    this.classList.add(
                        "active"
                    );


                    /*
                     * Filter products.
                     */

                    const visibleCount =
                        filterProducts(
                            filter
                        );


                    /*
                     * Update heading.
                     */

                    updateCategoryHeading(
                        filter
                    );


                    /*
                     * Scroll to product section
                     * only if products exist.
                     */

                    if (
                        visibleCount > 0
                    ) {

                        const target =
                            productSection ||
                            productGrid;


                        if (target) {

                            setTimeout(
                                () => {

                                    target.scrollIntoView({
                                        behavior:
                                            "smooth",

                                        block:
                                            "start"
                                    });

                                },
                                100
                            );

                        }

                    }

                    else {

                        console.log(
                            "Glamora AR: No products found for category:",
                            filter
                        );

                    }

                }
            );

        }
    );


    /*
     * =====================================================
     * INITIAL STATE
     * =====================================================
     *
     * Show all products when Beauty page
     * first loads.
     */

    let allCard = null;


    categoryCards.forEach(
        (card) => {

            const filter =
                getCanonicalCategory(
                    card.getAttribute(
                        "data-filter"
                    )
                );


            if (
                filter === "all"
            ) {

                allCard = card;

            }

        }
    );


    if (allCard) {

        allCard.classList.add(
            "active"
        );

    }


    /*
     * Show every product initially.
     */

    productCards.forEach(
        (product) => {

            product.style.display = "";

            product.classList.remove(
                "category-hidden"
            );

            product.classList.add(
                "category-visible"
            );

        }
    );


    /*
     * =====================================================
     * DEBUG DATABASE PRODUCTS
     * =====================================================
     */

    console.log(
        "========================================"
    );

    console.log(
        "GLAMORA AR - PRODUCTS LOADED"
    );

    console.log(
        "========================================"
    );


    productCards.forEach(
        (product) => {

            console.log(
                "PRODUCT:",
                {
                    id:
                        product.getAttribute(
                            "data-product-id"
                        ),

                    name:
                        product.getAttribute(
                            "data-product-name"
                        ),

                    category:
                        product.getAttribute(
                            "data-category"
                        ),

                    productType:
                        product.getAttribute(
                            "data-product-type"
                        )
                }
            );

        }
    );


    console.log(
        "========================================"
    );

    console.log(
        "Glamora AR: Beauty category cards initialized successfully."
    );

}


/* =========================================================
   PRODUCT DETAILS LINKS
   =========================================================
   
   When an admin-added product is clicked,
   the user should be taken to:
   
   /product/<product_id>
   
   The product ID comes from:
   
   data-product-id
   
   ========================================================= */

function initializeProductDetailsLinks() {

    const productCards =
        document.querySelectorAll(
            ".product-card[data-product-id]"
        );


    if (!productCards.length) {

        return;

    }


    productCards.forEach(
        (card) => {

            /*
             * If the card already contains
             * a link to the product details,
             * do not add another click handler.
             */

            const existingLink =
                card.querySelector(
                    'a[href*="/product/"]'
                );


            if (existingLink) {

                return;

            }


            const productId =
                card.getAttribute(
                    "data-product-id"
                );


            if (!productId) {

                return;

            }


            /*
             * Do not redirect when the user
             * clicks interactive buttons.
             */

            card.addEventListener(
                "click",
                (event) => {

                    const clickedElement =
                        event.target.closest(
                            "button, a, input, select, textarea"
                        );


                    if (clickedElement) {

                        return;

                    }


                    window.location.href =
                        `/product/${productId}`;

                }
            );


            /*
             * Make the card keyboard accessible.
             */

            card.setAttribute(
                "role",
                "link"
            );


            card.setAttribute(
                "tabindex",
                "0"
            );


            card.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        window.location.href =
                            `/product/${productId}`;

                    }

                }
            );

        }
    );


    console.log(
        "Glamora AR: Product detail links initialized."
    );

}


/* =========================================================
   DEBUG
   ========================================================= */

console.log(
    "Glamora AR interactive UI loaded successfully."
);
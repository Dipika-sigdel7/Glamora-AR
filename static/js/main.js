/* =========================================================
   GLAMORA AR
   MAIN JAVASCRIPT
   COMPLETE CORRECTED VERSION
   ========================================================= */


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let lastLipstickIndex = -1;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeLoader();

    initializeRevealAnimations();

    initializeActiveNavigation();

    initializeMakeupOptions();

    initializeHeroParallax();

    initializeMobileMenu();

    initializeProductHover();

    initializeBeautyCategoryCards();

    initializeLoginPopup();

    initializeAddToBag();

    randomizeLipstick();

    randomizeEyeliner();


    /*
     * Rotate lipstick appearance every 5 seconds.
     */
    setInterval(() => {

        randomizeLipstick();

    }, 5000);

});


/* =========================================================
   LOADER
   ========================================================= */

function initializeLoader() {

    const loader =
        document.getElementById("loader");

    if (!loader) {
        return;
    }

    setTimeout(() => {

        loader.classList.add("hidden");

        setTimeout(() => {

            loader.style.display = "none";

        }, 500);

    }, 1700);
}


/* =========================================================
   REVEAL ANIMATIONS
   ========================================================= */

function initializeRevealAnimations() {

    const revealElements =
        document.querySelectorAll(".reveal");

    if (!revealElements.length) {
        return;
    }


    /*
     * Browser does not support IntersectionObserver.
     * Show everything normally.
     */
    if (!("IntersectionObserver" in window)) {

        revealElements.forEach(element => {

            element.classList.add("visible");

        });

        return;
    }


    const observer =
        new IntersectionObserver(
            (entries, observerInstance) => {

                entries.forEach(entry => {

                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add(
                        "visible"
                    );

                    observerInstance.unobserve(
                        entry.target
                    );

                });

            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -40px 0px"
            }
        );


    revealElements.forEach(element => {

        observer.observe(element);

    });
}


/* =========================================================
   ACTIVE NAVIGATION
   ========================================================= */

function initializeActiveNavigation() {

    const currentPath =
        window.location.pathname.replace(
            /\/+$/,
            ""
        ) || "/";


    const navLinks =
        document.querySelectorAll(
            ".nav-links a"
        );


    navLinks.forEach(link => {

        const href =
            link.getAttribute("href");

        if (!href || href.startsWith("#")) {
            return;
        }


        let linkPath = "";


        try {

            linkPath =
                new URL(
                    href,
                    window.location.origin
                ).pathname.replace(
                    /\/+$/,
                    ""
                ) || "/";

        } catch (error) {

            return;

        }


        if (linkPath === currentPath) {

            link.classList.add("active");

        } else {

            link.classList.remove("active");

        }

    });
}


/* =========================================================
   MAKEUP OPTIONS
   ========================================================= */

function initializeMakeupOptions() {

    const makeupOptions =
        document.querySelectorAll(
            ".makeup-option, .makeup-card"
        );

    if (!makeupOptions.length) {
        return;
    }


    makeupOptions.forEach(option => {

        option.addEventListener(
            "click",
            () => {

                makeupOptions.forEach(item => {

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
            ".beauty-hero-visual, .hero-visual"
        );

    if (!heroVisual) {
        return;
    }


    /*
     * Disable parallax on smaller screens.
     */
    if (window.innerWidth <= 768) {
        return;
    }


    let ticking = false;


    function updateHeroParallax() {

        const scrollY =
            window.scrollY;


        const movement =
            Math.min(
                scrollY * 0.08,
                35
            );


        /*
         * Only move the hero visual.
         *
         * Product cards are NOT affected.
         */
        heroVisual.style.transform =
            `translate3d(0, ${movement}px, 0)`;


        ticking = false;
    }


    window.addEventListener(
        "scroll",
        () => {

            if (!ticking) {

                window.requestAnimationFrame(
                    updateHeroParallax
                );

                ticking = true;

            }

        },
        {
            passive: true
        }
    );
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function initializeMobileMenu() {

    const menuButton =
        document.getElementById(
            "menuBtn"
        );


    const navLinks =
        document.querySelector(
            ".nav-links"
        );


    if (!menuButton || !navLinks) {
        return;
    }


    menuButton.setAttribute(
        "aria-expanded",
        "false"
    );


    menuButton.addEventListener(
        "click",
        () => {

            navLinks.classList.toggle(
                "open"
            );

            menuButton.classList.toggle(
                "active"
            );


            const isOpen =
                navLinks.classList.contains(
                    "open"
                );


            menuButton.setAttribute(
                "aria-expanded",
                isOpen
                    ? "true"
                    : "false"
            );

        }
    );


    /*
     * Close mobile menu after
     * selecting a navigation link.
     */
    navLinks.querySelectorAll("a").forEach(
        link => {

            link.addEventListener(
                "click",
                () => {

                    navLinks.classList.remove(
                        "open"
                    );

                    menuButton.classList.remove(
                        "active"
                    );

                    menuButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }
            );

        }
    );
}


/* =========================================================
   PRODUCT HOVER
   ========================================================= */

function initializeProductHover() {

    const productCards =
        document.querySelectorAll(
            ".beauty-product-card, .product-card"
        );


    if (!productCards.length) {
        return;
    }


    productCards.forEach(card => {

        card.addEventListener(
            "mouseenter",
            () => {

                card.classList.add(
                    "hovered"
                );

            }
        );


        card.addEventListener(
            "mouseleave",
            () => {

                card.classList.remove(
                    "hovered"
                );

            }
        );

    });
}


/* =========================================================
   ADD TO BAG
   ========================================================= */

function initializeAddToBag() {

    const addToBagForms =
        document.querySelectorAll(
            ".add-to-cart-form"
        );


    if (!addToBagForms.length) {
        return;
    }


    addToBagForms.forEach(form => {

        form.addEventListener(
            "submit",
            event => {

                const button =
                    form.querySelector(
                        ".add-to-cart-btn"
                    );


                if (!button) {
                    return;
                }


                /*
                 * Prevent multiple clicks while
                 * Flask is processing the request.
                 *
                 * IMPORTANT:
                 * We do NOT call preventDefault().
                 *
                 * The form must be submitted normally
                 * to Flask.
                 */
                if (
                    button.dataset.submitting === "true"
                ) {

                    event.preventDefault();

                    return;

                }


                button.dataset.submitting =
                    "true";


                button.disabled = true;


                button.classList.add(
                    "adding"
                );


                const text =
                    button.querySelector(
                        ".add-to-bag-text"
                    );


                if (text) {

                    text.textContent =
                        "Adding...";

                } else {

                    /*
                     * Fallback for existing HTML
                     * where the text is inside
                     * the last span.
                     */
                    const spans =
                        button.querySelectorAll(
                            "span"
                        );


                    if (spans.length) {

                        spans[
                            spans.length - 1
                        ].textContent =
                            "Adding...";

                    }

                }

            }
        );

    });
}


/* =========================================================
   CATEGORY NORMALIZATION
   ========================================================= */

function normalizeBeautyCategory(value) {

    if (!value) {
        return "";
    }


    let category =
        String(value)
            .toLowerCase()
            .trim()
            .replace(
                /[\s_]+/g,
                "-"
            );


    const aliases = {

        "all": "all",
        "all-beauty": "all",

        "lipstick": "lipstick",
        "lipsticks": "lipstick",

        "eyeshadow": "eyeshadow",
        "eyeshadows": "eyeshadow",
        "eye-shadow": "eyeshadow",
        "eye-shadows": "eyeshadow",

        "blush": "blush",
        "blushes": "blush",

        "eyeliner": "eyeliner",
        "eyeliners": "eyeliner",
        "eye-liner": "eyeliner",
        "eye-liners": "eyeliner",

        "mascara": "mascara",
        "mascaras": "mascara",

        "foundation": "foundation",
        "foundations": "foundation",

        "highlighter": "highlighter",
        "highlighters": "highlighter",
        "highlight": "highlighter"

    };


    if (aliases[category]) {

        return aliases[category];

    }


    /*
     * Try singular form.
     */
    if (category.endsWith("s")) {

        const singular =
            category.slice(
                0,
                -1
            );


        if (aliases[singular]) {

            return aliases[singular];

        }

    }


    return category;
}


/* =========================================================
   BEAUTY CATEGORY FILTER
   ========================================================= */

function initializeBeautyCategoryCards() {

    const categoryCards =
        document.querySelectorAll(
            ".beauty-category-card"
        );


    const productGrid =
        document.getElementById(
            "productGrid"
        );


    if (
        !categoryCards.length ||
        !productGrid
    ) {

        return;

    }


    const productCards =
        Array.from(
            productGrid.querySelectorAll(
                ".beauty-product-card"
            )
        );


    /*
     * Create empty category message
     * if it does not already exist.
     */
    let emptyMessage =
        productGrid.querySelector(
            ".category-empty-state"
        );


    if (!emptyMessage) {

        emptyMessage =
            document.createElement(
                "div"
            );


        emptyMessage.className =
            "category-empty-state";


        emptyMessage.innerHTML = `
            <div class="category-empty-icon">
                ♡
            </div>

            <h3>
                No products in this category yet
            </h3>

            <p>
                Products added by the admin
                will appear here automatically.
            </p>
        `;


        emptyMessage.style.display =
            "none";


        productGrid.appendChild(
            emptyMessage
        );

    }


    /* =====================================================
       CHECK PRODUCT CATEGORY
       ===================================================== */

    function productMatchesCategory(
        product,
        selectedCategory
    ) {

        const selected =
            normalizeBeautyCategory(
                selectedCategory
            );


        /*
         * "All" shows every product.
         */
        if (selected === "all") {

            return true;

        }


        const productType =
            normalizeBeautyCategory(
                product.dataset.productType
            );


        const productCategory =
            normalizeBeautyCategory(
                product.dataset.category
            );


        /*
         * A product can match either:
         *
         * product type
         * OR
         * database category.
         */
        return (
            productType === selected ||
            productCategory === selected
        );
    }


    /* =====================================================
       SHOW SELECTED CATEGORY
       ===================================================== */

    function showBeautyCategory(
        selectedCategory,
        shouldScroll = true
    ) {

        const selected =
            normalizeBeautyCategory(
                selectedCategory
            );


        let visibleProducts = 0;


        productCards.forEach(product => {

            const matches =
                productMatchesCategory(
                    product,
                    selected
                );


            if (matches) {

                product.style.display =
                    "";

                visibleProducts++;

                product.classList.add(
                    "visible"
                );

            } else {

                product.style.display =
                    "none";

                product.classList.remove(
                    "visible"
                );

            }

        });


        /*
         * Show empty state if no products
         * match selected category.
         */
        if (visibleProducts === 0) {

            emptyMessage.style.display =
                "block";

        } else {

            emptyMessage.style.display =
                "none";

        }


        /*
         * Update active category card.
         */
        categoryCards.forEach(card => {

            const cardCategory =
                normalizeBeautyCategory(
                    card.dataset.filter
                );


            card.classList.toggle(
                "active",
                cardCategory === selected
            );

        });


        /*
         * Scroll to products section.
         */
        if (shouldScroll) {

            const productsSection =
                document.getElementById(
                    "products"
                );


            if (productsSection) {

                setTimeout(() => {

                    productsSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }, 100);

            }

        }

    }


    /* =====================================================
       CATEGORY CLICK
       ===================================================== */

    categoryCards.forEach(card => {

        card.setAttribute(
            "role",
            "button"
        );


        card.setAttribute(
            "tabindex",
            "0"
        );


        card.addEventListener(
            "click",
            event => {

                event.preventDefault();


                const selectedCategory =
                    card.dataset.filter;


                if (!selectedCategory) {
                    return;
                }


                showBeautyCategory(
                    selectedCategory,
                    true
                );

            }
        );


        /*
         * Keyboard accessibility.
         */
        card.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Enter" &&
                    event.key !== " "
                ) {

                    return;

                }


                event.preventDefault();

                card.click();

            }
        );

    });


    /*
     * Show all products initially.
     */
    showBeautyCategory(
        "all",
        false
    );
}


/* =========================================================
   RANDOM LIPSTICK
   ========================================================= */

function randomizeLipstick() {

    const lipstickVisuals =
        document.querySelectorAll(
            ".lipstick-visual, .lipstick-card"
        );


    if (!lipstickVisuals.length) {
        return;
    }


    let newIndex =
        Math.floor(
            Math.random() *
            lipstickVisuals.length
        );


    /*
     * Avoid showing the same lipstick twice
     * in a row when there are multiple options.
     */
    if (
        lipstickVisuals.length > 1 &&
        newIndex === lastLipstickIndex
    ) {

        newIndex =
            (newIndex + 1) %
            lipstickVisuals.length;

    }


    lastLipstickIndex =
        newIndex;


    lipstickVisuals.forEach(
        (visual, index) => {

            visual.classList.toggle(
                "active",
                index === newIndex
            );

        }
    );
}


/* =========================================================
   RANDOM EYELINER
   ========================================================= */

function randomizeEyeliner() {

    const eyelinerVisuals =
        document.querySelectorAll(
            ".eyeliner-visual, .eyeliner-card"
        );


    if (!eyelinerVisuals.length) {
        return;
    }


    const randomIndex =
        Math.floor(
            Math.random() *
            eyelinerVisuals.length
        );


    eyelinerVisuals.forEach(
        (visual, index) => {

            visual.classList.toggle(
                "active",
                index === randomIndex
            );

        }
    );
}


/* =========================================================
   LOGIN POPUP
   ========================================================= */

function initializeLoginPopup() {

    const popup =
        document.getElementById(
            "loginPopup"
        );


    if (!popup) {
        return;
    }


    /*
     * Make sure the popup starts hidden.
     */
    if (
        !popup.hasAttribute("hidden") &&
        !popup.classList.contains("show")
    ) {

        popup.hidden = true;

    }


    /*
     * Clicking the dark background
     * closes the popup.
     */
    popup.addEventListener(
        "click",
        event => {

            if (
                event.target === popup
            ) {

                closeLoginPopup();

            }

        }
    );


    /*
     * ESC closes popup.
     */
    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                !popup.hidden
            ) {

                closeLoginPopup();

            }

        }
    );

}


/* =========================================================
   SHOW LOGIN POPUP
   ========================================================= */

function showLoginPopup() {

    const popup =
        document.getElementById(
            "loginPopup"
        );


    if (!popup) {
        return;
    }


    popup.hidden = false;


    document.body.classList.add(
        "login-popup-open"
    );


    document.body.style.overflow =
        "hidden";


    /*
     * Focus OK button for accessibility.
     */
    const okButton =
        popup.querySelector(
            ".login-popup-ok"
        );


    if (okButton) {

        setTimeout(() => {

            okButton.focus();

        }, 50);

    }

}


/* =========================================================
   CLOSE LOGIN POPUP
   ========================================================= */

function closeLoginPopup() {

    const popup =
        document.getElementById(
            "loginPopup"
        );


    if (!popup) {
        return;
    }


    popup.hidden = true;


    document.body.classList.remove(
        "login-popup-open"
    );


    document.body.style.overflow =
        "";

}


/* =========================================================
   GO TO LOGIN
   ========================================================= */

function goToLogin() {

    window.location.href =
        "/login";

}


/* =========================================================
   GLOBAL BEAUTY PRODUCT FILTER
   ========================================================= */

window.filterBeautyProducts =
    function(category) {

        const categoryCards =
            document.querySelectorAll(
                ".beauty-category-card"
            );


        if (!categoryCards.length) {
            return;
        }


        const selected =
            normalizeBeautyCategory(
                category
            );


        categoryCards.forEach(card => {

            const cardCategory =
                normalizeBeautyCategory(
                    card.dataset.filter
                );


            if (
                cardCategory === selected
            ) {

                card.click();

            }

        });

    };
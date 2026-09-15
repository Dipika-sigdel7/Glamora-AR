/* =========================================================
   GLAMORA AR
   MAIN JAVASCRIPT
   COMPLETE CORRECTED VERSION
   ========================================================= */


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let lastLipstickIndex = -1;
let lipstickHoverTimer = null;


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

    initializeCartDemo();

    initializeBeautyCategoryCards();

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

    const loader = document.getElementById("loader");

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
     * Fallback for browsers where IntersectionObserver
     * is not available.
     */
    if (!("IntersectionObserver" in window)) {

        revealElements.forEach(element => {
            element.classList.add("visible");
        });

        return;
    }


    const observer = new IntersectionObserver(
        (entries, observerInstance) => {

            entries.forEach(entry => {

                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add("visible");

                observerInstance.unobserve(entry.target);

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
        window.location.pathname.replace(/\/+$/, "") || "/";

    const navLinks =
        document.querySelectorAll(".nav-links a");

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
                ).pathname.replace(/\/+$/, "") || "/";

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

        option.addEventListener("click", () => {

            makeupOptions.forEach(item => {

                item.classList.remove("active");

            });

            option.classList.add("active");

        });

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
     * Disable effect on smaller screens.
     */
    if (window.innerWidth <= 768) {
        return;
    }

    let ticking = false;


    function updateHeroParallax() {

        const scrollY = window.scrollY;

        /*
         * Keep the movement subtle.
         */
        const movement =
            Math.min(scrollY * 0.08, 35);

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
        document.getElementById("menuBtn");

    const navLinks =
        document.querySelector(".nav-links");

    if (!menuButton || !navLinks) {
        return;
    }


    menuButton.addEventListener("click", () => {

        navLinks.classList.toggle("open");

        menuButton.classList.toggle("active");

        const isOpen =
            navLinks.classList.contains("open");

        menuButton.setAttribute(
            "aria-expanded",
            isOpen ? "true" : "false"
        );

    });


    /*
     * Close mobile menu after clicking a link.
     */
    navLinks.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("open");

            menuButton.classList.remove("active");

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

        });

    });
}


/* =========================================================
   PRODUCT HOVER
   ========================================================= */

function initializeProductHover() {

    /*
     * IMPORTANT:
     * Beauty page uses .beauty-product-card.
     */
    const productCards =
        document.querySelectorAll(
            ".beauty-product-card, .product-card"
        );

    if (!productCards.length) {
        return;
    }


    productCards.forEach(card => {

        card.addEventListener("mouseenter", () => {

            card.classList.add("hovered");

        });


        card.addEventListener("mouseleave", () => {

            card.classList.remove("hovered");

        });

    });
}


/* =========================================================
   CART DEMO
   ========================================================= */

function initializeCartDemo() {

    const cartButtons =
        document.querySelectorAll(
            ".cart-btn"
        );

    const quickTryButtons =
        document.querySelectorAll(
            ".quick-try, .quick-try-btn"
        );

    const cartCount =
        document.querySelector(
            "#cart-count, .cart-count"
        );

    let count = 0;


    /*
     * Cart button itself.
     */
    cartButtons.forEach(button => {

        button.addEventListener("click", event => {

            /*
             * If the cart button is a link,
             * allow the browser to follow it.
             */
            if (
                button.tagName.toLowerCase() === "a" &&
                button.getAttribute("href") &&
                button.getAttribute("href") !== "#"
            ) {
                return;
            }

            event.preventDefault();

            count++;

            updateCartCount();

        });

    });


    /*
     * Quick try buttons.
     */
    quickTryButtons.forEach(button => {

        button.addEventListener("click", event => {

            event.preventDefault();

            event.stopPropagation();

            /*
             * Find the product card.
             */
            const productCard =
                button.closest(
                    ".beauty-product-card, .product-card"
                );

            if (productCard) {

                productCard.classList.add(
                    "quick-try-active"
                );

                setTimeout(() => {

                    productCard.classList.remove(
                        "quick-try-active"
                    );

                }, 900);

            }

        });

    });


    function updateCartCount() {

        if (!cartCount) {
            return;
        }

        cartCount.textContent = count;

        cartCount.classList.add("cart-bump");

        setTimeout(() => {

            cartCount.classList.remove("cart-bump");

        }, 300);
    }
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
            .replace(/[\s_]+/g, "-");


    const aliases = {

        "all": "all",
        "all-beauty": "all",

        "lipstick": "lipstick",
        "lipsticks": "lipstick",

        "eyeshadow": "eyeshadow",
        "eyeshadows": "eyeshadow",

        "blush": "blush",
        "blushes": "blush",

        "eyeliner": "eyeliner",
        "eyeliners": "eyeliner",

        "mascara": "mascara",
        "mascaras": "mascara",

        "foundation": "foundation",
        "foundations": "foundation",

        "highlighter": "highlighter",
        "highlighters": "highlighter"

    };


    if (aliases[category]) {

        return aliases[category];

    }


    /*
     * Safe fallback for simple plural values.
     */
    if (category.endsWith("s")) {

        const singular =
            category.slice(0, -1);

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


    /*
     * If we are not on the Beauty page,
     * simply stop here.
     */
    if (!categoryCards.length || !productGrid) {

        return;

    }


    /*
     * IMPORTANT:
     *
     * The Beauty page uses:
     *
     * .beauty-product-card
     *
     * NOT just .product-card.
     */
    const productCards =
        Array.from(
            productGrid.querySelectorAll(
                ".beauty-product-card"
            )
        );


    /* =====================================================
       EMPTY CATEGORY MESSAGE
       ===================================================== */

    let emptyMessage =
        productGrid.querySelector(
            ".category-empty-state"
        );


    if (!emptyMessage) {

        emptyMessage =
            document.createElement("div");

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
                Products added by the admin will appear here
                automatically.
            </p>
        `;

        emptyMessage.style.display =
            "none";

        productGrid.appendChild(
            emptyMessage
        );
    }


    /* =====================================================
       PRODUCT CATEGORY MATCHING
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
         * All Beauty shows everything.
         */
        if (selected === "all") {

            return true;

        }


        /*
         * Product type is the PRIMARY category.
         *
         * Example:
         *
         * data-product-type="lipstick"
         */
        const productType =
            normalizeBeautyCategory(
                product.dataset.productType
            );


        /*
         * Category name is a FALLBACK.
         *
         * Example:
         *
         * data-category="lipsticks"
         */
        const productCategory =
            normalizeBeautyCategory(
                product.dataset.category
            );


        return (
            productType === selected ||
            productCategory === selected
        );
    }


    /* =====================================================
       SHOW CATEGORY
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


        /*
         * Filter products.
         */
        productCards.forEach(product => {

            const matches =
                productMatchesCategory(
                    product,
                    selected
                );


            if (matches) {

                product.style.display = "";

                visibleProducts++;


                /*
                 * Make sure filtered products
                 * are visible after filtering.
                 */
                product.classList.add(
                    "visible"
                );

            } else {

                product.style.display =
                    "none";

            }

        });


        /* =================================================
           EMPTY STATE
           ================================================= */

        if (visibleProducts === 0) {

            emptyMessage.style.display =
                "block";

        } else {

            emptyMessage.style.display =
                "none";

        }


        /* =================================================
           ACTIVE CATEGORY
           ================================================= */

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
         * Debug information.
         * Helpful if another category problem occurs.
         */
        console.log(
            "Beauty category:",
            selected
        );

        console.log(
            "Visible products:",
            visibleProducts
        );


        /* =================================================
           SCROLL TO PRODUCT SECTION
           ================================================= */

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
       CATEGORY CARD CLICK
       ===================================================== */

    categoryCards.forEach(card => {

        /*
         * Make keyboard interaction accessible.
         */
        card.setAttribute(
            "role",
            "button"
        );


        card.addEventListener(
            "click",
            event => {

                event.preventDefault();


                const selectedCategory =
                    card.dataset.filter;


                if (!selectedCategory) {

                    console.warn(
                        "Category card has no data-filter:",
                        card
                    );

                    return;
                }


                showBeautyCategory(
                    selectedCategory,
                    true
                );

            }
        );

    });


    /* =====================================================
       INITIAL STATE
       ===================================================== */

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


    /*
     * Avoid selecting the same lipstick twice.
     */
    let newIndex =
        Math.floor(
            Math.random() *
            lipstickVisuals.length
        );


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
   RANDOM EYELINER / LASHES
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


            if (cardCategory === selected) {

                card.click();

            }

        });

    };
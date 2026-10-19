
/* =========================================================
   GLAMORA AR
   MAIN JAVASCRIPT
   CORRECTED VERSION
   Supports Beauty and Favorites pages
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
    initializeFavorites();

    randomizeLipstick();
    randomizeEyeliner();

    if (document.querySelector(
        ".lipstick-visual, .lipstick-card"
    )) {
        setInterval(randomizeLipstick, 5000);
    }
});


/* =========================================================
   LOADER
   ========================================================= */

function initializeLoader() {
    const loader = document.getElementById("loader");

    if (!loader) return;

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
    const elements = document.querySelectorAll(".reveal");

    if (!elements.length) return;

    if (!("IntersectionObserver" in window)) {
        elements.forEach(element => {
            element.classList.add("visible");
        });
        return;
    }

    const observer = new IntersectionObserver(
        (entries, observerInstance) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add("visible");
                observerInstance.unobserve(entry.target);
            });
        },
        {
            threshold: 0.12,
            rootMargin: "0px 0px -40px 0px"
        }
    );

    elements.forEach(element => observer.observe(element));
}


/* =========================================================
   ACTIVE NAVIGATION
   ========================================================= */

function initializeActiveNavigation() {
    const currentPath =
        window.location.pathname.replace(/\/+$/, "") || "/";

    document.querySelectorAll(".nav-links a").forEach(link => {
        const href = link.getAttribute("href");

        if (!href || href.startsWith("#")) return;

        try {
            const linkPath = new URL(
                href,
                window.location.origin
            ).pathname.replace(/\/+$/, "") || "/";

            if (linkPath === currentPath) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        } catch (error) {
            console.warn("Unable to check navigation link:", error);
        }
    });
}


/* =========================================================
   MAKEUP OPTIONS
   ========================================================= */

function initializeMakeupOptions() {
    const options = document.querySelectorAll(
        ".makeup-option, .makeup-card"
    );

    options.forEach(option => {
        option.addEventListener("click", () => {
            options.forEach(item => {
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
    const heroVisual = document.querySelector(
        ".beauty-hero-visual, .hero-visual"
    );

    if (!heroVisual || window.innerWidth <= 768) return;

    let ticking = false;

    function updateParallax() {
        heroVisual.style.transform =
            `translate3d(0, ${Math.min(window.scrollY * 0.08, 35)}px, 0)`;

        ticking = false;
    }

    window.addEventListener("scroll", () => {
        if (ticking) return;

        window.requestAnimationFrame(updateParallax);
        ticking = true;
    }, { passive: true });
}


/* =========================================================
   MOBILE NAVIGATION
   Supports:
   1. Beauty page: .nav-links.open
   2. Favorites page: .mobile-menu.open
   ========================================================= */

function initializeMobileMenu() {
    const menuButton = document.getElementById("menuBtn");

    if (!menuButton || menuButton.dataset.menuInitialized === "true") {
        return;
    }

    const navLinks = document.querySelector(".nav-links");
    const mobileMenu = document.getElementById("mobileMenu");

    // Prefer the dedicated mobile menu when the page has one.
    const menuPanel = mobileMenu || navLinks;

    if (!menuPanel) return;

    menuButton.dataset.menuInitialized = "true";

    function isMenuOpen() {
        return menuPanel.classList.contains("open");
    }

    function closeMenu() {
        menuPanel.classList.remove("open");
        menuButton.classList.remove("active");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute(
            "aria-label",
            "Open navigation menu"
        );

        menuButton.textContent = "☰";
    }

    function toggleMenu() {
        const shouldOpen = !isMenuOpen();

        menuPanel.classList.toggle("open", shouldOpen);
        menuButton.classList.toggle("active", shouldOpen);
        menuButton.setAttribute(
            "aria-expanded",
            String(shouldOpen)
        );
        menuButton.setAttribute(
            "aria-label",
            shouldOpen
                ? "Close navigation menu"
                : "Open navigation menu"
        );

        menuButton.textContent = shouldOpen ? "✕" : "☰";
    }

    menuButton.setAttribute("aria-expanded", "false");

    menuButton.addEventListener("click", event => {
        event.preventDefault();
        toggleMenu();
    });

    menuPanel.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", event => {
        if (
            isMenuOpen() &&
            !menuPanel.contains(event.target) &&
            !menuButton.contains(event.target)
        ) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && isMenuOpen()) {
            closeMenu();
            menuButton.focus();
        }
    });

    // Keep the menu closed if the viewport changes to desktop.
    window.addEventListener("resize", () => {
        if (window.innerWidth > 750) {
            closeMenu();
        }
    });
}


/* =========================================================
   PRODUCT HOVER
   ========================================================= */

function initializeProductHover() {
    const cards = document.querySelectorAll(
        ".beauty-product-card, .product-card"
    );

    cards.forEach(card => {
        card.addEventListener("mouseenter", () => {
            card.classList.add("hovered");
        });

        card.addEventListener("mouseleave", () => {
            card.classList.remove("hovered");
        });
    });
}



/* =========================================================
   ADD TO BAG
   AJAX submission — stays on the current page
   Updates button text and navbar bag count
   ========================================================= */

function initializeAddToBag() {
    document.querySelectorAll(".add-to-cart-form").forEach(form => {

        // Prevent duplicate event listeners.
        if (form.dataset.cartInitialized === "true") return;

        form.dataset.cartInitialized = "true";

        form.addEventListener("submit", async function (event) {

            // Stop normal form submission and page navigation.
            event.preventDefault();

            const button = form.querySelector(".add-to-cart-btn");
            const text = button?.querySelector(".add-to-bag-text");

            if (!button || button.disabled) return;

            if (form.dataset.submitting === "true") return;

            // Save the original button label.
            if (!button.dataset.originalText) {
                button.dataset.originalText = text
                    ? text.textContent.trim()
                    : button.textContent.trim();
            }

            const originalText = button.dataset.originalText;

            // Show loading state.
            form.dataset.submitting = "true";
            button.disabled = true;
            button.classList.add("adding");

            if (text) {
                text.textContent = "Adding...";
            }

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    credentials: "same-origin",
                    headers: {
                        "X-Requested-With": "XMLHttpRequest",
                        "Accept": "application/json"
                    }
                });

                // Handle unexpected redirects, such as a login redirect.
                if (response.redirected) {
                    window.location.href = response.url;
                    return;
                }

                const contentType =
                    response.headers.get("content-type") || "";

                if (!contentType.includes("application/json")) {
                    throw new Error(
                        "Unexpected server response. Please try again."
                    );
                }

                const result = await response.json();

                // Redirect to login if authentication is required.
                if (result.login_url) {
                    window.location.href = result.login_url;
                    return;
                }

                // Handle stock errors and other failed requests.
                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        "Unable to add this product to your bag."
                    );
                }

                // Update the button only after Flask confirms success.
                if (text) {
                    text.textContent = "Added to Bag ✓";
                } else {
                    button.textContent = "Added to Bag ✓";
                }

                button.classList.remove("adding");
                button.classList.add("added-to-bag");

                // Update the navbar bag count.
                if (result.bag_count !== undefined &&
                    result.bag_count !== null) {

                    document.querySelectorAll(
                        ".cart-count, .bag-count, [data-bag-count]"
                    ).forEach(element => {
                        element.textContent = result.bag_count;
                    });
                }

                // Show success notification if a notification helper exists.
                if (typeof showNotification === "function") {
                    showNotification(
                        result.message || "Product added to your bag!",
                        "success"
                    );
                }

            } catch (error) {
                console.error("Add to Bag error:", error);

                // Restore the original label on failure.
                if (text) {
                    text.textContent = originalText;
                } else {
                    button.textContent = originalText;
                }

                button.classList.remove("added-to-bag");

                if (typeof showNotification === "function") {
                    showNotification(
                        error.message ||
                        "Unable to add product to your bag. Please try again.",
                        "error"
                    );
                } else {
                    alert(
                        error.message ||
                        "Unable to add product to your bag. Please try again."
                    );
                }

            } finally {
                // Restore the button so the user can try again.
                form.dataset.submitting = "false";
                button.disabled = false;
                button.classList.remove("adding");
            }
        });
    });
}


/* =========================================================
   CATEGORY NORMALIZATION
   ========================================================= */

function normalizeBeautyCategory(value) {
    if (!value) return "";

    const category = String(value)
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

    if (aliases[category]) return aliases[category];

    if (category.endsWith("s")) {
        const singular = category.slice(0, -1);

        if (aliases[singular]) return aliases[singular];
    }

    return category;
}


/* =========================================================
   BEAUTY CATEGORY FILTER
   ========================================================= */

function initializeBeautyCategoryCards() {
    const categoryCards = document.querySelectorAll(
        ".beauty-category-card"
    );

    const productGrid = document.getElementById("productGrid");

    if (!categoryCards.length || !productGrid) return;

    const productCards = Array.from(
        productGrid.querySelectorAll(".beauty-product-card")
    );

    let emptyMessage = productGrid.querySelector(
        ".category-empty-state"
    );

    if (!emptyMessage) {
        emptyMessage = document.createElement("div");
        emptyMessage.className = "category-empty-state";

        emptyMessage.innerHTML = `
            <div class="category-empty-icon">♡</div>
            <h3>No products in this category yet</h3>
            <p>
                Products added by the admin will appear here
                automatically.
            </p>
        `;

        emptyMessage.style.display = "none";
        productGrid.appendChild(emptyMessage);
    }

    function matchesCategory(product, selectedCategory) {
        const selected = normalizeBeautyCategory(selectedCategory);

        if (selected === "all") return true;

        const type = normalizeBeautyCategory(
            product.dataset.productType
        );

        const category = normalizeBeautyCategory(
            product.dataset.category
        );

        return type === selected || category === selected;
    }

    function showCategory(selectedCategory, shouldScroll = true) {
        const selected = normalizeBeautyCategory(selectedCategory);
        let visibleCount = 0;

        productCards.forEach(product => {
            const matches = matchesCategory(product, selected);

            product.style.display = matches ? "" : "none";

            if (matches) {
                visibleCount++;
                product.classList.add("visible");
            } else {
                product.classList.remove("visible");
            }
        });

        emptyMessage.style.display =
            visibleCount === 0 ? "block" : "none";

        categoryCards.forEach(card => {
            const cardCategory = normalizeBeautyCategory(
                card.dataset.filter
            );

            card.classList.toggle(
                "active",
                cardCategory === selected
            );
        });

        const labels = {
            "all": "ALL BEAUTY",
            "lipstick": "LIPSTICKS",
            "eyeshadow": "EYESHADOW",
            "blush": "BLUSH",
            "eyeliner": "EYELINER",
            "mascara": "MASCARA",
            "foundation": "FOUNDATION",
            "highlighter": "HIGHLIGHTER"
        };

        const label = document.getElementById(
            "selectedCategoryLabel"
        );

        const description = document.getElementById(
            "selectedCategoryDescription"
        );

        if (label) {
            label.textContent = labels[selected] ||
                selected.replace(/-/g, " ").toUpperCase();
        }

        if (description) {
            description.textContent =
                selected === "all"
                    ? "Explore our complete beauty collection."
                    : `Explore our ${selected.replace(/-/g, " ")} collection.`;
        }

        if (shouldScroll) {
            const section = document.getElementById("products");

            if (section) {
                setTimeout(() => {
                    section.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }, 100);
            }
        }
    }

    categoryCards.forEach(card => {
        card.addEventListener("click", event => {
            event.preventDefault();

            if (!card.dataset.filter) return;

            showCategory(card.dataset.filter, true);
        });

        card.addEventListener("keydown", event => {
            if (
                event.key === "Enter" ||
                event.key === " "
            ) {
                event.preventDefault();
                card.click();
            }
        });
    });

    showCategory("all", false);

    // Allow other page scripts to filter products.
    window.filterBeautyProducts = category => {
        const selected = normalizeBeautyCategory(category);

        const matchingCard = Array.from(categoryCards).find(card => {
            return normalizeBeautyCategory(card.dataset.filter) === selected;
        });

        if (matchingCard) {
            matchingCard.click();
        }
    };
}


/* =========================================================
   RANDOM LIPSTICK
   ========================================================= */

function randomizeLipstick() {
    const visuals = document.querySelectorAll(
        ".lipstick-visual, .lipstick-card"
    );

    if (!visuals.length) return;

    let newIndex = Math.floor(Math.random() * visuals.length);

    if (
        visuals.length > 1 &&
        newIndex === lastLipstickIndex
    ) {
        newIndex = (newIndex + 1) % visuals.length;
    }

    lastLipstickIndex = newIndex;

    visuals.forEach((visual, index) => {
        visual.classList.toggle("active", index === newIndex);
    });
}


/* =========================================================
   RANDOM EYELINER
   ========================================================= */

function randomizeEyeliner() {
    const visuals = document.querySelectorAll(
        ".eyeliner-visual, .eyeliner-card"
    );

    if (!visuals.length) return;

    const randomIndex = Math.floor(Math.random() * visuals.length);

    visuals.forEach((visual, index) => {
        visual.classList.toggle("active", index === randomIndex);
    });
}


/* =========================================================
   LOGIN POPUP
   ========================================================= */

function initializeLoginPopup() {
    const popup = document.getElementById("loginPopup");

    if (!popup) return;

    if (
        !popup.hasAttribute("hidden") &&
        !popup.classList.contains("show")
    ) {
        popup.hidden = true;
    }

    popup.addEventListener("click", event => {
        if (event.target === popup) {
            closeLoginPopup();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !popup.hidden) {
            closeLoginPopup();
        }
    });
}


function showLoginPopup() {
    const popup = document.getElementById("loginPopup");

    if (!popup) {
        // Fallback when the page does not contain the popup.
        window.location.href =
            "/login?next=" +
            encodeURIComponent(
                window.location.pathname + window.location.search
            );
        return;
    }

    popup.hidden = false;

    document.body.classList.add("login-popup-open");
    document.body.style.overflow = "hidden";

    const okButton = popup.querySelector(".login-popup-ok");

    if (okButton) {
        setTimeout(() => okButton.focus(), 50);
    }
}


function closeLoginPopup() {
    const popup = document.getElementById("loginPopup");

    if (!popup) return;

    popup.hidden = true;

    document.body.classList.remove("login-popup-open");
    document.body.style.overflow = "";
}


function goToLogin() {
    const next = window.location.pathname + window.location.search;

    window.location.href =
        "/login?next=" + encodeURIComponent(next);
}


/* =========================================================
   FAVORITES AJAX
   Used by .favorite-form on the Beauty page.
   Favorites page remove forms continue normal submission.
   ========================================================= */

function initializeFavorites() {
    const forms = document.querySelectorAll(".favorite-form");

    if (!forms.length) return;

    let notification = document.getElementById(
        "favoriteNotification"
    );

    let notificationTimer;

    if (!notification) {
        notification = document.createElement("div");
        notification.id = "favoriteNotification";
        notification.className = "favorite-notification";
        notification.setAttribute("role", "status");
        notification.setAttribute("aria-live", "polite");

        document.body.appendChild(notification);
    }

    function showFavoriteMessage(message, isError = false) {
        notification.textContent = message;
        notification.classList.toggle("error", isError);
        notification.classList.add("show");

        clearTimeout(notificationTimer);

        notificationTimer = setTimeout(() => {
            notification.classList.remove("show");
        }, 2500);
    }

    forms.forEach(form => {
        if (form.dataset.favoriteInitialized === "true") return;

        form.dataset.favoriteInitialized = "true";

        form.addEventListener("submit", async event => {
            event.preventDefault();

            const button = form.querySelector(
                ".product-favorite-btn"
            );

            const heart = form.querySelector(".favorite-heart");

            if (!button || button.disabled) return;

            button.disabled = true;

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    credentials: "same-origin",
                    headers: {
                        "X-Requested-With": "XMLHttpRequest",
                        "Accept": "application/json"
                    }
                });

                const contentType =
                    response.headers.get("content-type") || "";

                if (!contentType.includes("application/json")) {
                    if (response.redirected) {
                        window.location.href = response.url;
                        return;
                    }

                    throw new Error(
                        "The server did not return a JSON response."
                    );
                }

                const result = await response.json();

                if (result.login_required && result.login_url) {
                    showFavoriteMessage(
                        result.message ||
                        "Please log in to save favorites."
                    );

                    setTimeout(() => {
                        window.location.href = result.login_url;
                    }, 800);

                    return;
                }

                if (!response.ok || !result.success) {
                    showFavoriteMessage(
                        result.message ||
                        "Unable to update favorites.",
                        true
                    );
                    return;
                }

                const isFavorite = Boolean(result.is_favorite);

                if (heart) {
                    heart.textContent = isFavorite ? "♥" : "♡";
                } else {
                    button.textContent = isFavorite ? "♥" : "♡";
                }

                button.classList.toggle("is-favorite", isFavorite);
                button.setAttribute(
                    "aria-pressed",
                    String(isFavorite)
                );

                button.setAttribute(
                    "aria-label",
                    isFavorite
                        ? `Remove ${form.closest("[data-product-name]")?.dataset.productName || "product"} from favorites`
                        : `Add ${form.closest("[data-product-name]")?.dataset.productName || "product"} to favorites`
                );

                button.title = isFavorite
                    ? "Remove from Favorites"
                    : "Add to Favorites";

                showFavoriteMessage(
                    result.message ||
                    (
                        isFavorite
                            ? "Product added to favorites."
                            : "Product removed from favorites."
                    )
                );

            } catch (error) {
                console.error("Favorite request failed:", error);

                showFavoriteMessage(
                    "Unable to update favorites. Please try again.",
                    true
                );

            } finally {
                button.disabled = false;
            }
        });
    });
}

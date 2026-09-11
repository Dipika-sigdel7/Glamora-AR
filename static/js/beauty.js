
/* =========================================================
   GLAMORA AR
   BEAUTY PAGE JAVASCRIPT
   ========================================================= */


/* =========================================================
   LOADER
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const loader = document.getElementById("loader");

    if (!loader) {
        return;
    }

    setTimeout(function () {

        loader.classList.add("hidden");

        setTimeout(function () {
            loader.style.display = "none";
        }, 600);

    }, 1200);

});


/* =========================================================
   CATEGORY FILTER
   ========================================================= */

function initializeBeautyCategoryFilter() {

    const filterButtons =
        document.querySelectorAll(".beauty-filter-btn");

    const productCards =
        document.querySelectorAll(".product-card");

    const categoryCards =
        document.querySelectorAll("[data-category-link]");

    const productGrid =
        document.getElementById("productGrid");


    /* -----------------------------------------------------
       STOP IF THERE ARE NO FILTER BUTTONS
       ----------------------------------------------------- */

    if (!filterButtons.length) {
        return;
    }


    /* =====================================================
       NORMALIZE CATEGORY NAME
       ===================================================== */

    function normalizeCategory(value) {

        if (!value) {
            return "";
        }

        return String(value)
            .toLowerCase()
            .trim()
            .replace(/[_\s]+/g, "-");

    }


    /* =====================================================
       FILTER PRODUCTS
       ===================================================== */

    function filterProducts(category) {

        const normalizedCategory =
            normalizeCategory(category);


        productCards.forEach(function (card) {

            const productType =
                normalizeCategory(
                    card.dataset.productType
                );


            const shouldShow =
                normalizedCategory === "all" ||
                productType === normalizedCategory;


            if (shouldShow) {

                card.style.display = "";

                /* Force animation restart */
                card.classList.remove(
                    "category-visible"
                );

                requestAnimationFrame(function () {

                    card.classList.add(
                        "category-visible"
                    );

                });

            } else {

                card.classList.remove(
                    "category-visible"
                );

                card.style.display = "none";

            }

        });


        /* =================================================
           UPDATE ACTIVE FILTER BUTTON
           ================================================= */

        filterButtons.forEach(function (button) {

            const buttonCategory =
                normalizeCategory(
                    button.dataset.filter
                );

            button.classList.toggle(
                "active",
                buttonCategory === normalizedCategory
            );

        });


        /* =================================================
           SCROLL TO PRODUCT GRID
           ================================================= */

        if (productGrid) {

            setTimeout(function () {

                productGrid.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }, 100);

        }

    }


    /* =====================================================
       FILTER BUTTON CLICK
       ===================================================== */

    filterButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const category =
                    button.dataset.filter || "all";

                filterProducts(category);

            }
        );

    });


    /* =====================================================
       CATEGORY CARD CLICK
       ===================================================== */

    categoryCards.forEach(function (card) {

        card.addEventListener(
            "click",
            function (event) {

                event.preventDefault();


                const category =
                    card.dataset.categoryLink;


                if (!category) {
                    return;
                }


                const normalizedCategory =
                    normalizeCategory(category);


                /* Find matching filter button */
                let matchingButton = null;


                filterButtons.forEach(function (button) {

                    const buttonCategory =
                        normalizeCategory(
                            button.dataset.filter
                        );


                    if (
                        buttonCategory ===
                        normalizedCategory
                    ) {

                        matchingButton = button;

                    }

                });


                if (matchingButton) {

                    matchingButton.click();

                } else {

                    /*
                     * If no filter button exists,
                     * directly filter the products.
                     */

                    filterProducts(category);

                }

            }
        );

    });


    /* =====================================================
       SHOW ALL PRODUCTS ON FIRST LOAD
       ===================================================== */

    filterProducts("all");

}


/* =========================================================
   CATEGORY CARD HOVER ANIMATION
   ========================================================= */

function initializeCategoryHover() {

    const cards =
        document.querySelectorAll(
            ".beauty-category-card"
        );


    cards.forEach(function (card) {

        card.addEventListener(
            "mouseenter",
            function () {

                card.classList.add(
                    "is-hovered"
                );

            }
        );


        card.addEventListener(
            "mouseleave",
            function () {

                card.classList.remove(
                    "is-hovered"
                );

            }
        );

    });

}


/* =========================================================
   INITIALIZE BEAUTY PAGE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeBeautyCategoryFilter();

        initializeCategoryHover();

    }
);


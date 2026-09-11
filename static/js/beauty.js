/* =========================================================
   GLAMORA AR
   BEAUTY CATEGORY FILTER
   ========================================================= */


/* =========================================================
   CATEGORY FILTER
   ========================================================= */

function initializeBeautyCategoryFilter() {

    const filterButtons =
        document.querySelectorAll(
            ".beauty-filter-btn"
        );

    const productCards =
        document.querySelectorAll(
            ".product-card"
        );

    const categoryCards =
        document.querySelectorAll(
            "[data-category-link]"
        );

    const productGrid =
        document.querySelector("#productGrid");


    if (!filterButtons.length) {
        return;
    }


    /* =====================================================
       NORMALIZE CATEGORY
       ===================================================== */

    function normalizeCategory(value) {

        if (!value) {
            return "";
        }

        return value
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


        productCards.forEach(
            function (card) {

                const productType =
                    normalizeCategory(
                        card.dataset.productType
                    );


                const shouldShow =
                    normalizedCategory === "all" ||
                    productType === normalizedCategory;


                if (shouldShow) {

                    card.style.display = "";

                    requestAnimationFrame(
                        function () {

                            card.classList.add(
                                "category-visible"
                            );

                        }
                    );

                } else {

                    card.classList.remove(
                        "category-visible"
                    );

                    card.style.display = "none";

                }

            }
        );


        /* =================================================
           ACTIVE FILTER BUTTON
           ================================================= */

        filterButtons.forEach(
            function (button) {

                button.classList.toggle(
                    "active",
                    normalizeCategory(
                        button.dataset.filter
                    ) === normalizedCategory
                );

            }
        );


        /* =================================================
           SCROLL TO PRODUCTS
           ================================================= */

        if (productGrid) {

            setTimeout(
                function () {

                    productGrid.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                },
                100
            );

        }

    }


    /* =====================================================
       FILTER BUTTON CLICK
       ===================================================== */

    filterButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const category =
                        button.dataset.filter || "all";

                    filterProducts(category);

                }
            );

        }
    );


    /* =====================================================
       CATEGORY CARD CLICK
       ===================================================== */

    categoryCards.forEach(
        function (card) {

            card.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    const category =
                        card.dataset.categoryLink;

                    if (!category) {
                        return;
                    }


                    const matchingButton =
                        document.querySelector(
                            `.beauty-filter-btn[data-filter="${category}"]`
                        );


                    if (matchingButton) {

                        matchingButton.click();

                    }

                }
            );

        }
    );


    /* =====================================================
       SHOW ALL ON FIRST LOAD
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


    cards.forEach(
        function (card) {

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

        }
    );

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
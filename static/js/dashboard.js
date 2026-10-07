/* =========================================================
   GLAMORA AR
   ADMIN DASHBOARD
   dashboard.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =====================================================
       DASHBOARD INITIALIZATION
       ===================================================== */

    console.log("========================================");
    console.log("GLAMORA AR - ADMIN DASHBOARD");
    console.log("Dashboard JavaScript loaded successfully.");
    console.log("========================================");


    /* =====================================================
       ADD PRODUCT BUTTONS
       ===================================================== */

    const addProductButtons = document.querySelectorAll(
        ".admin-primary-button"
    );

    addProductButtons.forEach((button) => {

        button.addEventListener("click", () => {

            button.classList.add("is-loading");

        });

    });


    /* =====================================================
       SIDEBAR NAVIGATION
       ===================================================== */

    const navigationItems = document.querySelectorAll(
        ".admin-nav-item"
    );

    navigationItems.forEach((item) => {

        item.addEventListener("click", () => {

            navigationItems.forEach((navItem) => {
                navItem.classList.remove("active");
            });

            item.classList.add("active");

        });

    });


    /* =====================================================
       PRODUCT TABLE ROWS
       ===================================================== */

    const productRows = document.querySelectorAll(
        ".admin-table-row"
    );

    productRows.forEach((row) => {

        row.addEventListener("mouseenter", () => {

            row.classList.add("row-hover");

        });

        row.addEventListener("mouseleave", () => {

            row.classList.remove("row-hover");

        });

    });


    /* =====================================================
       STAT CARD ANIMATION
       ===================================================== */

    const statCards = document.querySelectorAll(
        ".admin-stat-card"
    );

    statCards.forEach((card, index) => {

        card.style.animationDelay = `${index * 80}ms`;

        card.classList.add("dashboard-card-visible");

    });


    /* =====================================================
       NUMBER ANIMATION
       ===================================================== */

    const statNumbers = document.querySelectorAll(
        ".admin-stat-card strong"
    );

    statNumbers.forEach((element) => {

        const finalValue = parseInt(
            element.textContent.trim(),
            10
        );

        if (Number.isNaN(finalValue)) {
            return;
        }

        animateNumber(
            element,
            finalValue
        );

    });


    /* =====================================================
       EMPTY STATE
       ===================================================== */

    const emptyState = document.querySelector(
        ".admin-empty-state"
    );

    if (emptyState) {

        emptyState.classList.add(
            "dashboard-empty-visible"
        );

    }


    /* =====================================================
       CURRENT YEAR
       ===================================================== */

    const yearElements = document.querySelectorAll(
        "[data-current-year]"
    );

    yearElements.forEach((element) => {

        element.textContent =
            new Date().getFullYear();

    });

});


/* =========================================================
   NUMBER ANIMATION
   ========================================================= */

function animateNumber(element, target) {

    const duration = 700;

    const startTime = performance.now();

    const startValue = 0;


    function update(currentTime) {

        const elapsed =
            currentTime - startTime;

        const progress =
            Math.min(elapsed / duration, 1);


        const easedProgress =
            1 - Math.pow(
                1 - progress,
                3
            );


        const currentValue =
            Math.floor(
                startValue +
                (target - startValue) *
                easedProgress
            );


        element.textContent =
            currentValue.toLocaleString();


        if (progress < 1) {

            requestAnimationFrame(update);

        } else {

            element.textContent =
                target.toLocaleString();

        }

    }


    requestAnimationFrame(update);
}
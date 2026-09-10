/* =========================================================
   GLAMORA AR
   BEAUTY PAGE INTERACTIONS
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       CATEGORY CARD MAGNETIC HOVER
       ===================================================== */

    const cards = document.querySelectorAll(".category-card");

    cards.forEach((card) => {

        card.addEventListener("mousemove", (event) => {

            const rect = card.getBoundingClientRect();

            const x =
                event.clientX - rect.left;

            const y =
                event.clientY - rect.top;

            const centerX =
                rect.width / 2;

            const centerY =
                rect.height / 2;

            const rotateX =
                ((y - centerY) / centerY) * -2;

            const rotateY =
                ((x - centerX) / centerX) * 2;

            card.style.transform =
                `translateY(-12px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        });


        card.addEventListener("mouseleave", () => {

            card.style.transform =
                "";

        });

    });


    /* =====================================================
       PRODUCT IMAGE TILT
       ===================================================== */

    const productCards =
        document.querySelectorAll(
            ".beauty-product-card"
        );

    productCards.forEach((card) => {

        card.addEventListener(
            "mousemove",
            (event) => {

                const image =
                    card.querySelector(
                        ".product-photo img"
                    );

                if (!image) {
                    return;
                }

                const rect =
                    card.getBoundingClientRect();

                const x =
                    event.clientX - rect.left;

                const y =
                    event.clientY - rect.top;

                const rotateY =
                    ((x - rect.width / 2)
                    / rect.width) * 3;

                const rotateX =
                    ((y - rect.height / 2)
                    / rect.height) * -3;

                image.style.transform =
                    `scale(1.07) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

            }
        );


        card.addEventListener(
            "mouseleave",
            () => {

                const image =
                    card.querySelector(
                        ".product-photo img"
                    );

                if (image) {

                    image.style.transform =
                        "";

                }

            }
        );

    });


    /* =====================================================
       WISHLIST BUTTON
       ===================================================== */

    const wishlistButtons =
        document.querySelectorAll(
            ".product-wishlist"
        );

    wishlistButtons.forEach((button) => {

        button.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                event.stopPropagation();

                button.classList.toggle(
                    "liked"
                );

                button.textContent =
                    button.classList.contains(
                        "liked"
                    )
                        ? "♥"
                        : "♡";

            }
        );

    });


    /* =====================================================
       TRY-ON BUTTON
       ===================================================== */

    const tryOnButton =
        document.getElementById(
            "startTryOn"
        );

    if (tryOnButton) {

        tryOnButton.addEventListener(
            "click",
            () => {

                alert(
                    "Virtual Try-On is ready to connect with your AR camera."
                );

            }
        );

    }

});
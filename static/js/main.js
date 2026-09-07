
/* =========================================================
   GLAMORA AR
   INTERACTIVE UI
   ========================================================= */


/* =========================================================
   LOADER
   ========================================================= */

window.addEventListener("load", () => {

    setTimeout(() => {

        const loader = document.getElementById("loader");

        if (loader) {
            loader.classList.add("hide");
        }

        document.body.classList.add("loaded");

    }, 1700);

});


/* =========================================================
   SCROLL REVEAL
   ========================================================= */

const revealElements =
    document.querySelectorAll(".reveal");


const revealObserver =
    new IntersectionObserver(
        (entries) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("visible");

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


/* =========================================================
   ACTIVE NAVIGATION
   ========================================================= */

const sections =
    document.querySelectorAll("section[id]");

const navLinks =
    document.querySelectorAll(".nav-links a");


window.addEventListener("scroll", () => {

    let current = "";

    sections.forEach((section) => {

        const sectionTop =
            section.offsetTop - 150;

        if (
            window.scrollY >= sectionTop
        ) {
            current = section.id;
        }

    });


    navLinks.forEach((link) => {

        link.classList.remove("active");

        if (
            link.getAttribute("href") ===
            `#${current}`
        ) {
            link.classList.add("active");
        }

    });

});


/* =========================================================
   MAKEUP OPTIONS
   ========================================================= */

const makeupOptions =
    document.querySelectorAll(".makeup-option");


makeupOptions.forEach((option) => {

    option.addEventListener("click", () => {

        makeupOptions.forEach((item) => {

            item.classList.remove("active");

        });

        option.classList.add("active");

    });

});


/* =========================================================
   PARALLAX HERO
   ========================================================= */

const heroVisual =
    document.querySelector(".hero-visual");


window.addEventListener("mousemove", (event) => {

    if (!heroVisual) {
        return;
    }

    const x =
        (event.clientX / window.innerWidth - 0.5);

    const y =
        (event.clientY / window.innerHeight - 0.5);


    heroVisual.style.transform =
        `translate(${x * 10}px, ${y * 10}px)`;

});


/* =========================================================
   MOBILE MENU
   ========================================================= */

const menuBtn =
    document.getElementById("menuBtn");

let menuOpen = false;


if (menuBtn) {

    menuBtn.addEventListener("click", () => {

        menuOpen = !menuOpen;

        const nav =
            document.querySelector(".nav-links");

        if (menuOpen) {

            nav.style.display = "flex";

            nav.style.position = "absolute";

            nav.style.top = "70px";

            nav.style.left = "0";

            nav.style.right = "0";

            nav.style.padding = "25px";

            nav.style.flexDirection = "column";

            nav.style.background =
                "rgba(248,243,238,0.97)";

            nav.style.backdropFilter =
                "blur(20px)";

        } else {

            nav.style.display = "";

        }

    });

}


/* =========================================================
   PRODUCT HOVER EFFECT
   ========================================================= */

const productCards =
    document.querySelectorAll(".product-card");


productCards.forEach((card) => {

    card.addEventListener(
        "mousemove",
        (event) => {

            const rect =
                card.getBoundingClientRect();

            const x =
                event.clientX - rect.left;

            const y =
                event.clientY - rect.top;

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
                 rotateY(${rotateY}deg)`;

        }
    );


    card.addEventListener(
        "mouseleave",
        () => {

            card.style.transform =
                "perspective(800px) rotateX(0) rotateY(0)";

        }
    );

});


/* =========================================================
   CART DEMO
   ========================================================= */

let cartCount = 0;

const cartCounter =
    document.querySelector(".cart-count");

const quickTryButtons =
    document.querySelectorAll(".quick-try");


quickTryButtons.forEach((button) => {

    button.addEventListener("click", (event) => {

        event.preventDefault();

        cartCount++;

        if (cartCounter) {

            cartCounter.textContent =
                cartCount;

        }

        button.textContent =
            "Added ✓";

        setTimeout(() => {

            button.textContent =
                "Try AR";

        }, 1200);

    });

});

/* =========================================================
   RANDOM BEAUTY LOOK ON EVERY PAGE LOAD
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    randomizeLipstick();

    randomizeEyeliner();

});


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


    const randomIndex =
        Math.floor(
            Math.random() *
            lipstickColors.length
        );


    const selected =
        lipstickColors[randomIndex];


    const lipstick =
        document.querySelector(
            ".lipstick-product"
        );


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


    const eye =
        document.querySelector(".eye");


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

        eye.classList.add(
            selected.className
        );

        eye.style.setProperty(
            "--eyeliner-color",
            selected.color
        );

    }


    if (lashesTop) {

        lashesTop.classList.add(
            selected.lashClass
        );

    }


    if (lashesBottom) {

        lashesBottom.classList.add(
            selected.lashClass
        );

    }


    if (eyelinerName) {

        eyelinerName.textContent =
            selected.name;

    }

}


/* =========================================================
   GLAMORA AR — LOGIN PAGE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializePasswordToggle();

    initializeLoginForm();

    initializeInputAnimations();

});


/* =========================================================
   PASSWORD VISIBILITY TOGGLE
   ========================================================= */

function initializePasswordToggle() {

    const passwordInput =
        document.getElementById("password");

    const passwordToggle =
        document.getElementById("passwordToggle");


    if (!passwordInput || !passwordToggle) {
        return;
    }


    passwordToggle.addEventListener("click", () => {

        const isPassword =
            passwordInput.type === "password";


        if (isPassword) {

            passwordInput.type = "text";

            passwordToggle.textContent = "◉";

            passwordToggle.setAttribute(
                "aria-label",
                "Hide password"
            );

        } else {

            passwordInput.type = "password";

            passwordToggle.textContent = "◉";

            passwordToggle.setAttribute(
                "aria-label",
                "Show password"
            );

        }

    });

}


/* =========================================================
   LOGIN FORM
   ========================================================= */

function initializeLoginForm() {

    const loginForm =
        document.getElementById("loginForm");


    if (!loginForm) {
        return;
    }


    loginForm.addEventListener("submit", (event) => {

        const emailInput =
            document.getElementById("email");

        const passwordInput =
            document.getElementById("password");

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        /* -------------------------------------------------
           CLEAR PREVIOUS ERROR
           ------------------------------------------------- */

        hideLoginError();


        /* -------------------------------------------------
           EMAIL VALIDATION
           ------------------------------------------------- */

        if (!email) {

            event.preventDefault();

            showLoginError(
                "Please enter your email address."
            );

            emailInput.focus();

            return;
        }


        if (!isValidEmail(email)) {

            event.preventDefault();

            showLoginError(
                "Please enter a valid email address."
            );

            emailInput.focus();

            return;
        }


        /* -------------------------------------------------
           PASSWORD VALIDATION
           ------------------------------------------------- */

        if (!password) {

            event.preventDefault();

            showLoginError(
                "Please enter your password."
            );

            passwordInput.focus();

            return;
        }


        if (password.length < 6) {

            event.preventDefault();

            showLoginError(
                "Password must contain at least 6 characters."
            );

            passwordInput.focus();

            return;
        }


        /* -------------------------------------------------
           LOGIN BUTTON LOADING STATE
           ------------------------------------------------- */

        const submitButton =
            loginForm.querySelector(
                'button[type="submit"]'
            );


        if (submitButton) {

            submitButton.classList.add("loading");

            submitButton.disabled = true;


            const buttonText =
                submitButton.querySelector(
                    ".button-text"
                );


            if (buttonText) {

                buttonText.textContent =
                    "Signing in...";

            }

        }

        /*
         * IMPORTANT:
         *
         * We do NOT use preventDefault()
         * when validation succeeds.
         *
         * The form will be submitted to:
         *
         * POST /login
         *
         * Flask will handle the actual authentication.
         */

    });

}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function isValidEmail(email) {

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);

}


/* =========================================================
   SHOW LOGIN ERROR
   ========================================================= */

function showLoginError(message) {

    const errorBox =
        document.getElementById("loginError");


    if (!errorBox) {
        return;
    }


    errorBox.textContent = message;

    errorBox.classList.add("show");

    errorBox.classList.remove("shake");


    /*
     * Restart CSS animation
     */

    void errorBox.offsetWidth;


    errorBox.classList.add("shake");

}


/* =========================================================
   HIDE LOGIN ERROR
   ========================================================= */

function hideLoginError() {

    const errorBox =
        document.getElementById("loginError");


    if (!errorBox) {
        return;
    }


    errorBox.textContent = "";

    errorBox.classList.remove("show");

}


/* =========================================================
   INPUT ANIMATIONS
   ========================================================= */

function initializeInputAnimations() {

    const inputs =
        document.querySelectorAll(
            ".login-form input"
        );


    inputs.forEach((input) => {


        /* -----------------------------------------------
           FOCUS
           ----------------------------------------------- */

        input.addEventListener("focus", () => {

            const group =
                input.closest(".form-group");


            if (group) {

                group.classList.add("focused");

            }

        });


        /* -----------------------------------------------
           BLUR
           ----------------------------------------------- */

        input.addEventListener("blur", () => {

            const group =
                input.closest(".form-group");


            if (group) {

                group.classList.remove("focused");

            }

        });


        /* -----------------------------------------------
           REMOVE ERROR WHILE TYPING
           ----------------------------------------------- */

        input.addEventListener("input", () => {

            hideLoginError();

        });

    });

}


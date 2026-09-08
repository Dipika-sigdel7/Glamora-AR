/* =========================================================
   GLAMORA AR — CREATE ACCOUNT
   REGISTER PAGE JAVASCRIPT
   ========================================================= */


document.addEventListener("DOMContentLoaded", () => {

    initializePasswordToggle(
        "password",
        "passwordToggle"
    );

    initializePasswordToggle(
        "confirmPassword",
        "confirmPasswordToggle"
    );

    initializeRegisterForm();

    initializeInputAnimations();

});


/* =========================================================
   PASSWORD TOGGLE
   ========================================================= */

function initializePasswordToggle(
    inputId,
    toggleId
) {

    const passwordInput =
        document.getElementById(inputId);

    const passwordToggle =
        document.getElementById(toggleId);


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
   REGISTER FORM
   ========================================================= */

function initializeRegisterForm() {

    const registerForm =
        document.getElementById("registerForm");


    if (!registerForm) {
        return;
    }


    registerForm.addEventListener(
        "submit",
        (event) => {

            const nameInput =
                document.getElementById("name");

            const emailInput =
                document.getElementById("email");

            const passwordInput =
                document.getElementById("password");

            const confirmPasswordInput =
                document.getElementById(
                    "confirmPassword"
                );

            const termsInput =
                document.getElementById("terms");


            const name =
                nameInput.value.trim();

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;

            const confirmPassword =
                confirmPasswordInput.value;


            hideMessages();


            /* ---------------------------------------------
               NAME VALIDATION
               --------------------------------------------- */

            if (!name) {

                event.preventDefault();

                showError(
                    "Please enter your full name."
                );

                nameInput.focus();

                return;
            }


            if (name.length < 2) {

                event.preventDefault();

                showError(
                    "Your name must contain at least 2 characters."
                );

                nameInput.focus();

                return;
            }


            /* ---------------------------------------------
               EMAIL VALIDATION
               --------------------------------------------- */

            if (!email) {

                event.preventDefault();

                showError(
                    "Please enter your email address."
                );

                emailInput.focus();

                return;
            }


            if (!isValidEmail(email)) {

                event.preventDefault();

                showError(
                    "Please enter a valid email address."
                );

                emailInput.focus();

                return;
            }


            /* ---------------------------------------------
               PASSWORD VALIDATION
               --------------------------------------------- */

            if (!password) {

                event.preventDefault();

                showError(
                    "Please create a password."
                );

                passwordInput.focus();

                return;
            }


            if (password.length < 6) {

                event.preventDefault();

                showError(
                    "Password must contain at least 6 characters."
                );

                passwordInput.focus();

                return;
            }


            /* ---------------------------------------------
               CONFIRM PASSWORD
               --------------------------------------------- */

            if (!confirmPassword) {

                event.preventDefault();

                showError(
                    "Please confirm your password."
                );

                confirmPasswordInput.focus();

                return;
            }


            if (password !== confirmPassword) {

                event.preventDefault();

                showError(
                    "Passwords do not match."
                );

                confirmPasswordInput.focus();

                return;
            }


            /* ---------------------------------------------
               TERMS
               --------------------------------------------- */

            if (!termsInput.checked) {

                event.preventDefault();

                showError(
                    "Please accept the Terms & Conditions and Privacy Policy."
                );

                termsInput.focus();

                return;
            }


            /* ---------------------------------------------
               LOADING STATE
               --------------------------------------------- */

            const submitButton =
                registerForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled = true;

                submitButton.classList.add("loading");


                const buttonText =
                    submitButton.querySelector(
                        ".button-text"
                    );


                if (buttonText) {

                    buttonText.textContent =
                        "Creating account...";

                }

            }

            /*
             * IMPORTANT:
             *
             * When validation succeeds,
             * the form is allowed to submit normally.
             *
             * Flask receives:
             *
             * name
             * email
             * password
             * confirm_password
             * terms
             *
             * through POST /register.
             */

        }
    );

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
   SHOW ERROR
   ========================================================= */

function showError(message) {

    const errorBox =
        document.getElementById("registerError");


    if (!errorBox) {
        return;
    }


    errorBox.textContent = message;

    errorBox.classList.add("show");

    errorBox.classList.remove("shake");


    /* Restart animation */

    void errorBox.offsetWidth;


    errorBox.classList.add("shake");

}


/* =========================================================
   SHOW SUCCESS
   ========================================================= */

function showSuccess(message) {

    const successBox =
        document.getElementById(
            "registerSuccess"
        );


    if (!successBox) {
        return;
    }


    successBox.textContent = message;

    successBox.classList.add("show");

}


/* =========================================================
   HIDE MESSAGES
   ========================================================= */

function hideMessages() {

    const errorBox =
        document.getElementById(
            "registerError"
        );

    const successBox =
        document.getElementById(
            "registerSuccess"
        );


    if (errorBox) {

        errorBox.textContent = "";

        errorBox.classList.remove(
            "show",
            "shake"
        );

    }


    if (successBox) {

        successBox.textContent = "";

        successBox.classList.remove(
            "show"
        );

    }

}


/* =========================================================
   INPUT FOCUS ANIMATIONS
   ========================================================= */

function initializeInputAnimations() {

    const inputs =
        document.querySelectorAll(
            ".register-form input"
        );


    inputs.forEach((input) => {


        /* ---------------------------------------------
           FOCUS
           --------------------------------------------- */

        input.addEventListener("focus", () => {

            const group =
                input.closest(".form-group");


            if (group) {

                group.classList.add(
                    "focused"
                );

            }

        });


        /* ---------------------------------------------
           BLUR
           --------------------------------------------- */

        input.addEventListener("blur", () => {

            const group =
                input.closest(".form-group");


            if (group) {

                group.classList.remove(
                    "focused"
                );

            }

        });


        /* ---------------------------------------------
           REMOVE ERROR WHILE TYPING
           --------------------------------------------- */

        input.addEventListener("input", () => {

            const errorBox =
                document.getElementById(
                    "registerError"
                );


            if (errorBox) {

                errorBox.classList.remove(
                    "show"
                );

            }

        });

    });

}
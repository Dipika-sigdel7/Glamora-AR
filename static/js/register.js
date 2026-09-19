/* =========================================================
   GLAMORA AR
   REGISTER PAGE JAVASCRIPT
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const registerForm =
        document.getElementById("registerForm");

    const registerError =
        document.getElementById("registerError");

    const registerButton =
        document.getElementById("registerButton");


    const passwordInput =
        document.getElementById("password");

    const confirmPasswordInput =
        document.getElementById("confirm_password");

    const nameInput =
        document.getElementById("name");

    const emailInput =
        document.getElementById("email");

    const termsInput =
        document.getElementById("terms");


    /* =====================================================
       SHOW ERROR
       ===================================================== */

    function showError(message) {

        if (!registerError) {
            return;
        }

        registerError.textContent = message;

        registerError.classList.add("show");
    }


    /* =====================================================
       HIDE ERROR
       ===================================================== */

    function hideError() {

        if (!registerError) {
            return;
        }

        registerError.textContent = "";

        registerError.classList.remove("show");
    }


    /* =====================================================
       PASSWORD TOGGLE
       ===================================================== */

    const passwordToggles =
        document.querySelectorAll(".password-toggle");


    passwordToggles.forEach(function (button) {

        button.addEventListener("click", function () {

            const targetId =
                button.getAttribute("data-target");

            const input =
                document.getElementById(targetId);

            if (!input) {
                return;
            }


            if (input.type === "password") {

                input.type = "text";

                button.textContent = "◉";

                button.setAttribute(
                    "aria-label",
                    "Hide password"
                );

                button.setAttribute(
                    "title",
                    "Hide password"
                );

            } else {

                input.type = "password";

                button.textContent = "◉";

                button.setAttribute(
                    "aria-label",
                    "Show password"
                );

                button.setAttribute(
                    "title",
                    "Show password"
                );

            }

        });

    });


    /* =====================================================
       CLEAR INVALID STATE
       ===================================================== */

    [
        nameInput,
        emailInput,
        passwordInput,
        confirmPasswordInput
    ].forEach(function (input) {

        if (!input) {
            return;
        }

        input.addEventListener("input", function () {

            input.classList.remove("invalid");

            hideError();

        });

    });


    /* =====================================================
       EMAIL VALIDATION
       ===================================================== */

    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    }


    /* =====================================================
       FORM SUBMIT
       ===================================================== */

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            function (event) {

                hideError();


                /* =========================================
                   NAME
                   ========================================= */

                const name =
                    nameInput.value.trim();


                if (name.length < 2) {

                    event.preventDefault();

                    nameInput.classList.add("invalid");

                    showError(
                        "Please enter your full name."
                    );

                    nameInput.focus();

                    return;
                }


                /* =========================================
                   EMAIL
                   ========================================= */

                const email =
                    emailInput.value.trim();


                if (!isValidEmail(email)) {

                    event.preventDefault();

                    emailInput.classList.add("invalid");

                    showError(
                        "Please enter a valid email address."
                    );

                    emailInput.focus();

                    return;
                }


                /* =========================================
                   PASSWORD
                   ========================================= */

                const password =
                    passwordInput.value;


                if (password.length < 6) {

                    event.preventDefault();

                    passwordInput.classList.add("invalid");

                    showError(
                        "Password must be at least 6 characters."
                    );

                    passwordInput.focus();

                    return;
                }


                /* =========================================
                   CONFIRM PASSWORD
                   ========================================= */

                const confirmPassword =
                    confirmPasswordInput.value;


                if (password !== confirmPassword) {

                    event.preventDefault();

                    confirmPasswordInput.classList.add(
                        "invalid"
                    );

                    showError(
                        "Passwords do not match."
                    );

                    confirmPasswordInput.focus();

                    return;
                }


                /* =========================================
                   TERMS
                   ========================================= */

                if (!termsInput.checked) {

                    event.preventDefault();

                    showError(
                        "Please agree to create your Glamora AR account."
                    );

                    termsInput.focus();

                    return;
                }


                /* =========================================
                   SUBMITTING
                   ========================================= */

                if (registerButton) {

                    registerButton.disabled = true;

                    registerButton.querySelector(
                        "span:first-child"
                    ).textContent = "Creating Account...";

                }

            }
        );

    }


});
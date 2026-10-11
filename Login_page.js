
        /* =========================
           SWITCH SIGN IN / SIGN UP
        ========================== */

        function showForm(type) {

            const signinForm =
                document.getElementById("signinForm");

            const signupForm =
                document.getElementById("signupForm");

            const signinTab =
                document.getElementById("signInTab");

            const signupTab =
                document.getElementById("signUpTab");

            const title =
                document.getElementById("authTitle");

            const subtitle =
                document.getElementById("authSubtitle");


            if (type === "signin") {

                signinForm.classList.add("active");

                signupForm.classList.remove("active");

                signinTab.classList.add("active");

                signupTab.classList.remove("active");

                title.textContent =
                    "Welcome back";

                subtitle.textContent =
                    "Sign in to continue your interview journey.";

            }

            else {

                signinForm.classList.remove("active");

                signupForm.classList.add("active");

                signinTab.classList.remove("active");

                signupTab.classList.add("active");

                title.textContent =
                    "Create your account";

                subtitle.textContent =
                    "Start practicing with your AI interviewer.";

            }

        }



        /* =========================
           PASSWORD SHOW / HIDE
        ========================== */

        function togglePassword(inputId, button) {

            const input =
                document.getElementById(inputId);


            if (input.type === "password") {

                input.type = "text";

                button.textContent = "○";

            }

            else {

                input.type = "password";

                button.textContent = "◉";

            }

        }



        /* =========================
           FORM SUBMIT
        ========================== */

        function handleSubmit(event, type) {

            event.preventDefault();


            if (type === "signin") {

                alert("Sign in clicked!");

            }

            else {

                alert("Account creation clicked!");

            }

        }

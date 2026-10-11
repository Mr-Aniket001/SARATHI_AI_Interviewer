
        /* =========================================
           STAR RATING
        ========================================= */

        const stars =
            document.querySelectorAll(".star");

        let selectedRating = 0;


        stars.forEach((star) => {

            star.addEventListener("click", () => {

                selectedRating =
                    Number(star.dataset.rating);


                stars.forEach((item) => {

                    const rating =
                        Number(item.dataset.rating);

                    if (rating <= selectedRating) {

                        item.classList.add("active");

                    } else {

                        item.classList.remove("active");

                    }

                });

            });

        });



        /* =========================================
           CHARACTER COUNTER
        ========================================= */

        const message =
            document.getElementById("message");

        const counter =
            document.getElementById("counter");


        message.addEventListener("input", () => {

            const length =
                message.value.length;

            counter.textContent =
                `${length} / 1000`;

        });



        /* =========================================
           FORM SUBMISSION
        ========================================= */

        const form =
            document.getElementById("feedbackForm");

        const successMessage =
            document.getElementById("successMessage");

        const successOverlay =
            document.getElementById("successOverlay");


        form.addEventListener("submit", (event) => {

            event.preventDefault();


            /*
                Later you can send the form data
                to your backend / database here.
            */


            /*
                Hide the feedback form.
            */

            form.style.display = "none";


            /*
                Show success panel.
            */

            successOverlay.classList.add("show");


            /*
                Keep the success panel visible
                for a short time, then close it
                and return to the previous page.
            */

            setTimeout(() => {

                successOverlay.style.opacity = "0";


                setTimeout(() => {

                    successOverlay.classList.remove("show");

                    /*
                        Return the user to the page
                        where they opened Feedback.
                    */

                    if (window.history.length > 1) {

                        window.history.back();

                    } else {

                        window.location.href =
                            "dashboard.html";

                    }

                }, 350);

            }, 2200);

        });


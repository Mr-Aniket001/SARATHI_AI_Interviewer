
        /* =====================================================
           DEFAULT SETTINGS
        ===================================================== */

        let interviewSettings = {

            domain:
                "Software Development",

            time:
                "30",

            difficulty:
                "Easy",

            language:
                "Python"

        };



        /* =====================================================
           DOMAIN SELECTION
        ===================================================== */

        function selectDomain(element) {

            document
                .querySelectorAll(".option-card")
                .forEach(card => {

                    card.classList.remove("active");

                });


            element.classList.add("active");


            interviewSettings.domain =
                element.dataset.domain;


            updateSelection();

        }



        /* =====================================================
           TIME SELECTION
        ===================================================== */

        function selectTime(element) {

            document
                .querySelectorAll(".time-option")
                .forEach(option => {

                    option.classList.remove("active");

                });


            element.classList.add("active");


            interviewSettings.time =
                element.dataset.time;


            updateSelection();

        }



        /* =====================================================
           DIFFICULTY SELECTION
        ===================================================== */

        function selectDifficulty(element) {

            document
                .querySelectorAll(".difficulty-option")
                .forEach(option => {

                    option.classList.remove("active");

                });


            element.classList.add("active");


            interviewSettings.difficulty =
                element.dataset.difficulty;


            updateSelection();

        }



        /* =====================================================
           LANGUAGE SELECTION
        ===================================================== */

        document
            .getElementById("language")
            .addEventListener(
                "change",
                function() {

                    interviewSettings.language =
                        this.value;

                    updateSelection();

                }
            );



        /* =====================================================
           UPDATE SELECTION TEXT
        ===================================================== */

        function updateSelection() {

            document
                .getElementById("selectedDomain")
                .textContent =
                    interviewSettings.domain;


            document
                .getElementById("selectedDetails")
                .textContent =
                    interviewSettings.time +
                    " minutes · " +
                    interviewSettings.difficulty +
                    " · " +
                    interviewSettings.language;

        }



        /* =====================================================
           START INTERVIEW
        ===================================================== */

        function startInterview() {

            /*
                Save settings so the main interview page
                can read them later.
            */

            sessionStorage.setItem(
                "sarathiInterviewSettings",
                JSON.stringify(
                    interviewSettings
                )
            );


            /*
                Open the main interview page.
            */

            window.location.href =
                "interview.html";

        }



        /* =====================================================
           EVOLVE BUTTON
        ===================================================== */

        function openEvolve() {

            /*
                Placeholder for the future EVOLVE system.

                You can later connect this button to:
                - AI evolution
                - Personalized learning
                - Career roadmap
                - Skill progression
                - AI mentor
            */

            alert(
                "EVOLVE is preparing your personalized AI experience."
            );

        }


        /* =====================================================
           INITIALIZE
        ===================================================== */

        updateSelection();

let remainingSeconds = 30 * 60;
let interviewFinished = false;
let dashboardVisible = false;
let timerInterval = null;
let mediaStream = null;
let micEnabled = true;
let cameraEnabled = true;
let interviewStartTime = Date.now();

const interviewState = {
    sessionId: null,
    currentQuestionIndex: 0,
    currentQuestion: "",
    maxQuestions: 10,
    voiceAnswer: "",
    overallScore: 0,
    evalHistory: []
};

const performance = {
    correct: 8,
    incorrect: 2,
    skipped: 0,
    total: 10,
    score: 85,
    accuracy: 80
};

const timer = document.getElementById("timer");
const stopButton = document.getElementById("stopButton");
const emergencyModal = document.getElementById("emergencyModal");
const overlay = document.getElementById("overlay");
const yesButton = document.getElementById("yesButton");
const noButton = document.getElementById("noButton");
const performanceDashboard = document.getElementById("performanceDashboard");
const dashboardLauncher = document.getElementById("dashboardLauncher");
const closeDashboard = document.getElementById("closeDashboard");
const meetWindow = document.getElementById("meetWindow");
const meetDragHandle = document.getElementById("meetDragHandle");
const cameraVideo = document.getElementById("cameraVideo");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const micButton = document.getElementById("micButton");
const cameraButton = document.getElementById("cameraButton");
const codeInput = document.getElementById("codeInput");
const terminalBody = document.getElementById("terminalBody");
const clearButton = document.getElementById("clearButton");
const runButton = document.getElementById("runButton");
const submitButton = document.getElementById("submitButton");
const languageSelect = document.getElementById("languageSelect");
const liveText = document.getElementById("liveText");
const aiStatus = document.getElementById("aiStatus");

let cameraDrag = null;

function clampCameraPosition(left, top) {
    const maxLeft = Math.max(0, window.innerWidth - meetWindow.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - meetWindow.offsetHeight);
    return {
        left: Math.min(Math.max(0, left), maxLeft),
        top: Math.min(Math.max(0, top), maxTop)
    };
}

meetDragHandle.addEventListener("pointerdown", event => {
    if (event.button !== 0) {
        return;
    }

    const rect = meetWindow.getBoundingClientRect();
    cameraDrag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: rect.left,
        startTop: rect.top
    };
    meetDragHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
});

meetDragHandle.addEventListener("pointermove", event => {
    if (!cameraDrag || cameraDrag.pointerId !== event.pointerId) {
        return;
    }

    const position = clampCameraPosition(
        cameraDrag.startLeft + event.clientX - cameraDrag.startX,
        cameraDrag.startTop + event.clientY - cameraDrag.startY
    );
    meetWindow.style.left = `${position.left}px`;
    meetWindow.style.top = `${position.top}px`;
    meetWindow.style.right = "auto";
    meetWindow.style.bottom = "auto";
});

function stopCameraDrag(event) {
    if (cameraDrag && cameraDrag.pointerId === event.pointerId) {
        cameraDrag = null;
    }
}

meetDragHandle.addEventListener("pointerup", stopCameraDrag);
meetDragHandle.addEventListener("pointercancel", stopCameraDrag);

meetDragHandle.addEventListener("keydown", event => {
    const offsets = {
        ArrowUp: [0, -10],
        ArrowDown: [0, 10],
        ArrowLeft: [-10, 0],
        ArrowRight: [10, 0]
    };
    const offset = offsets[event.key];
    if (!offset) {
        return;
    }

    const rect = meetWindow.getBoundingClientRect();
    const position = clampCameraPosition(rect.left + offset[0], rect.top + offset[1]);
    meetWindow.style.left = `${position.left}px`;
    meetWindow.style.top = `${position.top}px`;
    meetWindow.style.right = "auto";
    meetWindow.style.bottom = "auto";
    event.preventDefault();
});

window.addEventListener("resize", () => {
    if (!meetWindow.style.left || !meetWindow.style.top) {
        return;
    }

    const rect = meetWindow.getBoundingClientRect();
    const position = clampCameraPosition(rect.left, rect.top);
    meetWindow.style.left = `${position.left}px`;
    meetWindow.style.top = `${position.top}px`;
});

function renderTimer() {
    const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, "0");
    const seconds = (remainingSeconds % 60).toString().padStart(2, "0");
    timer.textContent = `${minutes}:${seconds}`;
}

function startTimer() {
    renderTimer();

    timerInterval = setInterval(() => {
        if (interviewFinished) {
            return;
        }

        remainingSeconds--;
        renderTimer();

        if (remainingSeconds <= 0) {
            remainingSeconds = 0;
            renderTimer();
            finishInterview(false);
        }
    }, 1000);
}

async function startMedia() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraPlaceholder.innerHTML = `
            <div class="camera-placeholder-icon">!</div>
            <span>Camera & microphone unavailable</span>
        `;
        return;
    }

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true
        });

        cameraVideo.srcObject = mediaStream;
        cameraPlaceholder.style.display = "none";
        micEnabled = true;
        cameraEnabled = true;
        updateMediaButtons();
    } catch (error) {
        console.warn("Camera/microphone permission was not granted:", error);
        cameraPlaceholder.style.display = "flex";
        cameraPlaceholder.innerHTML = `
            <div class="camera-placeholder-icon">◉</div>
            <span>Camera permission required</span>
        `;
    }
}

cameraButton.addEventListener("click", () => {
    if (!mediaStream) {
        return;
    }

    const videoTracks = mediaStream.getVideoTracks();
    if (videoTracks.length === 0) {
        return;
    }

    cameraEnabled = !cameraEnabled;
    videoTracks.forEach(track => {
        track.enabled = cameraEnabled;
    });

    updateMediaButtons();
});

micButton.addEventListener("click", () => {
    if (!mediaStream) {
        return;
    }

    const audioTracks = mediaStream.getAudioTracks();
    if (audioTracks.length === 0) {
        return;
    }

    micEnabled = !micEnabled;
    audioTracks.forEach(track => {
        track.enabled = micEnabled;
    });

    updateMediaButtons();
    if (micEnabled) {
        startSpeechRecognition();
    }
});

function updateMediaButtons() {
    if (micEnabled) {
        micButton.classList.add("on");
        micButton.classList.remove("off");
        micButton.textContent = "🎙";
    } else {
        micButton.classList.remove("on");
        micButton.classList.add("off");
        micButton.textContent = "✕";
    }

    if (cameraEnabled) {
        cameraButton.classList.add("on");
        cameraButton.classList.remove("off");
        cameraButton.textContent = "◉";

        if (mediaStream) {
            cameraPlaceholder.style.display = "none";
        }
    } else {
        cameraButton.classList.remove("on");
        cameraButton.classList.add("off");
        cameraButton.textContent = "✕";
        cameraPlaceholder.style.display = "flex";
        cameraPlaceholder.innerHTML = `
            <div class="camera-placeholder-icon">◉</div>
            <span>Camera is off</span>
        `;
    }
}

function stopMedia() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
            track.stop();
        });
        mediaStream = null;
    }

    cameraVideo.srcObject = null;
}

stopButton.addEventListener("click", () => {
    if (interviewFinished) {
        return;
    }

    emergencyModal.classList.add("show");
    overlay.classList.add("show");
});

noButton.addEventListener("click", () => {
    emergencyModal.classList.remove("show");
    overlay.classList.remove("show");
});

yesButton.addEventListener("click", () => {
    emergencyModal.classList.remove("show");
    overlay.classList.remove("show");
    finishInterview(true);
});

function finishInterview(wasEmergency) {
    if (interviewFinished) {
        return;
    }

    interviewFinished = true;

    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    stopMedia();
    meetWindow.classList.add("hidden");
    stopButton.disabled = true;
    stopButton.textContent = wasEmergency ? "INTERVIEW STOPPED" : "INTERVIEW COMPLETED";
    liveText.textContent = wasEmergency ? "STOPPED" : "COMPLETED";
    aiStatus.textContent = wasEmergency ? "Interview stopped" : "Interview completed";
    dashboardLauncher.classList.add("show");
    calculatePerformance();
    showPerformanceDashboard();
}

function calculatePerformance() {
    const accuracy = Math.round((performance.correct / performance.total) * 100);
    performance.accuracy = accuracy;
    performance.score = Math.round((accuracy + 85) / 2);

    document.getElementById("scoreValue").textContent = `${performance.score}%`;
    document.getElementById("scoreCircle").style.setProperty("--score", `${performance.score}%`);
    document.getElementById("correctStat").textContent = `${performance.correct} / ${performance.total}`;
    document.getElementById("totalStat").textContent = performance.total;
    document.getElementById("accuracyStat").textContent = `${performance.accuracy}%`;

    const elapsedSeconds = Math.floor((Date.now() - interviewStartTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
    const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");

    document.getElementById("timeTakenStat").textContent = `${minutes}:${seconds}`;
}

function showPerformanceDashboard() {
    if (dashboardVisible) {
        return;
    }

    dashboardVisible = true;
    performanceDashboard.classList.add("show");
}

closeDashboard.addEventListener("click", () => {
    performanceDashboard.classList.remove("show");
    dashboardVisible = false;
});

dashboardLauncher.addEventListener("click", () => {
    const dashboardWindow = window.open("", "_blank", "width=1200,height=800,resizable=yes,scrollbars=yes");

    if (!dashboardWindow) {
        alert("Please allow pop-ups for this website to open the Dashboard.");
        return;
    }

    dashboardWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>SARATHI Dashboard</title>
<style>
body {
    margin: 0;
    min-height: 100vh;
    background: #050505;
    color: white;
    font-family: Arial, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
}
.card {
    width: 500px;
    max-width: 85%;
    padding: 40px;
    text-align: center;
    background: #0d0d0d;
    border: 1px solid rgba(37,232,121,0.4);
    border-radius: 15px;
    box-shadow: 0 0 40px rgba(37,232,121,0.08);
}
.icon {
    width: 65px;
    height: 65px;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(37,232,121,0.1);
    color: #25e879;
    font-size: 30px;
}
h1 {
    margin-bottom: 10px;
}
p {
    color: #888;
    line-height: 1.7;
}
.orange {
    color: #ff6a00;
}
</style>
</head>
<body>
<div class="card">
    <div class="icon">✓</div>
    <h1>SARATHI <span class="orange">Dashboard</span></h1>
    <p>Your detailed performance dashboard will be connected here.</p>
    <p>This is the placeholder window. You can replace this content later with your complete dashboard.</p>
</div>
</body>
</html>
    `);

    dashboardWindow.document.close();
});

clearButton.addEventListener("click", () => {
    codeInput.value = "";
    interviewState.voiceAnswer = "";
    updateLineNumbers();
});

function setQuestionText(questionText) {
    interviewState.currentQuestion = questionText;
    const questionEl = document.querySelector(".question-text");
    if (questionEl) {
        questionEl.textContent = questionText;
    }
}

function updateQuestionNumber(index, maxQuestions) {
    const questionNumberEl = document.querySelector(".question-number");
    if (questionNumberEl) {
        const safeIndex = Math.max(1, index + 1);
        questionNumberEl.textContent = `Question ${String(safeIndex).padStart(2, "0")} / ${maxQuestions}`;
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function speakText(text) {
    if (!text || !("speechSynthesis" in window)) {
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        aiStatus.textContent = "Speech recognition unavailable";
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
        aiStatus.textContent = "Listening...";
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join(" ");

        interviewState.voiceAnswer = transcript;
        codeInput.value = transcript;
        updateLineNumbers();
        aiStatus.textContent = "Voice answer captured";
    };

    recognition.onerror = () => {
        aiStatus.textContent = "Voice input failed";
    };

    recognition.onend = () => {
        if (micEnabled) {
            aiStatus.textContent = "AI interviewer ready";
        }
    };

    recognition.start();
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

async function startInterviewSession() {
    try {
        const data = await fetchJson("/api/interview/start", {
            method: "POST",
            body: JSON.stringify({ sessionId: interviewState.sessionId || undefined })
        });

        interviewState.sessionId = data.sessionId;
        interviewState.currentQuestionIndex = Number(data.questionIndex || 0);
        interviewState.maxQuestions = Number(data.maxQuestions || 10);
        setQuestionText(data.question);
        updateQuestionNumber(interviewState.currentQuestionIndex, interviewState.maxQuestions);
        aiStatus.textContent = "AI interviewer ready";
        speakText(`${data.intro} ${data.question}`);
    } catch (error) {
        console.error("Could not start the AI interview:", error);
        setQuestionText("The AI interviewer could not generate a question. Check the server/model configuration and reload to try again.");
        aiStatus.textContent = "AI interviewer unavailable";
    }
}

runButton.addEventListener("click", async () => {
    const payload = {
        sessionId: interviewState.sessionId,
        questionIndex: interviewState.currentQuestionIndex,
        question: interviewState.currentQuestion,
        language: languageSelect.value,
        code: codeInput.value
    };

    try {
        const data = await fetchJson("/api/interview/run-code", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const output = data.output || "No output";
        const judgeFeedback = data.judge && data.judge.feedback ? data.judge.feedback : "";

        terminalBody.innerHTML = `
            <span class="terminal-success">Execution output</span><br>
            ${escapeHtml(output)}
            ${judgeFeedback ? `<br><br><span class="terminal-success">AI review:</span><br>${escapeHtml(judgeFeedback)}` : ""}
        `;

        aiStatus.textContent = "Code executed";
    } catch (error) {
        terminalBody.innerHTML = `<span class="terminal-success">Execution failed</span><br>${escapeHtml(error.message)}`;
        aiStatus.textContent = "Execution error";
    }
});

submitButton.addEventListener("click", async () => {
    const payload = {
        sessionId: interviewState.sessionId,
        questionIndex: interviewState.currentQuestionIndex,
        answer: interviewState.voiceAnswer || codeInput.value || "",
        code: codeInput.value || ""
    };

    try {
        const data = await fetchJson("/api/interview/answer", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const feedback = data.feedback || data.message || "Good progress.";
        terminalBody.innerHTML = `
            <span class="terminal-success">Interviewer feedback</span><br>
            ${escapeHtml(feedback)}
        `;

        aiStatus.textContent = data.completed ? "Interview complete" : "Next question";
        speakText(feedback);

        if (data.completed) {
            liveText.textContent = "COMPLETED";
            finishInterview(false);
            return;
        }

        interviewState.currentQuestionIndex = Number(data.questionIndex || interviewState.currentQuestionIndex + 1);
        interviewState.voiceAnswer = "";
        updateQuestionNumber(interviewState.currentQuestionIndex, interviewState.maxQuestions);
        setQuestionText(data.nextQuestion || interviewState.currentQuestion);
        speakText(data.nextQuestion || interviewState.currentQuestion);
        codeInput.value = "";
        updateLineNumbers();
    } catch (error) {
        terminalBody.innerHTML = `<span class="terminal-success">Interview update failed</span><br>${escapeHtml(error.message)}`;
        aiStatus.textContent = "Update error";
    }
});

function updateLineNumbers() {
    const lines = codeInput.value.split("\n").length;
    let html = "";

    for (let i = 1; i <= lines; i++) {
        html += `${i}<br>`;
    }

    document.getElementById("lineNumbers").innerHTML = html;
}

codeInput.addEventListener("input", updateLineNumbers);

renderTimer();
updateLineNumbers();
startTimer();
startMedia();
startInterviewSession();

window.addEventListener("beforeunload", () => {
    stopMedia();

    if (timerInterval !== null) {
        clearInterval(timerInterval);
    }
});
import json
import os
import re
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from huggingface_hub import InferenceClient

load_dotenv(Path(__file__).with_name(".env"))

app = Flask(__name__)

MAX_QUESTIONS = 10

def read_model_config():
    model_file = Path(__file__).with_name("model.txt")
    config = {}
    if not model_file.exists():
        return config
    for line in model_file.read_text(encoding="utf-8").splitlines():
        if "=" in line:
            key, value = [part.strip() for part in line.split("=", 1)]
            config[key] = value.strip('"').strip("'")
    return config


MODEL_CONFIG = read_model_config()
HF_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")
INTERVIEWER_MODEL = MODEL_CONFIG.get("interviewer_chat_model", "openai/gpt-oss-120b")
CODE_MODEL = MODEL_CONFIG.get("code_execution_model", "zai-org/GLM-5.3")

interview_sessions = {}


def safe_json_extract(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise ValueError("No JSON payload found in LLM response")


def generate_interview_question(previous_questions=None):
    previous_questions = previous_questions or []
    previous_questions_text = "\n".join(f"- {question}" for question in previous_questions)
    prompt = f"""
You are a DSA interviewer conducting a basic-to-intermediate technical interview.
Write exactly one clear, self-contained coding question. Do not include an answer,
an introduction, numbering, or any text other than the question itself.
Do not repeat or rephrase any previous question:
{previous_questions_text or "- None"}
"""
    question = llm_chat(prompt, model_name=INTERVIEWER_MODEL, temperature=0.8, max_tokens=160)
    if not question:
        raise RuntimeError("The interviewer chat model did not return a question.")
    question = question.strip().strip('"').strip()
    if not question:
        raise RuntimeError("The interviewer chat model returned an empty question.")
    return question


def llm_chat(prompt, model_name=INTERVIEWER_MODEL, temperature=0.7, max_tokens=300):
    if not HF_TOKEN:
        return ""
    try:
        client = InferenceClient(model=model_name, token=HF_TOKEN)
        response = client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        content = response.choices[0].message.content
        return content.strip()
    except Exception as exc:
        print(f"LLM call failed for {model_name}: {exc}")
        return ""


def evaluate_code_with_model(question, code, output, error_text):
    prompt = f"""
You are a senior DSA interviewer. Review the provided coding attempt.

Problem: {question}
Candidate code:
{code}

Runtime output:
{output}

Error output:
{error_text}

Return ONLY valid JSON with fields:
{{"score": 0-10, "verdict": "pass|needs_improvement|fail", "feedback": "..."}}
"""
    result = llm_chat(prompt, model_name=CODE_MODEL, temperature=0.4, max_tokens=220)
    if not result:
        return {"score": 7, "verdict": "needs_improvement", "feedback": "Code executed; review logic carefully and optimize clarity."}
    try:
        data = safe_json_extract(result)
        return {
            "score": int(data.get("score", 7)),
            "verdict": data.get("verdict", "needs_improvement"),
            "feedback": data.get("feedback", "Review your logic and try again.")
        }
    except Exception:
        return {"score": 7, "verdict": "needs_improvement", "feedback": "The code needs a deeper correctness check and cleaner logic."}


def run_python_code(code):
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as file:
        file.write(code)
        temp_path = file.name
    try:
        result = subprocess.run([sys.executable, temp_path], capture_output=True, text=True, timeout=10)
        return {
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "exit_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "Code execution timed out after 10 seconds.",
            "exit_code": -1,
        }
    finally:
        try:
            os.unlink(temp_path)
        except OSError:
            pass


def get_session(session_id):
    if session_id not in interview_sessions:
        interview_sessions[session_id] = {
            "started": False,
            "question_index": 0,
            "current_question": "",
            "history": [],
            "score": 0,
            "completed": False,
        }
    return interview_sessions[session_id]


@app.route("/")
def index():
    return send_file("index.html")


@app.route("/app.js")
def serve_js():
    return send_file("app.js", mimetype="application/javascript")


@app.route("/style.css")
def serve_css():
    return send_file("style.css", mimetype="text/css")


@app.route("/api/interview/start", methods=["POST"])
def start_interview():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("sessionId") or str(uuid.uuid4())
    opening_prompt = """
You are a calm, sharp DSA interviewer. Begin a basic-to-intermediate round 1
interview with a brief welcome and ask one original coding question.
Return ONLY valid JSON with string fields "intro" and "question".
"""
    opening_text = llm_chat(opening_prompt, temperature=0.8, max_tokens=250)
    if not opening_text:
        return jsonify({"error": "The interviewer chat model is unavailable; no question was generated."}), 503
    try:
        opening = safe_json_extract(opening_text)
        intro_text = opening.get("intro", "").strip()
        first_question = opening.get("question", "").strip()
        if not intro_text or not first_question:
            raise ValueError("The interviewer response must include an intro and question.")
    except (ValueError, AttributeError, TypeError) as exc:
        app.logger.error("Interviewer chat model returned an invalid opening: %s", exc)
        return jsonify({"error": "The interviewer chat model returned an invalid opening; please try again."}), 502

    state = get_session(session_id)
    state["started"] = True
    state["question_index"] = 0
    state["current_question"] = first_question
    state["score"] = 0
    state["history"] = []
    state["completed"] = False

    return jsonify({
        "sessionId": session_id,
        "intro": intro_text,
        "question": first_question,
        "questionIndex": 0,
        "maxQuestions": MAX_QUESTIONS,
        "totalQuestions": MAX_QUESTIONS,
    })


@app.route("/api/interview/run-code", methods=["POST"])
def run_code_endpoint():
    payload = request.get_json(silent=True) or {}
    code = payload.get("code", "")
    question = payload.get("question", "")
    language = (payload.get("language") or "Python").lower()

    if not code.strip():
        return jsonify({"output": "No code entered.", "error": "", "judge": {"score": 0, "verdict": "fail", "feedback": "Please write a solution before running."}})

    if language not in ["python", "python3", "py"]:
        return jsonify({"output": "This demo executes Python code only.", "error": "", "judge": {"score": 0, "verdict": "fail", "feedback": "Select Python as the language for execution."}})

    execution = run_python_code(code)
    final_output = execution["stdout"] or execution["stderr"] or "No output."
    judge = evaluate_code_with_model(question, code, execution["stdout"], execution["stderr"])

    return jsonify({
        "output": final_output,
        "error": execution["stderr"],
        "exitCode": execution["exit_code"],
        "judge": judge,
    })


@app.route("/api/interview/answer", methods=["POST"])
def submit_answer():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("sessionId")
    if not session_id:
        return jsonify({"error": "Missing sessionId"}), 400

    state = get_session(session_id)
    question_index = state["question_index"]
    answer = payload.get("answer", "")
    code = payload.get("code", "")
    question = state["current_question"]
    if not state["started"] or not question:
        return jsonify({"error": "The interview has not started; request a chat-generated question first."}), 409

    prompt = f"""
You are a strict but fair Round 1 DSA interviewer.

Question: {question}
Candidate answer: {answer}
Candidate code: {code}

Judge the candidate as a real interviewer:
- Be concise but practical.
- Score from 0 to 10.
- Mention if the solution is correct or partially correct.
- Decide whether the interview should continue.
- If the interview should end, say completed.

Return ONLY valid JSON with keys:
{{"score": 0-10, "status": "pass|needs_improvement|fail|completed", "feedback": "...", "should_continue": true|false, "message": "..."}}
"""

    judge_text = llm_chat(prompt, temperature=0.7, max_tokens=350)
    if not judge_text:
        judge_data = {
            "score": 7,
            "status": "needs_improvement",
            "feedback": "Your answer shows a reasonable attempt. Strengthen the edge cases and be more explicit about time complexity.",
            "should_continue": True,
            "message": "Keep going and improve your reasoning."
        }
    else:
        try:
            judge_data = safe_json_extract(judge_text)
        except Exception:
            judge_data = {
                "score": 6,
                "status": "needs_improvement",
                "feedback": "The logic is close, but improve clarity and edge-case handling.",
                "should_continue": True,
                "message": "Try to make the solution more robust."
            }

    next_index = question_index + 1
    if question_index >= MAX_QUESTIONS - 1 or not judge_data.get("should_continue", True):
        state["history"].append({
            "question_index": question_index,
            "question": question,
            "answer": answer,
            "code": code,
            "judge": judge_data,
        })
        state["score"] += int(judge_data.get("score", 0))
        state["completed"] = True
        summary_prompt = f"You are the interviewer. Summarize the candidate's performance across {len(state['history'])} DSA questions and provide a clear final verdict. Return JSON with keys: {{{{\"summary\": \"...\", \"final_score\": 0-100}}}}"
        summary_text = llm_chat(summary_prompt, temperature=0.6, max_tokens=250)
        summary_data = {"summary": "Interview completed successfully. Review your fundamentals and optimize your explanations.", "final_score": min(100, max(0, state["score"]))}
        try:
            summary_data = safe_json_extract(summary_text) if summary_text else summary_data
        except Exception:
            pass
        return jsonify({
            "status": "completed",
            "completed": True,
            "summary": summary_data.get("summary", "Interview complete."),
            "finalScore": summary_data.get("final_score", min(100, max(0, state["score"]))),
            "message": judge_data.get("message", "Interview complete."),
            "questionIndex": question_index,
        })

    try:
        next_question = generate_interview_question(
            [item["question"] for item in state["history"]] + [question]
        )
    except RuntimeError as exc:
        app.logger.error("Could not generate next interview question: %s", exc)
        return jsonify({"error": "The interviewer chat model could not generate the next question; please try again."}), 503

    state["history"].append({
        "question_index": question_index,
        "question": question,
        "answer": answer,
        "code": code,
        "judge": judge_data,
    })
    state["score"] += int(judge_data.get("score", 0))
    state["question_index"] = next_index
    state["current_question"] = next_question

    return jsonify({
        "status": judge_data.get("status", "needs_improvement"),
        "completed": False,
        "feedback": judge_data.get("feedback", "Keep going."),
        "message": judge_data.get("message", "Good progress. Let's continue."),
        "nextQuestion": next_question,
        "questionIndex": next_index,
        "maxQuestions": MAX_QUESTIONS,
    })


@app.route("/api/interview/status", methods=["GET"])
def interview_status():
    session_id = request.args.get("sessionId")
    if not session_id:
        return jsonify({"error": "Missing sessionId"}), 400
    state = get_session(session_id)
    return jsonify({
        "started": state.get("started", False),
        "completed": state.get("completed", False),
        "questionIndex": state.get("question_index", 0),
        "maxQuestions": MAX_QUESTIONS,
        "score": state.get("score", 0),
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

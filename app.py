from flask import Flask, jsonify, render_template, request
import requests

app = Flask(__name__)

APP_VERSION = "1.2.0"

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_TAGS_URL = "http://localhost:11434/api/tags"
MODEL = "qwen2.5-coder:3b"

PROMPT_TEMPLATE = (
    "You are LazyCode AI, a friendly code-explainer for developers and students. "
    "Explain the following {language} code so that a beginner can understand it "
    "accurately and quickly.\n\n"
    "Answer in plain Markdown using exactly these sections:\n"
    "## Summary\n"
    "One to three sentences describing what the code does.\n"
    "## How it works\n"
    "A numbered, step-by-step walkthrough of the important lines.\n"
    "## Expected output\n"
    "What the code prints or returns. If it produces no direct output, say so.\n"
    "## Key concepts\n"
    "A short bullet list of the important programming ideas used.\n\n"
    "Rules: keep it concise and technically accurate. Do not rewrite the whole "
    "program; only quote tiny snippets inside single backticks.\n\n"
    "Code:\n"
    "```{language}\n"
    "{code}\n"
    "```"
)


@app.route("/")
def home():
    return render_template("index.html", version=APP_VERSION, model=MODEL)


@app.route("/api/status")
def status():
    """Report the real Ollama connection state (never faked)."""
    payload = {
        "connected": False,
        "model": MODEL,
        "model_available": False,
        "version": APP_VERSION,
    }

    try:
        response = requests.get(OLLAMA_TAGS_URL, timeout=3)
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as error:
        app.logger.warning("Ollama status check failed: %s", error)
        payload["error"] = "Ollama is not reachable on localhost:11434."
        return jsonify(payload)

    models = [
        entry.get("name", "")
        for entry in data.get("models", [])
        if isinstance(entry, dict)
    ]

    base_model = MODEL.split(":")[0]
    payload["connected"] = True
    payload["model_available"] = any(
        name == MODEL or name.split(":")[0] == base_model for name in models
    )

    return jsonify(payload)


@app.route("/explain", methods=["POST"])
def explain():
    data = request.get_json(silent=True) or {}
    code = str(data.get("code") or "").strip()
    language = str(data.get("language") or "").strip()[:40]

    if not code:
        return jsonify({
            "error": "Please enter some code."
        }), 400

    prompt = PROMPT_TEMPLATE.format(
        language=language or "this",
        code=code,
    )

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
            },
            timeout=120,
        )

        response.raise_for_status()
        result = response.json()
        explanation = (result.get("response") or "").strip()

        if not explanation:
            return jsonify({
                "error": "The model returned an empty explanation. Please try again."
            }), 502

        return jsonify({
            "explanation": explanation,
            "model": MODEL,
            "language": language or "text",
        })

    except requests.exceptions.Timeout:
        app.logger.error("Ollama request timed out")
        return jsonify({
            "error": (
                "Ollama took too long to respond. "
                "Try a shorter snippet or check that the model is loaded."
            )
        }), 504

    except requests.RequestException as error:
        app.logger.error("Ollama request failed: %s", error)

        return jsonify({
            "error": (
                "Could not contact Ollama. "
                "Make sure Ollama is running and the model is available."
            )
        }), 502

    except (KeyError, TypeError, ValueError) as error:
        app.logger.error("Unexpected Ollama response: %s", error)

        return jsonify({
            "error": "Ollama returned an unexpected response format."
        }), 502


if __name__ == "__main__":
    app.run(debug=True, port=5000)

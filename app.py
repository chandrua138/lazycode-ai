from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen2.5-coder:3b"


@app.route("/")
def home():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LazyCode AI</title>

        <style>
            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                padding: 30px 16px;
                background: #111827;
                color: #f9fafb;
                font-family: Arial, sans-serif;
            }

            main {
                max-width: 800px;
                margin: 40px auto;
            }

            h1 {
                color: #a78bfa;
            }

            .subtitle {
                color: #9ca3af;
                line-height: 1.6;
            }

            textarea {
                width: 100%;
                min-height: 220px;
                margin: 16px 0;
                padding: 16px;
                background: #1f2937;
                color: #f9fafb;
                border: 1px solid #4b5563;
                border-radius: 10px;
                font: 15px monospace;
                resize: vertical;
            }

            button {
                padding: 13px 22px;
                background: #8b5cf6;
                color: white;
                border: 0;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
            }

            button:disabled {
                opacity: 0.6;
                cursor: wait;
            }

            #result {
                margin-top: 24px;
                padding: 20px;
                background: #1f2937;
                border-radius: 10px;
                line-height: 1.7;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
            }

            .label {
                color: #c4b5fd;
            }

            #answer {
                overflow-wrap: anywhere;
            }
        </style>
    </head>

    <body>
        <main>
            <h1>LazyCode AI</h1>

            <p class="subtitle">
                Understand code easily with your local AI.
                Paste your code below and let AI explain it.
            </p>

            <h3>Your code</h3>

            <textarea id="code" placeholder="Paste your code here...">for i in range(3):
    print(i)</textarea>

            <button id="explainBtn" onclick="explainCode()">
                Explain Code
            </button>

            <div id="result" hidden>
                <strong class="label">AI Explanation</strong>
                <p id="answer"></p>
            </div>
        </main>

        <script>
            async function explainCode() {
                const code = document.getElementById("code").value;
                const button = document.getElementById("explainBtn");
                const result = document.getElementById("result");
                const answer = document.getElementById("answer");

                if (!code.trim()) {
                    alert("Please enter some code first.");
                    return;
                }

                button.disabled = true;
                button.textContent = "Thinking...";
                result.hidden = false;
                answer.textContent = "AI is explaining your code...";

                try {
                    const response = await fetch("/explain", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            code: code
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            data.error || "Request failed."
                        );
                    }

                    answer.textContent = data.explanation;

                } catch (error) {
                    answer.textContent = "Error: " + error.message;

                } finally {
                    button.disabled = false;
                    button.textContent = "Explain Code";
                }
            }
        </script>
    </body>
    </html>
    """


@app.route("/explain", methods=["POST"])
def explain():
    data = request.get_json(silent=True) or {}
    code = data.get("code", "").strip()

    if not code:
        return jsonify({
            "error": "Please enter some code."
        }), 400

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "prompt": (
                    "Explain this code in very simple English. "
                    "Describe how it works and its output.\n\n"
                    f"Code:\n{code}"
                ),
                "stream": False,
            },
            timeout=120,
        )

        response.raise_for_status()
        result = response.json()

        return jsonify({
            "explanation": result["response"]
        })

    except requests.RequestException as error:
        app.logger.error("Ollama request failed: %s", error)

        return jsonify({
            "error": (
                "Could not contact Ollama. "
                "Make sure Ollama is running and the model is available."
            )
        }), 502


if __name__ == "__main__":
    app.run(debug=True, port=5000)

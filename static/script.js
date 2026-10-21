/* ============================================================
   LazyCode AI — frontend application
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- Constants ---------------- */

  var HISTORY_KEY = "lazycode.history.v1";
  var SETTINGS_KEY = "lazycode.settings.v1";
  var MAX_HISTORY = 30;
  var REQUEST_TIMEOUT_MS = 130000; // backend allows Ollama 120s
  var STATUS_POLL_MS = 30000;
  var MAX_CODE_CHARS = 60000;

  var LANGUAGE_MODES = {
    python: "python",
    javascript: "javascript",
    typescript: "javascript",
    json: "javascript",
    java: "text/x-java",
    c: "text/x-csrc",
    cpp: "text/x-c++src",
    csharp: "text/x-csharp",
    go: "go",
    rust: "rust",
    ruby: "ruby",
    php: "application/x-httpd-php",
    html: "htmlmixed",
    css: "css",
    sql: "sql",
    yaml: "yaml",
    shell: "text/x-sh",
    markdown: "markdown"
  };

  var VIEW_TITLES = {
    explainer: "Code Explainer",
    chat: "AI Chat Helper",
    templates: "Code Templates",
    projects: "My Projects",
    history: "Explanation History",
    settings: "Settings",
    about: "About LazyCode AI"
  };

  var EXAMPLES = [
    {
      language: "python",
      code: "def greet(name):\n    message = f\"Hello, {name}!\"\n    return message\n\n\nnames = [\"Ada\", \"Grace\", \"Linus\"]\nfor person in names:\n    print(greet(person))\n"
    },
    {
      language: "python",
      code: "numbers = [4, 2, 9, 7, 2, 9, 1]\nunique = sorted(set(numbers))\n\nlargest = max(numbers)\naverage = sum(numbers) / len(numbers)\n\nprint(\"Sorted unique:\", unique)\nprint(\"Largest:\", largest)\nprint(\"Average:\", round(average, 2))\n"
    },
    {
      language: "javascript",
      code: "const orders = [\n  { customer: \"Ada\", total: 120 },\n  { customer: \"Grace\", total: 45 },\n  { customer: \"Ada\", total: 80 },\n];\n\nconst byCustomer = orders.reduce((acc, order) => {\n  acc[order.customer] = (acc[order.customer] || 0) + order.total;\n  return acc;\n}, {});\n\nconsole.log(byCustomer);\n"
    }
  ];

  var TEMPLATES = [
    {
      title: "Loop with running total",
      language: "python",
      description: "A for loop that accumulates a sum and prints it at every step.",
      code: "total = 0\nfor number in range(1, 6):\n    total += number\n    print(f\"{number} -> running total: {total}\")\n\nprint(\"Final total:\", total)\n"
    },
    {
      title: "FizzBuzz",
      language: "python",
      description: "The classic interview puzzle with conditionals and the modulo operator.",
      code: "for n in range(1, 16):\n    if n % 15 == 0:\n        print(\"FizzBuzz\")\n    elif n % 3 == 0:\n        print(\"Fizz\")\n    elif n % 5 == 0:\n        print(\"Buzz\")\n    else:\n        print(n)\n"
    },
    {
      title: "Recursive factorial",
      language: "python",
      description: "Recursion, base cases and the call stack in one small function.",
      code: "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\n\nfor value in range(1, 8):\n    print(value, \"->\", factorial(value))\n"
    },
    {
      title: "Class and objects",
      language: "python",
      description: "A tiny class showing __init__, methods and instance state.",
      code: "class BankAccount:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance += amount\n        return self.balance\n\n\naccount = BankAccount(\"Ada\", 100)\naccount.deposit(50)\nprint(account.owner, account.balance)\n"
    },
    {
      title: "List comprehension",
      language: "python",
      description: "Filtering and transforming data with a one-line comprehension.",
      code: "scores = [88, 42, 95, 61, 77, 50]\npassed = [s for s in scores if s >= 60]\ngraded = {s: \"pass\" if s >= 60 else \"fail\" for s in scores}\n\nprint(passed)\nprint(graded)\n"
    },
    {
      title: "Async fetch with error handling",
      language: "javascript",
      description: "async/await, try/catch and checking a response status code.",
      code: "async function getUser(id) {\n  try {\n    const response = await fetch(`https://api.example.com/users/${id}`);\n    if (!response.ok) {\n      throw new Error(`HTTP ${response.status}`);\n    }\n    return await response.json();\n  } catch (error) {\n    console.error(\"Failed to load user:\", error.message);\n  }\n}\n\ngetUser(1);\n"
    },
    {
      title: "Array methods chain",
      language: "javascript",
      description: "map, filter and reduce working together on a data set.",
      code: "const users = [\n  { name: \"Ada\", age: 36, active: true },\n  { name: \"Grace\", age: 45, active: false },\n  { name: \"Linus\", age: 29, active: true },\n];\n\nconst activeNames = users\n  .filter((user) => user.active)\n  .map((user) => user.name);\n\nconst averageAge = users.reduce((sum, u) => sum + u.age, 0) / users.length;\n\nconsole.log(activeNames, averageAge);\n"
    },
    {
      title: "Group and count with SQL",
      language: "sql",
      description: "An aggregation query that groups rows and counts them.",
      code: "SELECT\n    customer_id,\n    COUNT(*) AS order_count,\n    SUM(total) AS lifetime_value\nFROM orders\nWHERE created_at >= '2024-01-01'\nGROUP BY customer_id\nHAVING COUNT(*) > 2\nORDER BY lifetime_value DESC\nLIMIT 10;\n"
    }
  ];

  /* ---------------- Tiny DOM helpers ---------------- */

  function $(selector) {
    return document.querySelector(selector);
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === "class") {
          node.className = attrs[key];
        } else {
          node.setAttribute(key, attrs[key]);
        }
      });
    }
    for (var i = 2; i < arguments.length; i += 1) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      node.appendChild(
        typeof child === "string" ? document.createTextNode(child) : child
      );
    }
    return node;
  }

  function icon(name, extraClass) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon" + (extraClass ? " " + extraClass : ""));
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-" + name);
    svg.appendChild(use);
    return svg;
  }

  /* ---------------- App state ---------------- */

  var state = {
    busy: false,
    view: "explainer",
    history: [],
    searchQuery: "",
    storageOk: true,
    lastExplanation: null,
    exampleIndex: 0,
    confirmAction: null,
    settings: {
      defaultLanguage: "python",
      indent: "4"
    }
  };

  /* ---------------- Elements ---------------- */

  var editorEl, editor;

  function cacheElements() {
    editorEl = {
      sidebar: $("#sidebar"),
      sidebarClose: $("#sidebarClose"),
      sidebarScrim: $("#sidebarScrim"),
      menuBtn: $("#menuBtn"),
      sectionTitle: $("#sectionTitle"),
      navItems: document.querySelectorAll(".nav-item[data-view]"),
      gotoButtons: document.querySelectorAll("[data-goto]"),
      connPill: $("#connPill"),
      connText: $("#connText"),
      modelPill: $("#modelPill"),
      sidebarDot: $("#sidebarStatus .status-dot"),
      sidebarModel: $("#sidebarStatus .model-card-name"),
      historyToggleBtn: $("#historyToggleBtn"),
      historyCloseBtn: $("#historyCloseBtn"),
      historyScrim: $("#historyScrim"),
      historyPanel: $("#historyPanel"),
      settingsBtn: $("#settingsBtn"),
      historySearch: $("#historySearch"),
      historySearchDrawer: $("#historySearchDrawer"),
      historyList: $("#historyList"),
      historyEmpty: $("#historyEmpty"),
      historyStorageNote: $("#historyStorageNote"),
      navHistoryCount: $("#navHistoryCount"),
      clearHistoryBtn: $("#clearHistoryBtn"),
      clearHistoryPageBtn: $("#clearHistoryPageBtn"),
      clearHistorySettingsBtn: $("#clearHistorySettingsBtn"),
      historyPageList: $("#historyPageList"),
      historyPageEmpty: $("#historyPageEmpty"),
      settingsConn: $("#settingsConn"),
      settingsModel: $("#settingsModel"),
      settingsHistoryCount: $("#settingsHistoryCount"),
      settingsHistoryLimit: $("#settingsHistoryLimit"),
      settingsStorage: $("#settingsStorage"),
      recheckBtn: $("#recheckBtn"),
      defaultLanguage: $("#defaultLanguage"),
      indentSize: $("#indentSize"),
      templateGrid: $("#templateGrid"),
      codeInput: $("#codeInput"),
      editorWrap: $("#editorWrap"),
      languageSelect: $("#languageSelect"),
      exampleBtn: $("#exampleBtn"),
      clearBtn: $("#clearBtn"),
      explainBtn: $("#explainBtn"),
      codeMeta: $("#codeMeta"),
      codeError: $("#codeError"),
      responsePanel: $("#responsePanel"),
      chatLog: $("#chatLog"),
      copyResponseBtn: $("#copyResponseBtn"),
      modalScrim: $("#modalScrim"),
      modalTitle: $("#modalTitle"),
      modalBody: $("#modalBody"),
      modalCancelBtn: $("#modalCancelBtn"),
      modalConfirmBtn: $("#modalConfirmBtn"),
      toast: $("#toast"),
      modelPillName: document.body.getAttribute("data-model")
    };
  }

  /* ---------------- Storage ---------------- */

  function loadJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      if (!state.storageOk) {
        state.storageOk = true;
        renderStorageNote();
      }
      return true;
    } catch (error) {
      state.storageOk = false;
      renderStorageNote();
      return false;
    }
  }

  function loadSettings() {
    var stored = loadJSON(SETTINGS_KEY, null);
    if (stored && typeof stored === "object") {
      if (typeof stored.defaultLanguage === "string" &&
          LANGUAGE_MODES[stored.defaultLanguage]) {
        state.settings.defaultLanguage = stored.defaultLanguage;
      }
      if (stored.indent === "2" || stored.indent === "4" || stored.indent === "tab") {
        state.settings.indent = stored.indent;
      }
    }
  }

  function persistSettings() {
    saveJSON(SETTINGS_KEY, state.settings);
  }

  function loadHistory() {
    var stored = loadJSON(HISTORY_KEY, []);
    state.history = Array.isArray(stored)
      ? stored.filter(function (entry) {
          return entry && typeof entry.code === "string" &&
            typeof entry.explanation === "string";
        })
      : [];
  }

  function persistHistory() {
    saveJSON(HISTORY_KEY, state.history);
  }

  /* ---------------- Time & text utils ---------------- */

  function formatRelativeTime(ts) {
    var diff = Date.now() - ts;
    if (diff < 0) diff = 0;
    var minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return minutes + "m ago";
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    var days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return days + "d ago";
    try {
      return new Date(ts).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
      });
    } catch (error) {
      return new Date(ts).toDateString();
    }
  }

  function firstMeaningfulLine(code) {
    var lines = String(code).split("\n");
    for (var i = 0; i < lines.length; i += 1) {
      var trimmed = lines[i].trim();
      if (trimmed) return trimmed.length > 90 ? trimmed.slice(0, 90) + "…" : trimmed;
    }
    return "(empty)";
  }

  function summarizeText(text, limit) {
    var clean = String(text)
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#*`_>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (clean.length <= (limit || 120)) return clean;
    return clean.slice(0, limit || 120).replace(/\s+\S*$/, "") + "…";
  }

  function languageLabel(value) {
    var option = editorEl.languageSelect.querySelector(
      'option[value="' + value + '"]'
    );
    return option ? option.textContent : "Text";
  }

  /* ---------------- Safe Markdown-ish renderer ---------------- */

  function renderInline(text) {
    var fragment = document.createDocumentFragment();
    var pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(https?:\/\/[^\s)]+)/g;
    var lastIndex = 0;
    var match;

    function appendSafeLink(url) {
      var anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = url;
      fragment.appendChild(anchor);
    }

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        );
      }
      var token = match[0];
      if (token.charAt(0) === "`") {
        fragment.appendChild(el("code", { class: "inline-code" }, token.slice(1, -1)));
      } else if (token.indexOf("**") === 0) {
        fragment.appendChild(el("strong", null, token.slice(2, -2)));
      } else if (token.charAt(0) === "*") {
        fragment.appendChild(el("em", null, token.slice(1, -1)));
      } else {
        appendSafeLink(token);
      }
      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    return fragment;
  }

  function classifySection(title) {
    var lower = title.toLowerCase();
    if (/summar|overview|what (?:it|this|the code) does|tl;?dr|intro/.test(lower)) {
      return "summary";
    }
    if (/how it works|step|walkthrough|explan|breakdown|line.by.line/.test(lower)) {
      return "steps";
    }
    if (/expected output|output|result|returns/.test(lower)) {
      return "output";
    }
    if (/concept|keyword|topic|terminolog/.test(lower)) {
      return "concepts";
    }
    return null;
  }

  function createCodeBlock(code, lang) {
    var head = el(
      "div",
      { class: "code-block-head" },
      el("span", { class: "code-block-lang" }, lang || "code")
    );
    var copyBtn = el(
      "button",
      { class: "btn btn-ghost btn-sm", type: "button", title: "Copy code" },
      icon("copy"),
      el("span", null, "Copy")
    );
    head.appendChild(copyBtn);

    var pre = el("pre", null, el("code", null, code));
    var block = el("div", { class: "code-block" }, head, pre);
    copyBtn.addEventListener("click", function () {
      copyText(code, copyBtn, "Copy");
    });
    return block;
  }

  function createOutputBlock(text) {
    var head = el(
      "div",
      { class: "output-block-label" },
      icon("arrow-right"),
      el("span", null, "Expected output")
    );
    var pre = el("pre", null, el("code", null, text));
    return el("div", { class: "output-block" }, head, pre);
  }

  function createChips(items) {
    var chips = el("div", { class: "concept-chips" });
    items.forEach(function (item) {
      chips.appendChild(el("span", null, item));
    });
    return chips;
  }

  function renderMarkdown(text) {
    var fragment = document.createDocumentFragment();
    var lines = String(text).replace(/\r\n?/g, "\n").split("\n");
    var section = null;
    var i = 0;

    function flushList(ordered, items) {
      if (!items.length) return;
      // Key-concept bullets look better as chips
      if (section === "concepts" && !ordered &&
          items.every(function (item) { return item.length <= 42; })) {
        fragment.appendChild(createChips(items));
        items.length = 0;
        return;
      }
      var list = document.createElement(ordered ? "ol" : "ul");
      items.forEach(function (item) {
        list.appendChild(el("li", null, renderInline(item)));
      });
      fragment.appendChild(list);
      items.length = 0;
    }

    function flushParagraph(buffer, preserveLines) {
      if (!buffer.length) return;
      if (preserveLines) {
        fragment.appendChild(createOutputBlock(buffer.join("\n")));
      } else {
        fragment.appendChild(el("p", null, renderInline(buffer.join(" "))));
      }
      buffer.length = 0;
    }

    var paragraphBuffer = [];
    var listOrdered = false;
    var listItems = [];

    while (i < lines.length) {
      var line = lines[i];

      // Fenced code block
      var fence = line.match(/^\s*```([\w+#-]*)\s*$/);
      if (fence) {
        flushParagraph(paragraphBuffer, section === "output");
        flushList(listOrdered, listItems);
        var lang = fence[1] || "";
        var buffer = [];
        i += 1;
        while (i < lines.length && !/^\s*```/.test(lines[i])) {
          buffer.push(lines[i]);
          i += 1;
        }
        i += 1; // closing fence (or end of text)
        var codeText = buffer.join("\n").replace(/\s+$/, "");
        fragment.appendChild(
          section === "output"
            ? createOutputBlock(codeText)
            : createCodeBlock(codeText, lang)
        );
        continue;
      }

      // Blank line
      if (!line.trim()) {
        flushParagraph(paragraphBuffer, section === "output");
        flushList(listOrdered, listItems);
        i += 1;
        continue;
      }

      // Markdown heading: ## Title
      var headingMatch = line.match(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/);
      // Bold-only line: **Title** (optionally with trailing colon)
      var strongHeading = !headingMatch &&
        line.match(/^\*\*([^*]{1,60})\*\*:?\s*$/);

      if (headingMatch || strongHeading) {
        flushParagraph(paragraphBuffer, section === "output");
        flushList(listOrdered, listItems);
        var title = (headingMatch ? headingMatch[1] : strongHeading[1])
          .replace(/[:：]\s*$/, "")
          .trim();
        section = classifySection(title) || section;
        var heading = el(
          title.length <= 60 ? "h3" : "h4",
          { class: "ai-heading" },
          title
        );
        fragment.appendChild(heading);
        i += 1;
        continue;
      }

      // Bold label followed by text on the same line: **Note:** text
      var strongLead = line.match(/^\*\*([^*]{1,50})\*\*:?\s+(.+)$/);
      if (strongLead) {
        flushList(listOrdered, listItems);
        var strongPar = el("p", null);
        strongPar.appendChild(el("strong", null, strongLead[1] + ": "));
        strongPar.appendChild(renderInline(strongLead[2]));
        fragment.appendChild(strongPar);
        i += 1;
        continue;
      }

      // Horizontal rule
      if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        flushParagraph(paragraphBuffer, section === "output");
        flushList(listOrdered, listItems);
        fragment.appendChild(el("hr"));
        i += 1;
        continue;
      }

      // List item
      var listItem = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (listItem) {
        flushParagraph(paragraphBuffer, section === "output");
        var ordered = /^\s*\d+[.)]\s+/.test(line);
        if (listItems.length && ordered !== listOrdered) {
          flushList(listOrdered, listItems);
        }
        listOrdered = ordered;
        listItems.push(listItem[1].trim());
        i += 1;
        continue;
      }

      // Indented code block (4 spaces / tab)
      if (/^(?: {4}|\t)/.test(line)) {
        flushParagraph(paragraphBuffer, section === "output");
        flushList(listOrdered, listItems);
        var indentBuffer = [];
        while (i < lines.length && /^(?: {4}|\t|\s*$)/.test(lines[i])) {
          if (lines[i].trim()) {
            indentBuffer.push(lines[i].replace(/^(?: {4}|\t)/, ""));
          } else {
            indentBuffer.push("");
          }
          i += 1;
        }
        fragment.appendChild(createCodeBlock(indentBuffer.join("\n"), "code"));
        continue;
      }

      // Regular text
      flushList(listOrdered, listItems);
      if (section === "concepts") {
        // Short comma-separated concepts become chips
        var conceptLine = line.trim().replace(/:$/, "");
        var parts = conceptLine.split(",").map(function (part) {
          return part.trim().replace(/^[-*•]\s*/, "");
        }).filter(function (part) {
          return part.length > 0 && part.length <= 42;
        });
        if (parts.length > 1 && parts.join(", ").length === conceptLine.length) {
          flushParagraph(paragraphBuffer, false);
          fragment.appendChild(createChips(parts));
          i += 1;
          continue;
        }
      }
      if (section === "output") {
        paragraphBuffer.push(line);
      } else {
        paragraphBuffer.push(line.trim());
      }
      i += 1;
    }

    flushParagraph(paragraphBuffer, section === "output");
    flushList(listOrdered, listItems);
    return fragment;
  }

  /* ---------------- Chat rendering ---------------- */

  function createUserMessage(code, language) {
    var content = el("div", { class: "msg-content" });
    content.appendChild(el("pre", null, el("code", null, code)));

    var body = el(
      "div",
      { class: "msg-body" },
      el(
        "div",
        { class: "msg-meta" },
        el("span", { class: "msg-author" }, "You"),
        el("span", { class: "lang-chip" }, languageLabel(language)),
        el("span", { class: "msg-sub" }, "submitted code")
      ),
      content
    );

    var copyBtn = el(
      "button",
      { class: "btn btn-soft btn-sm", type: "button" },
      icon("copy"),
      el("span", null, "Copy code")
    );
    copyBtn.addEventListener("click", function () {
      copyText(code, copyBtn, "Copy code");
    });
    body.appendChild(el("div", { class: "msg-actions" }, copyBtn));

    var avatar = el("span", { class: "msg-avatar" }, icon("user"));
    return el("div", { class: "msg msg-user" }, avatar, body);
  }

  function createAssistantMessage(text, options) {
    var body = el("div", { class: "msg-body" });
    body.appendChild(
      el(
        "div",
        { class: "msg-meta" },
        el("span", { class: "msg-author" }, "LazyCode AI"),
        el("span", { class: "msg-sub" }, options.modelName + " · " +
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
      )
    );

    var content = el("div", { class: "msg-content" });
    content.appendChild(renderMarkdown(text));
    body.appendChild(content);

    var actions = el("div", { class: "msg-actions" });
    var copyResponse = el(
      "button",
      { class: "btn btn-soft btn-sm", type: "button" },
      icon("copy"),
      el("span", null, "Copy response")
    );
    copyResponse.addEventListener("click", function () {
      copyText(text, copyResponse, "Copy response");
    });
    actions.appendChild(copyResponse);

    if (options.code) {
      var copyCode = el(
        "button",
        { class: "btn btn-soft btn-sm", type: "button" },
        icon("code"),
        el("span", null, "Copy your code")
      );
      copyCode.addEventListener("click", function () {
        copyText(options.code, copyCode, "Copy your code");
      });
      actions.appendChild(copyCode);
    }
    body.appendChild(actions);

    var avatar = el("span", { class: "msg-avatar" }, icon("sparkles"));
    return el("div", { class: "msg msg-ai" }, avatar, body);
  }

  function createThinkingMessage() {
    var dots = el(
      "span",
      { class: "thinking-dots" },
      el("span"),
      el("span"),
      el("span")
    );
    var body = el(
      "div",
      { class: "msg-body" },
      el(
        "div",
        { class: "msg-meta" },
        el("span", { class: "msg-author" }, "LazyCode AI"),
        el("span", { class: "msg-sub" }, "working locally…")
      ),
      el("div", { class: "msg-content" },
        el("span", { class: "thinking" }, dots,
          el("span", null, "Reading your code and drafting an explanation…")))
    );
    var avatar = el("span", { class: "msg-avatar" }, icon("sparkles"));
    return el("div", { class: "msg msg-ai", id: "thinkingMsg" }, avatar, body);
  }

  function createErrorMessage(title, detail) {
    var box = el(
      "div",
      { class: "msg-error" },
      icon("alert"),
      el("div", null,
        el("strong", null, title),
        el("span", null, detail))
    );
    var body = el(
      "div",
      { class: "msg-body" },
      el(
        "div",
        { class: "msg-meta" },
        el("span", { class: "msg-author" }, "LazyCode AI"),
        el("span", { class: "msg-sub" }, "request failed")
      ),
      box
    );
    var avatar = el("span", { class: "msg-avatar" }, icon("alert"));
    return el("div", { class: "msg msg-ai" }, avatar, body);
  }

  function appendMessage(node, scroll) {
    editorEl.chatLog.appendChild(node);
    if (scroll !== false) {
      node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /* ---------------- Clipboard ---------------- */

  function fallbackCopy(text) {
    var scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.appendChild(scratch);
    scratch.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(scratch);
    return ok;
  }

  function copyText(text, button, restLabel) {
    function done() {
      showToast("Copied to clipboard");
      if (button) {
        var label = button.querySelector("span");
        var original = restLabel || (label ? label.textContent : "");
        if (label) label.textContent = "Copied!";
        button.insertBefore(icon("check"), button.firstChild);
        setTimeout(function () {
          var check = button.querySelector("svg");
          if (check) check.remove();
          if (label) label.textContent = original;
        }, 1600);
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        if (fallbackCopy(text)) done();
        else showToast("Could not copy — please select and copy manually", "alert");
      });
    } else if (fallbackCopy(text)) {
      done();
    } else {
      showToast("Could not copy — please select and copy manually", "alert");
    }
  }

  /* ---------------- Toast ---------------- */

  var toastTimer = null;

  function showToast(message, iconName) {
    var toast = editorEl.toast;
    toast.textContent = "";
    toast.appendChild(icon(iconName || "check"));
    toast.appendChild(document.createTextNode(message));
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.hidden = true;
    }, 2200);
  }

  /* ---------------- Confirm modal ---------------- */

  function openConfirm(options) {
    state.confirmAction = options.onConfirm || null;
    editorEl.modalTitle.textContent = options.title || "Are you sure?";
    editorEl.modalBody.textContent = options.body || "";
    editorEl.modalConfirmBtn.textContent = options.confirmLabel || "Confirm";
    editorEl.modalScrim.hidden = false;
    editorEl.modalCancelBtn.focus();
  }

  function closeConfirm() {
    editorEl.modalScrim.hidden = true;
    state.confirmAction = null;
  }

  /* ---------------- Status ---------------- */

  function setConnState(connState, label) {
    var pill = editorEl.connPill;
    pill.setAttribute("data-state", connState);
    pill.querySelector(".status-dot").setAttribute("data-state", connState);
    editorEl.connText.textContent = label;

    var settingsPill = editorEl.settingsConn;
    if (settingsPill) {
      settingsPill.setAttribute("data-state", connState);
      settingsPill.querySelector(".status-dot").setAttribute("data-state", connState);
      settingsPill.querySelector("span:last-child").textContent = label;
    }

    var sidebarDot = editorEl.sidebarDot;
    sidebarDot.setAttribute("data-state", connState);
    var modelCard = $("#sidebarStatus");
    if (connState === "online") {
      modelCard.title = "Ollama connected · model ready";
    } else if (connState === "warning") {
      modelCard.title = "Ollama connected but the model is missing — run: ollama pull " +
        (editorEl.sidebarModel.textContent || "");
    } else if (connState === "offline") {
      modelCard.title = "Ollama is not reachable — start it with: ollama serve";
    }
  }

  function checkStatus() {
    setConnState("checking", "Checking…");
    return fetch("/api/status", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("status " + response.status);
        return response.json();
      })
      .then(function (data) {
        if (data.model) {
          editorEl.sidebarModel.textContent = data.model;
          editorEl.modelPill.textContent = data.model;
          if (editorEl.settingsModel) editorEl.settingsModel.textContent = data.model;
        }
        if (data.connected && data.model_available) {
          setConnState("online", "Connected");
        } else if (data.connected) {
          setConnState("warning", "Model missing");
        } else {
          setConnState("offline", "Offline");
        }
      })
      .catch(function () {
        setConnState("offline", "Offline");
      });
  }

  /* ---------------- Editor ---------------- */

  function initEditor() {
    var textarea = editorEl.codeInput;

    if (typeof window.CodeMirror === "undefined") {
      // Graceful fallback: plain textarea
      textarea.style.display = "block";
      return;
    }

    try {
      editor = window.CodeMirror.fromTextArea(textarea, {
        mode: "python",
        theme: "material-darker",
        lineNumbers: true,
        styleActiveLine: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: false,
        placeholder: "# Paste your code here…"
      });
    } catch (error) {
      editor = null;
      textarea.style.display = "block";
      if (window.console && console.warn) {
        console.warn("CodeMirror failed to start, using plain textarea.", error);
      }
      return;
    }

    editor.on("change", updateCodeMeta);
    applyIndentSetting();
  }

  function getCode() {
    return editor ? editor.getValue() : editorEl.codeInput.value;
  }

  function setCode(value) {
    if (editor) {
      editor.setValue(value);
      editor.focus();
      var lastLine = editor.lineCount();
      editor.setCursor({ line: lastLine - 1, ch: 0 });
    } else {
      editorEl.codeInput.value = value;
      editorEl.codeInput.focus();
    }
    updateCodeMeta();
    hideCodeError();
  }

  function setLanguage(value) {
    editorEl.languageSelect.value = value;
    if (editor) {
      editor.setOption("mode", LANGUAGE_MODES[value] || "text/plain");
    }
  }

  function applyIndentSetting() {
    var indent = state.settings.indent;
    var useTabs = indent === "tab";
    var size = useTabs ? 4 : parseInt(indent, 10) || 4;
    if (editor) {
      editor.setOption("indentWithTabs", useTabs);
      editor.setOption("indentUnit", size);
      editor.setOption("tabSize", size);
    }
  }

  function updateCodeMeta() {
    var code = getCode();
    var lines = code ? code.split("\n").length : 0;
    editorEl.codeMeta.textContent =
      lines + (lines === 1 ? " line · " : " lines · ") + code.length + " chars";
    if (code.trim()) hideCodeError();
  }

  function showCodeError(message) {
    editorEl.codeError.textContent = message;
    editorEl.codeError.hidden = false;
  }

  function hideCodeError() {
    editorEl.codeError.hidden = true;
    editorEl.codeError.textContent = "";
  }

  function setBusy(busy) {
    state.busy = busy;
    editorEl.explainBtn.disabled = busy;
    editorEl.explainBtn.classList.toggle("is-busy", busy);
    editorEl.explainBtn.querySelector(".btn-label").textContent =
      busy ? "Explaining…" : "Explain Code";
    editorEl.exampleBtn.disabled = busy;
    editorEl.clearBtn.disabled = busy;
  }

  /* ---------------- Explain flow ---------------- */

  function explainCode() {
    if (state.busy) return;

    var code = getCode();
    var language = editorEl.languageSelect.value;

    if (!code.trim()) {
      showCodeError("Enter some code first — paste a snippet or press “Try Example”.");
      if (editor) editor.focus();
      return;
    }
    if (code.length > MAX_CODE_CHARS) {
      showCodeError(
        "That snippet is " + code.length.toLocaleString() +
        " characters. Try a smaller piece (under " +
        MAX_CODE_CHARS.toLocaleString() + ") so the local model can read it."
      );
      return;
    }

    hideCodeError();
    setBusy(true);

    editorEl.responsePanel.hidden = false;
    appendMessage(createUserMessage(code, language));
    var thinking = createThinkingMessage();
    appendMessage(thinking);

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS)
      : null;

    fetch("/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code, language: languageLabel(language) }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (response) {
        return response.json().catch(function () {
          return null;
        }).then(function (data) {
          return { ok: response.ok, status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (thinking.parentNode) thinking.parentNode.removeChild(thinking);

        if (!result.ok || !result.data || result.data.error) {
          throw new Error(
            (result.data && result.data.error) ||
            "The server responded with status " + result.status + "."
          );
        }

        var explanation = result.data.explanation;
        if (typeof explanation !== "string" || !explanation.trim()) {
          throw new Error("The model returned an empty explanation. Please try again.");
        }

        state.lastExplanation = explanation;
        appendMessage(createAssistantMessage(explanation, {
          code: code,
          modelName: result.data.model || editorEl.modelPillName
        }));

        addHistoryEntry({
          code: code,
          language: language,
          explanation: explanation
        });

        checkStatus();
      })
      .catch(function (error) {
        if (thinking.parentNode) thinking.parentNode.removeChild(thinking);

        var title = "Explanation failed";
        var detail;
        if (error && error.name === "AbortError") {
          title = "Request timed out";
          detail = "The model did not answer within " +
            Math.round(REQUEST_TIMEOUT_MS / 1000) +
            " seconds. Check that Ollama is still running, then try a shorter snippet.";
        } else if (error instanceof TypeError ||
                   (error && error.name === "TypeError")) {
          detail = "Could not reach the LazyCode AI server or Ollama. " +
            "Make sure the app is running (python app.py) and Ollama is up " +
            "(ollama serve), then try again.";
        } else {
          detail = error && error.message ? error.message : "Unexpected error.";
        }

        appendMessage(createErrorMessage(title, detail));
        checkStatus();
      })
      .then(function () {
        if (timer) clearTimeout(timer);
        setBusy(false);
      });
  }

  /* ---------------- History ---------------- */

  function addHistoryEntry(entry) {
    state.history.unshift({
      id: makeId(),
      ts: Date.now(),
      language: entry.language,
      code: entry.code,
      explanation: entry.explanation
    });
    if (state.history.length > MAX_HISTORY) {
      state.history.length = MAX_HISTORY;
    }
    persistHistory();
    renderHistory();
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function deleteHistoryEntry(id) {
    state.history = state.history.filter(function (entry) {
      return entry.id !== id;
    });
    persistHistory();
    renderHistory();
  }

  function filteredHistory() {
    var query = state.searchQuery.trim().toLowerCase();
    if (!query) return state.history;
    return state.history.filter(function (entry) {
      return (
        entry.code.toLowerCase().indexOf(query) !== -1 ||
        entry.explanation.toLowerCase().indexOf(query) !== -1 ||
        languageLabel(entry.language).toLowerCase().indexOf(query) !== -1
      );
    });
  }

  function buildHistoryItem(entry, opts) {
    var item = el("div", {
      class: "history-item",
      role: "button",
      tabindex: "0",
      title: "Reopen this explanation"
    });

    item.appendChild(
      el(
        "div",
        { class: "history-item-top" },
        el("span", { class: "lang-chip" }, languageLabel(entry.language)),
        el("span", { class: "history-item-time" }, formatRelativeTime(entry.ts))
      )
    );
    item.appendChild(
      el("div", { class: "history-item-code" }, firstMeaningfulLine(entry.code))
    );
    item.appendChild(
      el("div", { class: "history-item-preview" }, summarizeText(entry.explanation, 110))
    );

    var deleteBtn = el(
      "button",
      { class: "history-item-delete", type: "button", title: "Delete this explanation",
        "aria-label": "Delete this explanation" },
      icon("trash")
    );
    deleteBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      deleteHistoryEntry(entry.id);
      showToast("Explanation deleted");
    });
    item.appendChild(deleteBtn);

    function open() {
      openHistoryEntry(entry, opts);
    }

    item.addEventListener("click", open);
    item.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });

    return item;
  }

  function openHistoryEntry(entry, opts) {
    setCode(entry.code);
    setLanguage(entry.language);
    editorEl.responsePanel.hidden = false;
    editorEl.chatLog.textContent = "";
    appendMessage(createUserMessage(entry.code, entry.language), false);
    appendMessage(createAssistantMessage(entry.explanation, {
      code: entry.code,
      modelName: editorEl.modelPillName
    }), false);
    state.lastExplanation = entry.explanation;
    switchView("explainer");
    closeHistoryDrawer();
    if (opts && opts.scrollChat) {
      editorEl.chatLog.lastChild.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function renderHistory() {
    var entries = filteredHistory();
    var searching = state.searchQuery.trim().length > 0;

    // Right panel
    var list = editorEl.historyList;
    list.textContent = "";
    entries.forEach(function (entry) {
      list.appendChild(buildHistoryItem(entry, { scrollChat: false }));
    });
    editorEl.historyEmpty.hidden = entries.length > 0;
    editorEl.historyEmpty.querySelector("h3").textContent =
      searching && state.history.length ? "No matches" : "No explanations yet";
    editorEl.historyEmpty.querySelector("p").textContent =
      searching && state.history.length
        ? "Nothing here matches “" + state.searchQuery.trim() + "”."
        : "Your previous explanations will appear here — saved only in this browser.";

    // Full page list
    var pageList = editorEl.historyPageList;
    pageList.textContent = "";
    entries.forEach(function (entry) {
      pageList.appendChild(buildHistoryItem(entry, { scrollChat: true }));
    });
    editorEl.historyPageEmpty.hidden = entries.length > 0;
    editorEl.historyPageEmpty.querySelector("h3").textContent =
      searching && state.history.length ? "No matches" : "No explanations yet";
    editorEl.historyPageEmpty.querySelector("p").textContent =
      searching && state.history.length
        ? "Nothing here matches “" + state.searchQuery.trim() + "”."
        : "Ask the Code Explainer about a snippet and it will show up here.";

    // Counts
    var count = state.history.length;
    editorEl.navHistoryCount.textContent = String(count);
    editorEl.navHistoryCount.hidden = count === 0;
    if (editorEl.settingsHistoryCount) {
      editorEl.settingsHistoryCount.textContent = String(count);
      editorEl.settingsHistoryLimit.textContent = String(MAX_HISTORY);
    }
    if (editorEl.settingsStorage) {
      editorEl.settingsStorage.textContent = state.storageOk
        ? estimateStorage()
        : "Unavailable in this browser session";
    }

    renderStorageNote();
  }

  function estimateStorage() {
    try {
      var raw = window.localStorage.getItem(HISTORY_KEY) || "";
      var bytes = 0;
      try {
        bytes = new Blob([raw]).size;
      } catch (error) {
        bytes = raw.length;
      }
      if (bytes < 1024) return bytes + " bytes used";
      return (bytes / 1024).toFixed(1) + " KB used";
    } catch (error) {
      return "Unknown";
    }
  }

  function renderStorageNote() {
    var note = editorEl.historyStorageNote;
    if (!note) return;
    note.textContent = state.storageOk
      ? ""
      : "This browser is blocking localStorage, so history will be lost when you close the tab.";
    note.hidden = state.storageOk;
  }

  function confirmClearHistory() {
    if (!state.history.length) {
      showToast("History is already empty", "alert");
      return;
    }
    openConfirm({
      title: "Clear history?",
      body: "This permanently deletes all " + state.history.length +
        " saved explanations from this browser. It cannot be undone.",
      confirmLabel: "Clear history",
      onConfirm: function () {
        state.history = [];
        persistHistory();
        renderHistory();
        showToast("History cleared");
      }
    });
  }

  /* ---------------- Templates & examples ---------------- */

  function renderTemplates() {
    var grid = editorEl.templateGrid;
    grid.textContent = "";
    TEMPLATES.forEach(function (template) {
      var previewLines = template.code.split("\n").slice(0, 4).join("\n");
      var useBtn = el(
        "button",
        { class: "btn btn-soft btn-sm", type: "button" },
        icon("arrow-right"),
        el("span", null, "Use template")
      );
      useBtn.addEventListener("click", function () {
        setLanguage(template.language);
        setCode(template.code);
        switchView("explainer");
        showToast("Template loaded — press Explain Code");
      });

      var card = el(
        "div",
        { class: "template-card" },
        el(
          "div",
          { class: "template-card-top" },
          el("h3", null, template.title),
          el("span", { class: "lang-chip" }, languageLabel(template.language))
        ),
        el("p", null, template.description),
        el("pre", { class: "template-snippet" }, el("code", null, previewLines)),
        useBtn
      );
      card.style.cursor = "default";
      grid.appendChild(card);
    });
  }

  function loadExample() {
    var example = EXAMPLES[state.exampleIndex % EXAMPLES.length];
    state.exampleIndex += 1;
    setLanguage(example.language);
    setCode(example.code);
    showToast("Example loaded — press Explain Code");
  }

  /* ---------------- Views & drawers ---------------- */

  function switchView(name) {
    if (!VIEW_TITLES.hasOwnProperty(name)) return;
    state.view = name;

    document.querySelectorAll(".view").forEach(function (view) {
      view.classList.toggle("is-active", view.id === "view-" + name);
    });
    editorEl.navItems.forEach(function (item) {
      item.classList.toggle("is-active", item.getAttribute("data-view") === name);
    });
    editorEl.sectionTitle.textContent = VIEW_TITLES[name];

    closeSidebar();
    if (name === "settings") renderHistory();
    if (editor) editor.refresh();
  }

  function openSidebar() {
    editorEl.sidebar.classList.add("is-open");
    editorEl.sidebarScrim.hidden = false;
  }

  function closeSidebar() {
    editorEl.sidebar.classList.remove("is-open");
    editorEl.sidebarScrim.hidden = true;
  }

  function toggleHistoryDrawer() {
    var open = editorEl.historyPanel.classList.toggle("is-open");
    editorEl.historyScrim.hidden = !open;
    if (open && editorEl.historySearchDrawer) {
      editorEl.historySearchDrawer.focus();
    }
  }

  function closeHistoryDrawer() {
    editorEl.historyPanel.classList.remove("is-open");
    editorEl.historyScrim.hidden = true;
  }

  /* ---------------- Events ---------------- */

  function bindEvents() {
    editorEl.navItems.forEach(function (item) {
      item.addEventListener("click", function () {
        switchView(item.getAttribute("data-view"));
      });
    });

    editorEl.gotoButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        switchView(button.getAttribute("data-goto"));
      });
    });

    editorEl.menuBtn.addEventListener("click", openSidebar);
    editorEl.sidebarClose.addEventListener("click", closeSidebar);
    editorEl.sidebarScrim.addEventListener("click", closeSidebar);

    editorEl.historyToggleBtn.addEventListener("click", toggleHistoryDrawer);
    editorEl.historyCloseBtn.addEventListener("click", closeHistoryDrawer);
    editorEl.historyScrim.addEventListener("click", closeHistoryDrawer);

    editorEl.settingsBtn.addEventListener("click", function () {
      switchView("settings");
    });

    editorEl.explainBtn.addEventListener("click", explainCode);
    editorEl.exampleBtn.addEventListener("click", loadExample);
    editorEl.clearBtn.addEventListener("click", function () {
      setCode("");
      showToast("Editor cleared");
    });

    editorEl.copyResponseBtn.addEventListener("click", function () {
      if (!state.lastExplanation) {
        showToast("Nothing to copy yet", "alert");
        return;
      }
      copyText(state.lastExplanation, editorEl.copyResponseBtn, "Copy response");
    });

    editorEl.languageSelect.addEventListener("change", function () {
      setLanguage(editorEl.languageSelect.value);
    });

    // Search (topbar + drawer) stays in sync
    function onSearch(event) {
      state.searchQuery = event.target.value;
      if (editorEl.historySearch.value !== state.searchQuery) {
        editorEl.historySearch.value = state.searchQuery;
      }
      if (editorEl.historySearchDrawer.value !== state.searchQuery) {
        editorEl.historySearchDrawer.value = state.searchQuery;
      }
      renderHistory();
    }
    editorEl.historySearch.addEventListener("input", onSearch);
    editorEl.historySearchDrawer.addEventListener("input", onSearch);

    editorEl.clearHistoryBtn.addEventListener("click", confirmClearHistory);
    editorEl.clearHistoryPageBtn.addEventListener("click", confirmClearHistory);
    editorEl.clearHistorySettingsBtn.addEventListener("click", confirmClearHistory);

    editorEl.recheckBtn.addEventListener("click", function () {
      checkStatus().then(function () {
        showToast("Connection re-checked");
      });
    });

    editorEl.modalCancelBtn.addEventListener("click", closeConfirm);
    editorEl.modalScrim.addEventListener("click", function (event) {
      if (event.target === editorEl.modalScrim) closeConfirm();
    });
    editorEl.modalConfirmBtn.addEventListener("click", function () {
      var action = state.confirmAction;
      closeConfirm();
      if (typeof action === "function") action();
    });

    // Settings
    editorEl.defaultLanguage.addEventListener("change", function () {
      state.settings.defaultLanguage = editorEl.defaultLanguage.value;
      persistSettings();
      setLanguage(state.settings.defaultLanguage);
      showToast("Default language saved");
    });

    editorEl.indentSize.addEventListener("change", function () {
      state.settings.indent = editorEl.indentSize.value;
      persistSettings();
      applyIndentSetting();
      showToast("Indent preference saved");
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        if (state.view === "explainer") {
          event.preventDefault();
          explainCode();
        }
      }
      if (event.key === "Escape") {
        if (!editorEl.modalScrim.hidden) {
          closeConfirm();
        } else {
          closeSidebar();
          closeHistoryDrawer();
        }
      }
    });

    // Refresh status when the tab becomes visible again
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) checkStatus();
    });
  }

  /* ---------------- Init ---------------- */

  function applySettingsToUI() {
    editorEl.defaultLanguage.value = state.settings.defaultLanguage;
    editorEl.indentSize.value = state.settings.indent;
    setLanguage(state.settings.defaultLanguage);
    applyIndentSetting();
  }

  function init() {
    cacheElements();
    loadSettings();
    loadHistory();
    initEditor();
    applySettingsToUI();
    renderTemplates();
    renderHistory();
    bindEvents();
    updateCodeMeta();
    checkStatus();
    setInterval(checkStatus, STATUS_POLL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// popup.js — ShieldSense AI (Final Version)
// Built for Chrome 138+ with Gemini Nano (Prompt API)

const urlInput = document.getElementById("urlInput");
const checkPhishingBtn = document.getElementById("checkPhishing");
const checkCurrentUrlBtn = document.getElementById("checkCurrentUrl");
const scanPageBtn = document.getElementById("scanPage");
const askSafetyBtn = document.getElementById("askSafety");
const resultText = document.getElementById("resultText");
const trustBar = document.getElementById("trustBar");
const trustLabel = document.getElementById("trustLabel");

function showResult(message) {
  resultText.textContent = message;
}

function updateTrustMeter(level) {
  let width = "0%";
  let color = "#dadce0";
  let label = "";

  switch (level) {
    case "safe":
      width = "100%";
      color = "#34a853"; // green
      label = "Safe";
      break;
    case "suspicious":
      width = "70%";
      color = "#fbbc04"; // yellow
      label = "Suspicious";
      break;
    case "phishing":
      width = "40%";
      color = "#ea4335"; // red
      label = "Phishing";
      break;
    default:
      width = "0%";
      color = "#dadce0";
      label = "";
  }

  trustBar.style.width = width;
  trustBar.style.backgroundColor = color;
  trustLabel.textContent = label;
}

/* ----------------------------------------------------
   🧩 1. CHECK PHISHING (manual input)
---------------------------------------------------- */
checkPhishingBtn.addEventListener("click", async () => {
  if (!("LanguageModel" in self)) {
    showResult("❌ Chrome built-in AI not available. Update to Chrome 138+ and enable Gemini Nano.");
    return;
  }

  const url = urlInput.value.trim();
  if (!url) return showResult("Please enter a valid URL.");

  showResult("🔍 Checking link safety...");
  updateTrustMeter("");

  try {
    const availability = await LanguageModel.availability();
    if (availability === "unavailable") {
      showResult("❌ Prompt API unavailable.");
      return;
    }

    const session = await LanguageModel.create({
      temperature: 0.3,
      topK: 3,
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          showResult(`⬇️ Downloading Gemini Nano model: ${(e.loaded * 100).toFixed(0)}%`);
        });
      }
    });

    const prompt = `
      You are a cybersecurity AI. Analyze this URL: ${url}
      Determine if it is phishing, suspicious, or safe.
      Respond in JSON format:
      {
        "classification": "phishing | suspicious | safe",
        "reason": "short explanation"
      }
    `;

    const schema = { type: "object" };
    const result = await session.prompt(prompt, { responseConstraint: schema });

    let parsed = {};
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = { classification: "unknown", reason: result };
    }

    showResult(`✅ Result: ${parsed.classification.toUpperCase()}\n\n💡 ${parsed.reason}`);
    updateTrustMeter(parsed.classification);

    session.destroy();
  } catch (err) {
    console.error(err);
    showResult("⚠️ Error analyzing link. Try again.");
  }
});

/* ----------------------------------------------------
   🌐 2. CHECK CURRENT TAB URL (auto)
---------------------------------------------------- */
checkCurrentUrlBtn.addEventListener("click", async () => {
  if (!("LanguageModel" in self)) {
    showResult("❌ Chrome built-in AI not available. Please update to Chrome 138+ and enable Gemini Nano.");
    return;
  }

  showResult("🔍 Checking current website...");
  updateTrustMeter("");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;

    if (!url || !url.startsWith("http")) {
      showResult("⚠️ This tab doesn't have a valid website URL.");
      return;
    }

    const availability = await LanguageModel.availability();
    if (availability === "unavailable") {
      showResult("❌ Prompt API unavailable.");
      return;
    }

    const session = await LanguageModel.create({
      temperature: 0.3,
      topK: 3,
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          showResult(`⬇️ Downloading Gemini Nano model: ${(e.loaded * 100).toFixed(0)}%`);
        });
      }
    });

    const prompt = `
      You are a cybersecurity AI assistant. Analyze the following URL:
      ${url}
      Determine if the website is safe, suspicious, or phishing.
      Return a JSON object with:
      {
        "classification": "phishing | suspicious | safe",
        "reason": "short, human-friendly explanation"
      }`;

    const schema = { type: "object" };
    const result = await session.prompt(prompt, { responseConstraint: schema });

    let parsed = {};
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = { classification: "unknown", reason: result };
    }

    showResult(`✅ Result for current site: ${parsed.classification.toUpperCase()}\n\n💡 ${parsed.reason}`);
    updateTrustMeter(parsed.classification);

    session.destroy();
  } catch (err) {
    console.error(err);
    showResult("⚠️ Error analyzing current tab URL.");
  }
});

/* ----------------------------------------------------
   🔍 3. SCAN PAGE CONTENT
---------------------------------------------------- */
scanPageBtn.addEventListener("click", async () => {
  showResult("🧠 Scanning current page for suspicious content...");
  updateTrustMeter("");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result: pageText }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText.slice(0, 10000)
    });

    if (!pageText || pageText.length < 200)
      return showResult("⚠️ Not enough content to analyze.");

    const session = await LanguageModel.create();
    const prompt = `
      You are an AI threat detector.
      Analyze this webpage text for signs of phishing, scams, or social engineering.
      List up to 5 red flags with short explanations.
      Text:
      ${pageText}
    `;
    const result = await session.prompt(prompt);
    showResult("🚨 Possible Phishing Indicators:\n" + result);
  } catch (err) {
    console.error(err);
    showResult("⚠️ Error scanning page.");
  }
});

/* ----------------------------------------------------
   🤖 4. ASK SHIELDSENSE (AI Q&A)
---------------------------------------------------- */
askSafetyBtn.addEventListener("click", async () => {
  const question = urlInput.value.trim();
  if (!question) return showResult("Ask something like: 'Is it safe to log in here?'");
  showResult("💬 Thinking...");
  updateTrustMeter("");
  try {
    const session = await LanguageModel.create({ temperature: 0.6, topK: 3 });
    const prompt = `
      You are ShieldSense, an AI security assistant.
      Answer the following question clearly and concisely, using cybersecurity best practices.
      Question: ${question}
    `;
    const answer = await session.prompt(prompt);
    showResult("🛡️ ShieldSense says:\n" + answer);
  } catch (err) {
    console.error(err);
    showResult("⚠️ Error answering question.");
  }
});


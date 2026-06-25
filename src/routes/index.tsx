import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpamSense – Client-Side Email Spam Classifier" },
      {
        name: "description",
        content:
          "SpamSense is a fast, private, client-side email spam classifier. Analyze emails directly in your browser — no backend, no tracking.",
      },
    ],
  }),
  component: Index,
});

// ---- Detection engine ----
const SPAM_KEYWORDS: { word: string; weight: number }[] = [
  { word: "free", weight: 2 },
  { word: "winner", weight: 3 },
  { word: "win", weight: 2 },
  { word: "won", weight: 2 },
  { word: "prize", weight: 3 },
  { word: "lottery", weight: 4 },
  { word: "jackpot", weight: 4 },
  { word: "claim", weight: 2 },
  { word: "urgent", weight: 3 },
  { word: "act now", weight: 3 },
  { word: "limited time", weight: 2 },
  { word: "click here", weight: 3 },
  { word: "verify your account", weight: 4 },
  { word: "password", weight: 2 },
  { word: "bitcoin", weight: 3 },
  { word: "crypto", weight: 2 },
  { word: "investment", weight: 2 },
  { word: "guaranteed", weight: 2 },
  { word: "risk-free", weight: 3 },
  { word: "cash", weight: 2 },
  { word: "credit", weight: 2 },
  { word: "loan", weight: 2 },
  { word: "offer", weight: 1 },
  { word: "discount", weight: 1 },
  { word: "buy now", weight: 2 },
  { word: "subscribe", weight: 1 },
  { word: "unsubscribe", weight: 1 },
  { word: "viagra", weight: 5 },
  { word: "earn money", weight: 3 },
  { word: "work from home", weight: 2 },
  { word: "congratulations", weight: 2 },
  { word: "selected", weight: 1 },
  { word: "exclusive", weight: 1 },
  { word: "gift card", weight: 3 },
];

const SAMPLES: Record<string, string> = {
  "Obvious Spam":
    "CONGRATULATIONS!!! You are the WINNER of a $1,000,000 lottery jackpot. Claim your prize NOW — click here to verify your account. Act now, limited time offer! Risk-free guaranteed cash.",
  Promotion:
    "Hi there! Don't miss our exclusive 50% discount this weekend. Subscribe today to grab the offer and get a free gift card with every purchase. Buy now before stock runs out!",
  "Safe Email":
    "Hi Nithin, just confirming our meeting tomorrow at 10am to discuss the project roadmap. Let me know if you'd like to reschedule. Thanks, Priya.",
  "College Notice":
    "Dear Students, the semester examinations will begin from Monday, December 15th. Please collect your hall tickets from the academic office by Friday. Regards, Examination Cell.",
};

type Result = {
  verdict: "Spam" | "Safe";
  confidence: number;
  risk: "Low" | "Medium" | "High";
  keywords: string[];
};

function analyze(text: string): Result {
  const lower = text.toLowerCase();
  const matched: { word: string; weight: number }[] = [];
  let score = 0;
  for (const k of SPAM_KEYWORDS) {
    if (lower.includes(k.word)) {
      matched.push(k);
      score += k.weight;
    }
  }
  // heuristics
  const letters = text.replace(/[^a-zA-Z]/g, "");
  const capsRatio = letters.length ? (letters.replace(/[^A-Z]/g, "").length / letters.length) : 0;
  if (capsRatio > 0.35 && letters.length > 20) score += 3;
  const exclam = (text.match(/!/g) || []).length;
  if (exclam >= 3) score += Math.min(exclam, 6);
  const links = (text.match(/https?:\/\/|www\./gi) || []).length;
  if (links > 0) score += Math.min(links * 2, 6);

  const max = 30;
  const confidence = Math.min(100, Math.round((score / max) * 100));
  const verdict: Result["verdict"] = confidence >= 50 ? "Spam" : "Safe";
  const risk: Result["risk"] =
    confidence >= 70 ? "High" : confidence >= 40 ? "Medium" : "Low";

  return { verdict, confidence, risk, keywords: matched.map((m) => m.word) };
}

type HistoryItem = {
  id: string;
  text: string;
  result: Result;
  at: number;
};

const STORAGE_KEY = "spamsense.history.v1";
const PREFS_KEY = "spamsense.prefs.v1";

const ACCENTS = [
  { id: "sky", color: "#38bdf8" },
  { id: "violet", color: "#a78bfa" },
  { id: "emerald", color: "#34d399" },
  { id: "sunset", color: "#fb923c" },
  { id: "rose", color: "#f472b6" },
];

function Index() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [accent, setAccent] = useState<string>("sky");

  // Load persisted state
  useEffect(() => {
    try {
      const h = localStorage.getItem(STORAGE_KEY);
      if (h) {
        const parsed = JSON.parse(h);
        if (Array.isArray(parsed)) {
          setHistory(parsed.filter((x: any) => x && x.result && typeof x.result.verdict === "string"));
        }
      }
      const p = localStorage.getItem(PREFS_KEY);
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.accent) setAccent(parsed.accent);
      }
    } catch {}
  }, []);

  // Apply theme + accent to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    if (accent === "sky") html.removeAttribute("data-accent");
    else html.setAttribute("data-accent", accent);
    localStorage.setItem(PREFS_KEY, JSON.stringify({ theme, accent }));
  }, [theme, accent]);

  const stats = useMemo(() => {
    const total = history.length;
    const spam = history.filter((h) => h.result.verdict === "Spam").length;
    return { total, spam, safe: total - spam };
  }, [history]);

  function handleAnalyze() {
    if (!text.trim()) return;
    const r = analyze(text);
    setResult(r);
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      text: text.trim(),
      result: r,
      at: Date.now(),
    };
    const next = [item, ...history].slice(0, 25);
    setHistory(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleClear() {
    setText("");
    setResult(null);
  }

  function handleClearHistory() {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="app">
      <header className="nav">
        <div className="container nav-inner">
          <div className="brand">
            <div className="brand-logo">S</div>
            <div>
              <div className="brand-name">SpamSense</div>
              <div className="brand-sub">Client-Side Spam Classifier</div>
            </div>
          </div>
          <div className="nav-actions">
            <div className="swatches" role="group" aria-label="Accent color">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  className={`swatch ${accent === a.id ? "active" : ""}`}
                  style={{ background: a.color }}
                  onClick={() => setAccent(a.id)}
                  aria-label={`Accent ${a.id}`}
                />
              ))}
            </div>
            <button
              className="icon-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              title="Toggle dark/light"
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ flex: 1 }}>
        <section className="hero">
          <span className="eyebrow"><span className="dot" /> 100% On-device · No data leaves your browser</span>
          <h1>
            Detect spam emails with{" "}
            <span className="gradient-text">SpamSense</span>
          </h1>
          <p>
            A fast, private spam classifier powered by weighted keyword scoring
            and heuristic rules — all running locally in your browser.
          </p>
        </section>

        <section className="stats" aria-label="Stats">
          <div className="stat">
            <div className="stat-label">Total Emails Checked</div>
            <div className="stat-value">{stats.total}</div>
            <span className="pill">All-time</span>
          </div>
          <div className="stat spam">
            <div className="stat-label">Spam Detected</div>
            <div className="stat-value">{stats.spam}</div>
            <span className="pill">Flagged as spam</span>
          </div>
          <div className="stat safe">
            <div className="stat-label">Safe Emails</div>
            <div className="stat-value">{stats.safe}</div>
            <span className="pill">Looks clean</span>
          </div>
        </section>

        <section className="grid-2">
          <div className="card">
            <h2>Analyze an Email</h2>
            <div className="sub">Paste an email or try a sample below.</div>

            <div className="samples">
              {Object.keys(SAMPLES).map((k) => (
                <button key={k} className="chip" onClick={() => setText(SAMPLES[k])}>
                  {k}
                </button>
              ))}
            </div>

            <textarea
              className="input"
              placeholder="Paste email content here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="input-meta">
              <span>{text.length} characters</span>
              <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
            </div>

            <div className="actions">
              <button className="btn primary" onClick={handleAnalyze} disabled={!text.trim()}>
                Check Spam
              </button>
              <button className="btn ghost" onClick={handleClear}>
                Reset
              </button>
            </div>

            {result && (
              <div className="result">
                <div className="result-head">
                  <span className={`verdict ${result.verdict === "Spam" ? "spam" : "safe"}`}>
                    {result.verdict === "Spam" ? "⚠ Spam" : "✓ Safe"} · {result.confidence}%
                  </span>
                  <span className="risk">
                    Risk Level:{" "}
                    <b className={result.risk.toLowerCase()}>{result.risk}</b>
                  </span>
                </div>
                <div className={`meter ${result.verdict === "Spam" ? "spam" : "safe"}`}>
                  <span style={{ width: `${result.confidence}%` }} />
                </div>
                <div className="keywords">
                  {result.keywords.length === 0 ? (
                    <span className="kw empty">No suspicious keywords detected</span>
                  ) : (
                    result.keywords.map((k) => (
                      <span key={k} className="kw">{k}</span>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2>Recent History</h2>
                <div className="sub">Stored locally in your browser.</div>
              </div>
              {history.length > 0 && (
                <button className="btn ghost" onClick={handleClearHistory} style={{ padding: "8px 12px" }}>
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="empty-state">No analyses yet. Run one to see it here.</div>
            ) : (
              <div className="history-list">
                {history.map((h) => (
                  <div key={h.id} className="history-item">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="history-snippet">{h.text}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>
                        {new Date(h.at).toLocaleString()}
                      </div>
                    </div>
                    <div className="history-meta">
                      <b className={h.result.verdict === "Spam" ? "spam" : "safe"}>
                        {h.result.verdict}
                      </b>
                      <div>{h.result.confidence}% · {h.result.risk}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="about">
          <div className="card">
            <h2>About SpamSense</h2>
            <div className="sub">How the detection works under the hood.</div>
            <div className="about-grid">
              <div className="about-card">
                <div className="ico">1</div>
                <h3>Keyword Scoring</h3>
                <p>Each email is scanned for known spam phrases. Every match adds a weighted score based on how strong a signal it is.</p>
              </div>
              <div className="about-card">
                <div className="ico">2</div>
                <h3>Heuristic Rules</h3>
                <p>SpamSense also checks for excessive ALL-CAPS, multiple exclamation marks, and suspicious links to boost the score.</p>
              </div>
              <div className="about-card">
                <div className="ico">3</div>
                <h3>Verdict & Risk</h3>
                <p>The combined score is normalized to a 0–100% confidence, then mapped to a verdict (Spam/Safe) and risk level (Low/Medium/High).</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="container">
          <div className="row"><b>SpamSense</b></div>
          <div className="row">Client-Side Email Spam Classifier</div>
          <div className="row">Built with HTML, CSS &amp; JavaScript</div>
          <div className="row">Designed &amp; Developed by <b>Nithin Kumar</b></div>
          <div className="row">© 2026 All Rights Reserved</div>
        </div>
      </footer>
    </div>
  );
}

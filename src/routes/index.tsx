import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpamSense — Client-Side Email Spam Classifier" },
      {
        name: "description",
        content:
          "Privacy-first spam classifier. Paste any email and analyze it instantly with a transparent keyword + heuristic model — entirely in your browser.",
      },
      { property: "og:title", content: "SpamSense — Client-Side Email Spam Classifier" },
      {
        property: "og:description",
        content:
          "Detect spam before it reaches your inbox. 100% client-side, glassmorphism UI, 5 themes.",
      },
    ],
  }),
  component: SpamSenseApp,
});

/* ---------------- Types ---------------- */
type Risk = "Low" | "Medium" | "High";
type Verdict = "Spam" | "Safe" | "Suspicious";
type HistoryItem = {
  id: string;
  type: string;
  verdict: Verdict;
  confidence: number;
  risk: Risk;
  timestamp: number;
  preview: string;
};
type ThemeName = "ocean" | "purple" | "matrix" | "sunset" | "cyber";
type Mode = "dark" | "light";

/* ---------------- Constants ---------------- */
const SPAM_KEYWORDS: { word: string; weight: number; category: string }[] = [
  { word: "free", weight: 3, category: "Bait" },
  { word: "winner", weight: 5, category: "Prize" },
  { word: "win", weight: 3, category: "Prize" },
  { word: "won", weight: 3, category: "Prize" },
  { word: "lottery", weight: 6, category: "Prize" },
  { word: "prize", weight: 4, category: "Prize" },
  { word: "cash", weight: 3, category: "Money" },
  { word: "urgent", weight: 4, category: "Urgency" },
  { word: "act now", weight: 5, category: "Urgency" },
  { word: "limited time", weight: 4, category: "Urgency" },
  { word: "expires", weight: 3, category: "Urgency" },
  { word: "click here", weight: 4, category: "Link" },
  { word: "verify your account", weight: 6, category: "Phishing" },
  { word: "verify", weight: 3, category: "Phishing" },
  { word: "password", weight: 3, category: "Phishing" },
  { word: "bank", weight: 2, category: "Finance" },
  { word: "credit card", weight: 4, category: "Finance" },
  { word: "loan", weight: 3, category: "Finance" },
  { word: "investment", weight: 3, category: "Finance" },
  { word: "bitcoin", weight: 4, category: "Crypto" },
  { word: "crypto", weight: 3, category: "Crypto" },
  { word: "guarantee", weight: 3, category: "Bait" },
  { word: "risk-free", weight: 4, category: "Bait" },
  { word: "no cost", weight: 3, category: "Bait" },
  { word: "offer", weight: 2, category: "Promo" },
  { word: "discount", weight: 2, category: "Promo" },
  { word: "deal", weight: 2, category: "Promo" },
  { word: "buy now", weight: 4, category: "Promo" },
  { word: "subscribe", weight: 2, category: "Promo" },
  { word: "viagra", weight: 8, category: "Spammy" },
  { word: "pharmacy", weight: 4, category: "Spammy" },
  { word: "weight loss", weight: 4, category: "Spammy" },
  { word: "miracle", weight: 4, category: "Spammy" },
  { word: "congratulations", weight: 3, category: "Prize" },
  { word: "claim", weight: 3, category: "Prize" },
  { word: "deposit", weight: 3, category: "Finance" },
];

const SAMPLES: { id: string; label: string; body: string }[] = [
  {
    id: "obvious",
    label: "Obvious Spam",
    body: `CONGRATULATIONS!!! YOU HAVE WON A $1,000,000 LOTTERY PRIZE!!!
Click here NOW to CLAIM your CASH before it EXPIRES!
Send your bank details to verify your account immediately.
ACT NOW — this is a LIMITED TIME offer. 100% RISK-FREE GUARANTEE!`,
  },
  {
    id: "promo",
    label: "Suspicious Promotion",
    body: `Hey! Don't miss our exclusive 80% discount deal — buy now and save big.
Limited time offer expires tonight. Click here to grab yours: http://bit.ly/super-deal
Free shipping included. Subscribe today!`,
  },
  {
    id: "safe",
    label: "Safe Email",
    body: `Hi Sarah,

Thanks for sending over the design mockups yesterday. I had a chance to review them
and they look great. Let's schedule a quick call this week to discuss next steps.

Best,
Daniel`,
  },
  {
    id: "college",
    label: "College Notice",
    body: `Dear Student,

This is a reminder that semester registration closes on Friday at 5 PM.
Please log in to the student portal to confirm your enrolled courses.
Contact the registrar's office if you need assistance.

Regards,
Academic Affairs`,
  },
  {
    id: "job",
    label: "Job Offer",
    body: `Hello Alex,

Following your interview last week, we are pleased to extend an offer for the
Frontend Engineer position at Northwind Labs. Please find the attached offer
letter and let us know if you have any questions.

Sincerely,
Priya — Talent Team`,
  },
  {
    id: "bank",
    label: "Bank Alert",
    body: `URGENT: Unusual activity detected on your account!
Please verify your account and password immediately by clicking the link below
to avoid suspension. http://secure-bank-login.example/verify
Failure to act now will result in permanent closure.`,
  },
];

const THEMES: { id: ThemeName; label: string; swatch: string[] }[] = [
  { id: "ocean", label: "Ocean Blue", swatch: ["#0ea5e9", "#0369a1"] },
  { id: "purple", label: "Purple Night", swatch: ["#a855f7", "#4c1d95"] },
  { id: "matrix", label: "Matrix Green", swatch: ["#22c55e", "#064e3b"] },
  { id: "sunset", label: "Sunset Orange", swatch: ["#fb923c", "#9a3412"] },
  { id: "cyber", label: "Cyber Red", swatch: ["#ef4444", "#7f1d1d"] },
];

const NAV_LINKS = [
  { id: "home", label: "Home" },
  { id: "features", label: "Features" },
  { id: "how", label: "How It Works" },
  { id: "history", label: "History" },
  { id: "about", label: "About" },
];

const HISTORY_KEY = "spamsense.history.v2";
const THEME_KEY = "spamsense.theme.v2";
const MODE_KEY = "spamsense.mode.v2";

/* ---------------- Analyzer ---------------- */
function analyze(text: string) {
  const raw = text || "";
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const letters = trimmed.replace(/[^A-Za-z]/g, "");
  const caps = trimmed.replace(/[^A-Z]/g, "");
  const capsPct = letters.length ? (caps.length / letters.length) * 100 : 0;
  const exclamations = (trimmed.match(/!/g) || []).length;
  const links = trimmed.match(/https?:\/\/\S+|www\.\S+|bit\.ly\/\S+/gi) || [];
  const suspiciousLinks = links.filter(
    (l) => /bit\.ly|tinyurl|free|verify|login|secure-/i.test(l),
  ).length;

  const detected: { word: string; weight: number; category: string; count: number }[] = [];
  let keywordScore = 0;
  for (const k of SPAM_KEYWORDS) {
    const re = new RegExp(`\\b${k.word.replace(/\s+/g, "\\s+")}\\b`, "gi");
    const matches = lower.match(re);
    if (matches?.length) {
      detected.push({ ...k, count: matches.length });
      keywordScore += k.weight * matches.length;
    }
  }

  const reasons: string[] = [];
  let heuristicScore = 0;
  if (capsPct > 35 && letters.length > 30) {
    heuristicScore += 12;
    reasons.push(`High capital-letter usage (${capsPct.toFixed(0)}%)`);
  }
  if (exclamations >= 3) {
    heuristicScore += Math.min(12, exclamations * 2);
    reasons.push(`Excessive punctuation (${exclamations} exclamation marks)`);
  }
  if (suspiciousLinks > 0) {
    heuristicScore += suspiciousLinks * 8;
    reasons.push(`${suspiciousLinks} suspicious link${suspiciousLinks > 1 ? "s" : ""} detected`);
  } else if (links.length > 2) {
    heuristicScore += 4;
    reasons.push(`${links.length} links present`);
  }
  if (/urgent|act now|immediately|expires|right away/i.test(trimmed)) {
    heuristicScore += 6;
    reasons.push("Urgent / pressure language present");
  }
  if (detected.length) {
    reasons.unshift(`${detected.length} spam keyword${detected.length > 1 ? "s" : ""} matched`);
  }

  const rawScore = keywordScore + heuristicScore;
  const confidence = Math.max(0, Math.min(100, Math.round((rawScore / 40) * 100)));

  let verdict: Verdict = "Safe";
  let risk: Risk = "Low";
  if (confidence >= 71) {
    verdict = "Spam";
    risk = "High";
  } else if (confidence >= 41) {
    verdict = "Suspicious";
    risk = "Medium";
  }

  const readingTime = Math.max(1, Math.ceil(words.length / 200));

  return {
    verdict,
    risk,
    confidence,
    reasons,
    detected,
    stats: {
      words: words.length,
      keywords: detected.reduce((a, b) => a + b.count, 0),
      links: links.length,
      exclamations,
      capsPct: Math.round(capsPct),
      readingTime,
      suspiciousLinks,
    },
  };
}
type Analysis = ReturnType<typeof analyze>;

/* ---------------- Counter Hook ---------------- */
function useCounter(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const from = prev.current;
    const delta = target - from;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + delta * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/* ---------------- App ---------------- */
function SpamSenseApp() {
  const [mode, setMode] = useState<Mode>("dark");
  const [theme, setTheme] = useState<ThemeName>("ocean");
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const m = (localStorage.getItem(MODE_KEY) as Mode) || "dark";
      const t = (localStorage.getItem(THEME_KEY) as ThemeName) || "ocean";
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      setMode(m);
      setTheme(t);
      if (Array.isArray(h)) setHistory(h);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-ss-mode", mode);
    document.documentElement.setAttribute("data-ss-theme", theme);
    try {
      localStorage.setItem(MODE_KEY, mode);
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [mode, theme]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* ignore */
    }
  }, [history]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  };

  const stats = useMemo(() => {
    const total = history.length;
    const spam = history.filter((h) => h.verdict === "Spam").length;
    const safe = history.filter((h) => h.verdict === "Safe").length;
    const high = history.filter((h) => h.risk === "High").length;
    const avg = total ? Math.round(history.reduce((a, b) => a + b.confidence, 0) / total) : 0;
    return { total, spam, safe, high, avg };
  }, [history]);

  const cTotal = useCounter(stats.total);
  const cSpam = useCounter(stats.spam);
  const cSafe = useCounter(stats.safe);
  const cHigh = useCounter(stats.high);
  const cAvg = useCounter(stats.avg);

  const handleCheck = (typeLabel = "Manual") => {
    if (!text.trim()) {
      flash("Paste an email to analyze.");
      return;
    }
    const a = analyze(text);
    setAnalysis(a);
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      type: typeLabel,
      verdict: a.verdict,
      confidence: a.confidence,
      risk: a.risk,
      timestamp: Date.now(),
      preview: text.trim().slice(0, 120),
    };
    setHistory((h) => [item, ...h].slice(0, 50));
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleReset = () => {
    setText("");
    setAnalysis(null);
    flash("Cleared.");
  };

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      flash("Copied to clipboard.");
    } catch {
      flash("Copy failed.");
    }
  };

  const handleSample = (s: (typeof SAMPLES)[number]) => {
    setText(s.body);
    setAnalysis(null);
    setTimeout(() => {
      document.getElementById("analyze")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const downloadFile = (name: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!analysis) return flash("Run an analysis first.");
    downloadFile(
      `spamsense-${Date.now()}.json`,
      JSON.stringify({ text, analysis }, null, 2),
      "application/json",
    );
  };

  const downloadPDF = () => {
    if (!analysis) return flash("Run an analysis first.");
    const win = window.open("", "_blank");
    if (!win) return flash("Pop-up blocked.");
    const a = analysis;
    win.document.write(`
      <html><head><title>SpamSense Report</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;padding:32px;color:#0f172a;}
        h1{margin:0 0 4px;font-size:24px;}
        .meta{color:#475569;font-size:12px;margin-bottom:24px}
        .card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px}
        .badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600}
        .spam{background:#fee2e2;color:#991b1b}.safe{background:#dcfce7;color:#166534}.sus{background:#ffedd5;color:#9a3412}
        table{width:100%;border-collapse:collapse;font-size:13px}
        td,th{padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left}
        pre{white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:8px;font-size:12px}
      </style></head><body>
      <h1>SpamSense Report</h1>
      <div class="meta">Generated ${new Date().toLocaleString()}</div>
      <div class="card">
        <span class="badge ${a.verdict === "Spam" ? "spam" : a.verdict === "Safe" ? "safe" : "sus"}">${a.verdict}</span>
        &nbsp;Confidence: <strong>${a.confidence}%</strong> &nbsp; Risk: <strong>${a.risk}</strong>
      </div>
      <div class="card"><h3>Reasons</h3><ul>${a.reasons.map((r) => `<li>${r}</li>`).join("") || "<li>None</li>"}</ul></div>
      <div class="card"><h3>Detected Keywords</h3>
        <table><tr><th>Word</th><th>Category</th><th>Weight</th><th>Count</th></tr>
        ${a.detected.map((d) => `<tr><td>${d.word}</td><td>${d.category}</td><td>${d.weight}</td><td>${d.count}</td></tr>`).join("") || "<tr><td colspan=4>None</td></tr>"}
        </table>
      </div>
      <div class="card"><h3>Email</h3><pre>${text.replace(/</g, "&lt;")}</pre></div>
      <script>window.print()</script>
      </body></html>
    `);
    win.document.close();
  };

  const shareReport = async () => {
    if (!analysis) return flash("Run an analysis first.");
    const summary = `SpamSense → ${analysis.verdict} (${analysis.confidence}% confidence, ${analysis.risk} risk)`;
    try {
      if (navigator.share) await navigator.share({ title: "SpamSense Report", text: summary });
      else {
        await navigator.clipboard.writeText(summary);
        flash("Summary copied to clipboard.");
      }
    } catch {
      /* dismissed */
    }
  };

  const clearHistory = () => {
    setHistory([]);
    flash("History cleared.");
  };

  const scrollTo = (id: string) => {
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="ss-root">
      <BackgroundFX />

      <header className="ss-nav">
        <button className="ss-brand" onClick={() => scrollTo("home")} aria-label="SpamSense home">
          <span className="ss-logo" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <span className="ss-brand-text">
            <span className="ss-brand-name">SpamSense</span>
            <span className="ss-brand-sub">Client-Side Email Spam Classifier</span>
          </span>
        </button>

        <nav className={`ss-links ${navOpen ? "is-open" : ""}`}>
          {NAV_LINKS.map((l) => (
            <button key={l.id} className="ss-link" onClick={() => scrollTo(l.id)}>
              {l.label}
            </button>
          ))}
          <div className="ss-nav-controls">
            <div className="ss-themes" role="group" aria-label="Theme color">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`ss-swatch ${theme === t.id ? "is-active" : ""}`}
                  style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }}
                  title={t.label}
                  aria-label={t.label}
                  onClick={() => setTheme(t.id)}
                />
              ))}
            </div>
            <button
              className="ss-mode"
              onClick={() => setMode(mode === "dark" ? "light" : "dark")}
              aria-label="Toggle dark/light mode"
              title="Toggle dark/light"
            >
              {mode === "dark" ? "☾" : "☀"}
            </button>
          </div>
        </nav>

        <button
          className="ss-burger"
          aria-label="Toggle navigation"
          onClick={() => setNavOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
      </header>

      <section id="home" className="ss-hero">
        <div className="ss-hero-tag">Privacy-first · 100% in-browser</div>
        <h1 className="ss-hero-title">
          Detect spam <span className="ss-grad-text">before it reaches your inbox.</span>
        </h1>
        <p className="ss-hero-desc">
          Paste any email below and analyze it instantly using a transparent keyword and heuristic-based
          model. All processing happens locally in your browser.
        </p>
        <div className="ss-hero-cta">
          <button className="ss-btn ss-btn-primary" onClick={() => scrollTo("analyze")}>
            Analyze Email
          </button>
          <button className="ss-btn ss-btn-ghost" onClick={() => scrollTo("how")}>
            Learn More
          </button>
        </div>

        <div className="ss-stats">
          <StatCard label="Total Emails Checked" value={cTotal} accent="primary" icon="📨" />
          <StatCard label="Spam Detected" value={cSpam} accent="danger" icon="🚫" />
          <StatCard label="Safe Emails" value={cSafe} accent="success" icon="✅" />
          <StatCard label="High-Risk Emails" value={cHigh} accent="warning" icon="⚠️" />
          <StatCard label="Avg Confidence" value={cAvg} suffix="%" accent="info" icon="📊" />
        </div>
      </section>

      <section id="analyze" className="ss-section">
        <SectionHeader eyebrow="Analyzer" title="Try a sample or paste your own" />
        <div className="ss-samples">
          {SAMPLES.map((s) => (
            <button key={s.id} className="ss-chip" onClick={() => handleSample(s)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="ss-card ss-analyzer">
          <textarea
            className="ss-textarea"
            placeholder="Paste the email subject and body here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
          />
          <div className="ss-analyzer-bar">
            <span className="ss-counter">{text.length} chars · {text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
            <div className="ss-actions">
              <button className="ss-btn ss-btn-primary" onClick={() => handleCheck()}>Check Spam</button>
              <button className="ss-btn ss-btn-ghost" onClick={handleReset}>Reset</button>
              <button className="ss-btn ss-btn-ghost" onClick={handleCopy}>Copy</button>
              <button className="ss-btn ss-btn-ghost" onClick={() => setText("")}>Clear</button>
            </div>
          </div>
        </div>

        <div id="results">
          {analysis ? <ResultsCard analysis={analysis} onPDF={downloadPDF} onJSON={exportJSON} onShare={shareReport} /> : (
            <div className="ss-card ss-empty">
              <p>Run an analysis to see the results, risk meter, and breakdown.</p>
            </div>
          )}
        </div>
      </section>

      <section id="features" className="ss-section">
        <SectionHeader eyebrow="Features" title="Everything you need, nothing you don't" />
        <div className="ss-grid-3">
          {[
            ["Privacy First", "Nothing leaves your browser. Ever.", "🔒"],
            ["Client-Side Processing", "Pure JavaScript heuristics — no servers.", "⚡"],
            ["Keyword Detection", "Weighted dictionary of known spam triggers.", "🔍"],
            ["Heuristic Analysis", "Caps %, urgency, punctuation, links.", "🧠"],
            ["Confidence Scoring", "Transparent 0–100% probability score.", "📈"],
            ["Theme Customization", "Five accents + light/dark toggle.", "🎨"],
            ["Analysis History", "Recent checks saved locally.", "🗂️"],
            ["Responsive Design", "Looks great on phone, tablet, desktop.", "📱"],
          ].map(([t, d, i]) => (
            <article key={t} className="ss-card ss-feature">
              <div className="ss-feature-icon">{i}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="ss-section">
        <SectionHeader eyebrow="How It Works" title="A transparent, five-step pipeline" />
        <ol className="ss-timeline">
          {[
            ["Paste Email", "Drop in subject + body. No upload, no tracking."],
            ["Keyword Detection", "Scan against a weighted spam dictionary."],
            ["Heuristic Analysis", "Evaluate caps %, urgency, links, punctuation."],
            ["Risk Calculation", "Combine signals into a normalized confidence score."],
            ["Final Prediction", "Verdict + risk level + reasons you can audit."],
          ].map(([t, d], i) => (
            <li key={t} className="ss-step">
              <div className="ss-step-num">{i + 1}</div>
              <div className="ss-step-body">
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="history" className="ss-section">
        <SectionHeader
          eyebrow="History"
          title="Recent analyses"
          action={
            <button className="ss-btn ss-btn-ghost ss-btn-sm" onClick={clearHistory}>
              Clear History
            </button>
          }
        />
        {history.length === 0 ? (
          <div className="ss-card ss-empty">
            <p>No analyses yet. Run a check to start building your history.</p>
          </div>
        ) : (
          <div className="ss-history">
            {history.map((h) => (
              <article key={h.id} className={`ss-history-item ss-v-${h.verdict.toLowerCase()}`}>
                <div className="ss-history-top">
                  <span className={`ss-badge ss-badge-${h.verdict.toLowerCase()}`}>{h.verdict}</span>
                  <span className="ss-history-type">{h.type}</span>
                  <span className="ss-history-time">{new Date(h.timestamp).toLocaleString()}</span>
                </div>
                <p className="ss-history-preview">{h.preview}{h.preview.length >= 120 && "…"}</p>
                <div className="ss-history-bar">
                  <div className="ss-history-fill" style={{ width: `${h.confidence}%` }} />
                </div>
                <div className="ss-history-meta">
                  <span>{h.confidence}% confidence</span>
                  <span>Risk: {h.risk}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="about" className="ss-section">
        <SectionHeader eyebrow="About" title="What is SpamSense?" />
        <div className="ss-card ss-about">
          <p>
            <strong>SpamSense</strong> is a privacy-focused spam classifier built with HTML, CSS, and
            JavaScript. It uses a transparent combination of keyword matching and heuristic signals to
            score emails on a 0–100 confidence scale — entirely in your browser. No data is uploaded,
            stored remotely, or shared.
          </p>
        </div>
      </section>

      <section className="ss-section">
        <SectionHeader eyebrow="Tech Stack" title="Built with web fundamentals" />
        <div className="ss-grid-3">
          <div className="ss-card ss-stack">
            <h3>Frontend</h3>
            <ul><li>HTML5</li><li>CSS3</li><li>JavaScript</li></ul>
          </div>
          <div className="ss-card ss-stack">
            <h3>Storage</h3>
            <ul><li>Local Storage</li></ul>
          </div>
          <div className="ss-card ss-stack">
            <h3>Deployment</h3>
            <ul><li>GitHub Pages</li><li>Vercel</li><li>Netlify</li></ul>
          </div>
        </div>
      </section>

      <section className="ss-section">
        <SectionHeader eyebrow="Future Enhancements" title="Where SpamSense is headed" />
        <div className="ss-grid-3">
          {[
            ["Naive Bayes", "Probabilistic text classification.", "📐"],
            ["SVM", "Support-vector machine model.", "🧮"],
            ["AI Classification", "LLM-assisted reasoning.", "🤖"],
            ["Browser Extension", "Right-click any email to scan.", "🧩"],
            ["Gmail Integration", "Inline verdict in Gmail.", "📬"],
            ["Mobile App", "iOS + Android companion.", "📱"],
          ].map(([t, d, i]) => (
            <article key={t} className="ss-card ss-future">
              <div className="ss-feature-icon">{i}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="ss-footer">
        <div className="ss-footer-top">
          <div className="ss-footer-brand">
            <div className="ss-brand-name">SpamSense</div>
            <div className="ss-brand-sub">Client-Side Email Spam Classifier</div>
            <p className="ss-footer-note">Built with HTML, CSS &amp; JavaScript</p>
            <p className="ss-footer-credit">Designed &amp; Developed by <strong>Nithin Kumar</strong></p>
          </div>
          <div className="ss-footer-links">
            <a href="#" aria-label="GitHub">GitHub</a>
            <a href="#" aria-label="LinkedIn">LinkedIn</a>
            <a href="#" aria-label="Portfolio">Portfolio</a>
          </div>
        </div>
        <div className="ss-footer-bottom">© 2026 SpamSense. All Rights Reserved.</div>
      </footer>

      {toast && <div className="ss-toast">{toast}</div>}
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */
function BackgroundFX() {
  return (
    <div className="ss-bg" aria-hidden>
      <div className="ss-orb ss-orb-1" />
      <div className="ss-orb ss-orb-2" />
      <div className="ss-orb ss-orb-3" />
      <div className="ss-grid" />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ss-section-head">
      <div>
        <div className="ss-eyebrow">{eyebrow}</div>
        <h2 className="ss-section-title">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  accent,
  icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent: "primary" | "danger" | "success" | "warning" | "info";
  icon: string;
}) {
  return (
    <article className={`ss-stat ss-stat-${accent}`}>
      <div className="ss-stat-icon" aria-hidden>{icon}</div>
      <div className="ss-stat-value">{value}{suffix}</div>
      <div className="ss-stat-label">{label}</div>
    </article>
  );
}

function ResultsCard({
  analysis,
  onPDF,
  onJSON,
  onShare,
}: {
  analysis: Analysis;
  onPDF: () => void;
  onJSON: () => void;
  onShare: () => void;
}) {
  const { verdict, risk, confidence, reasons, detected, stats } = analysis;
  const v = verdict.toLowerCase();
  return (
    <div className={`ss-card ss-results ss-v-${v}`}>
      <div className="ss-results-head">
        <div className={`ss-status ss-status-${v}`}>
          <span className="ss-status-icon" aria-hidden>
            {verdict === "Spam" ? "⛔" : verdict === "Safe" ? "🛡️" : "⚠️"}
          </span>
          <div>
            <div className="ss-status-verdict">{verdict}</div>
            <div className="ss-status-sub">{confidence}% confidence · {risk} risk</div>
          </div>
        </div>
        <div className={`ss-badge ss-badge-${risk.toLowerCase()}`}>{risk} Risk</div>
      </div>

      <div className="ss-bar">
        <div className={`ss-bar-fill ss-bar-${v}`} style={{ width: `${confidence}%` }} />
      </div>

      <div className="ss-meter">
        <span className={risk === "Low" ? "is-on" : ""}>Low</span>
        <span className={risk === "Medium" ? "is-on" : ""}>Medium</span>
        <span className={risk === "High" ? "is-on" : ""}>High</span>
      </div>

      <div className="ss-results-grid">
        <div>
          <h4>Reasons</h4>
          {reasons.length ? (
            <ul className="ss-reasons">
              {reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          ) : (
            <p className="ss-dim">No suspicious signals detected.</p>
          )}
        </div>
        <div>
          <h4>Detected Keywords</h4>
          {detected.length ? (
            <div className="ss-keywords">
              {detected.map((d) => (
                <span key={d.word} className="ss-kw" title={`${d.category} · weight ${d.weight}`}>
                  {d.word}<sup>×{d.count}</sup>
                </span>
              ))}
            </div>
          ) : (
            <p className="ss-dim">No spam keywords matched.</p>
          )}
        </div>
      </div>

      <div className="ss-stat-grid">
        <Mini label="Words" value={stats.words} />
        <Mini label="Spam keywords" value={stats.keywords} />
        <Mini label="Links" value={stats.links} />
        <Mini label="Suspicious links" value={stats.suspiciousLinks} />
        <Mini label="Exclamations" value={stats.exclamations} />
        <Mini label="Caps %" value={`${stats.capsPct}%`} />
        <Mini label="Reading time" value={`${stats.readingTime} min`} />
      </div>

      <div className="ss-results-actions">
        <button className="ss-btn ss-btn-primary" onClick={onPDF}>Download PDF</button>
        <button className="ss-btn ss-btn-ghost" onClick={onJSON}>Export JSON</button>
        <button className="ss-btn ss-btn-ghost" onClick={onShare}>Share Report</button>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="ss-mini">
      <div className="ss-mini-value">{value}</div>
      <div className="ss-mini-label">{label}</div>
    </div>
  );
}

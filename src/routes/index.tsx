import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpamSense — AI Spam Email Classifier" },
      {
        name: "description",
        content:
          "Detect spam emails instantly with a modern, client-side classifier. Probability scoring, keyword highlighting, and history tracking.",
      },
      { property: "og:title", content: "SpamSense — Spam Email Classifier" },
      {
        property: "og:description",
        content: "Modern client-side spam classifier with probability scoring and history.",
      },
    ],
  }),
  component: Index,
});

/* ------------------------------ Classifier ------------------------------ */

const SPAM_KEYWORDS: { word: string; weight: number }[] = [
  { word: "free", weight: 8 },
  { word: "winner", weight: 12 },
  { word: "won", weight: 9 },
  { word: "prize", weight: 11 },
  { word: "cash", weight: 9 },
  { word: "urgent", weight: 10 },
  { word: "act now", weight: 12 },
  { word: "limited time", weight: 10 },
  { word: "click here", weight: 12 },
  { word: "click below", weight: 10 },
  { word: "buy now", weight: 10 },
  { word: "cheap", weight: 6 },
  { word: "discount", weight: 6 },
  { word: "offer", weight: 5 },
  { word: "guarantee", weight: 7 },
  { word: "risk free", weight: 10 },
  { word: "credit card", weight: 9 },
  { word: "loan", weight: 7 },
  { word: "investment", weight: 6 },
  { word: "bitcoin", weight: 8 },
  { word: "crypto", weight: 7 },
  { word: "lottery", weight: 14 },
  { word: "viagra", weight: 18 },
  { word: "pharmacy", weight: 10 },
  { word: "weight loss", weight: 9 },
  { word: "miracle", weight: 8 },
  { word: "congratulations", weight: 9 },
  { word: "claim", weight: 8 },
  { word: "verify your account", weight: 12 },
  { word: "password", weight: 6 },
  { word: "ssn", weight: 12 },
  { word: "wire transfer", weight: 11 },
  { word: "nigerian prince", weight: 20 },
  { word: "inheritance", weight: 9 },
  { word: "100%", weight: 6 },
  { word: "$$$", weight: 12 },
  { word: "earn money", weight: 10 },
  { word: "make money fast", weight: 14 },
  { word: "work from home", weight: 7 },
  { word: "no obligation", weight: 7 },
  { word: "pre-approved", weight: 9 },
  { word: "subscribe", weight: 4 },
  { word: "unsubscribe", weight: 4 },
];

type HeuristicHit = { label: string; detail: string; points: number };

type Verdict = "spam" | "safe" | "suspicious";

type Analysis = {
  verdict: Verdict;
  probability: number;
  matches: { word: string; count: number; weight: number; points: number }[];
  heuristics: HeuristicHit[];
  keywordScore: number;
  heuristicScore: number;
  totalScore: number;
  threshold: number;
  normalizer: number;
  highlighted: string;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SCORE_NORMALIZER = 60;

function analyze(text: string): Analysis {
  const safe = escapeHtml(text);
  let highlighted = safe;
  const matches: Analysis["matches"] = [];
  let keywordScore = 0;

  for (const { word, weight } of SPAM_KEYWORDS) {
    const re = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    const found = safe.match(re);
    if (found && found.length > 0) {
      const points = weight * found.length;
      matches.push({ word, count: found.length, weight, points });
      keywordScore += points;
      highlighted = highlighted.replace(re, (m) => `<mark class="ss-mark">${m}</mark>`);
    }
  }
  matches.sort((a, b) => b.points - a.points);

  const heuristics: HeuristicHit[] = [];
  const exclam = (text.match(/!/g) || []).length;
  if (exclam >= 3) {
    const pts = Math.min(exclam * 2, 14);
    heuristics.push({
      label: "Excessive exclamation marks",
      detail: `${exclam} "!" found → min(${exclam}×2, 14)`,
      points: pts,
    });
  }
  const upperWords = (text.match(/\b[A-Z]{4,}\b/g) || []).length;
  if (upperWords > 0) {
    const pts = Math.min(upperWords * 4, 16);
    heuristics.push({
      label: "ALL-CAPS words",
      detail: `${upperWords} caps word${upperWords > 1 ? "s" : ""} → min(${upperWords}×4, 16)`,
      points: pts,
    });
  }
  const links = (text.match(/https?:\/\/\S+/gi) || []).length;
  if (links > 0) {
    const pts = Math.min(links * 5, 15);
    heuristics.push({
      label: "Embedded links",
      detail: `${links} URL${links > 1 ? "s" : ""} → min(${links}×5, 15)`,
      points: pts,
    });
  }

  const heuristicScore = heuristics.reduce((s, h) => s + h.points, 0);
  const totalScore = keywordScore + heuristicScore;
  const probability = Math.max(0, Math.min(100, Math.round((totalScore / SCORE_NORMALIZER) * 100)));
  const verdict: Verdict =
    probability >= 71 ? "spam" : probability >= 41 ? "suspicious" : "safe";

  return {
    verdict,
    probability,
    matches,
    heuristics,
    keywordScore,
    heuristicScore,
    totalScore,
    threshold: 50,
    normalizer: SCORE_NORMALIZER,
    highlighted,
  };
}

/* --------------------------------- UI ---------------------------------- */

type HistoryItem = {
  id: string;
  ts: number;
  preview: string;
  verdict: Verdict;
  probability: number;
};

const STORAGE_KEY = "spamsense.history.v1";

const SAMPLE_EMAILS: { label: string; tone: "spam" | "suspicious" | "safe"; text: string }[] = [
  {
    label: "Obvious spam",
    tone: "spam",
    text: `CONGRATULATIONS!!! You are a WINNER of our $5,000,000 lottery prize!\n\nAct now — claim your CASH reward before this limited time offer expires. Click here: http://win-now.example.com/claim\n\nJust verify your account and credit card to receive your inheritance via wire transfer. 100% risk free, no obligation. Make money fast from home!`,
  },
  {
    label: "Suspicious promo",
    tone: "suspicious",
    text: `Hi there,\n\nWe noticed you haven't used your account in a while. Enjoy 50% discount on your next order — limited time only.\n\nClick below to claim the offer: https://promo.example.com/deal\n\nThanks,\nThe Team`,
  },
  {
    label: "Safe email",
    tone: "safe",
    text: `Hi Alex,\n\nThanks for the notes from yesterday's meeting. I've added the action items to the shared doc and will circle back on Thursday with the updated roadmap.\n\nLet me know if you'd like to move the sync earlier.\n\nBest,\nJordan`,
  },
];

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCSV(history: HistoryItem[]) {
  const header = ["timestamp", "verdict", "probability", "preview"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = history.map((h) =>
    [new Date(h.ts).toISOString(), h.verdict, String(h.probability), h.preview]
      .map(esc)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function Index() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [checking, setChecking] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);




  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

  const stats = useMemo(() => {
    const total = history.length;
    const spam = history.filter((h) => h.verdict === "spam").length;
    const suspicious = history.filter((h) => h.verdict === "suspicious").length;
    return { total, spam, suspicious, safe: total - spam - suspicious };
  }, [history]);

  function handleCheck() {
    if (!text.trim()) return;
    setChecking(true);
    setTimeout(() => {
      const a = analyze(text);
      setResult(a);
      const item: HistoryItem = {
        id: crypto.randomUUID(),
        ts: Date.now(),
        preview: text.slice(0, 120),
        verdict: a.verdict,
        probability: a.probability,
      };
      setHistory((h) => [item, ...h].slice(0, 25));
      setChecking(false);
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }, 450);
  }

  function clearHistory() {
    setHistory([]);
  }

  return (
    <div className="ss-root">
      <BackgroundFX />

      <header className="ss-header">
        <div className="ss-brand">
          <div className="ss-logo" aria-hidden>
            <span />
          </div>
          <div>
            <div className="ss-brand-name">SpamSense</div>
            <div className="ss-brand-sub">Client-side Email Spam Classifier</div>
          </div>
        </div>
      </header>



      <main className="ss-main">
        <section className="ss-hero">
          <h1 className="ss-h1">
            Detect <span className="ss-grad">spam</span> before it reaches your inbox.
          </h1>
          <p className="ss-lead">
            Paste any email below and analyze it instantly using a transparent
            keyword and heuristic-based model — all processed locally in your browser.
          </p>
        </section>

        <section className="ss-grid">
          <StatCard label="Total Emails Checked" value={stats.total} tone="neutral" />
          <StatCard label="Spam Detected" value={stats.spam} tone="danger" />
          <StatCard label="Safe Emails" value={stats.safe} tone="success" />
        </section>

        <section className="ss-card ss-editor">
          <div className="ss-card-head">
            <h2>Analyze an Email</h2>
            <span className="ss-count">{text.length} characters</span>
          </div>
          <div className="ss-samples">
            <span className="ss-samples-label">Try a sample:</span>
            {SAMPLE_EMAILS.map((s) => (
              <button
                key={s.label}
                className={`ss-sample ss-sample-${s.tone}`}
                onClick={() => {
                  setText(s.text);
                  setResult(null);
                }}
                type="button"
              >
                {s.label}
              </button>
            ))}
          </div>
          <textarea
            className="ss-textarea"
            placeholder="Paste the email subject and body here to check whether it is spam or safe..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
          />
          <div className="ss-actions">
            <button
              className="ss-btn ss-btn-primary"
              onClick={handleCheck}
              disabled={!text.trim() || checking}
            >
              {checking ? "Analyzing…" : "Check Spam"}
            </button>
            <button
              className="ss-btn ss-btn-ghost"
              onClick={() => {
                setText("");
                setResult(null);
              }}
              disabled={!text && !result}
            >
              Reset
            </button>
          </div>
          <p className="ss-privacy">
            🔒 Your email content never leaves your device. All analysis runs
            locally in your browser.
          </p>
        </section>



        {result && (
          <section ref={resultRef} className="ss-card ss-result ss-fade">
            <div className="ss-result-head">
              <div className={`ss-verdict ss-verdict-${result.verdict}`}>
                <span className="ss-verdict-dot" />
                {result.verdict === "spam"
                  ? "Spam Detected"
                  : result.verdict === "suspicious"
                  ? "Suspicious"
                  : "Looks Safe"}
              </div>
              <div className="ss-prob">
                <div className="ss-prob-num">{result.probability}%</div>
                <div className="ss-prob-label">spam probability</div>
              </div>
            </div>

            <div className="ss-meter">
              <div
                className={`ss-meter-fill ss-meter-${result.verdict}`}
                style={{ width: `${result.probability}%` }}
              />
            </div>

            <div className="ss-section-label">Highlighted content</div>
            <div
              className="ss-highlighted"
              dangerouslySetInnerHTML={{ __html: result.highlighted || "<em>(empty)</em>" }}
            />

            <div className="ss-section-label">Triggered signals</div>
            {result.matches.length === 0 ? (
              <p className="ss-muted">No spam keywords detected.</p>
            ) : (
              <div className="ss-chips">
                {result.matches.map((m) => (
                  <span key={m.word} className="ss-chip">
                    {m.word}
                    <span className="ss-chip-x">×{m.count}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="ss-section-label">How this score was computed</div>
            <div className="ss-explain">
              <p className="ss-explain-intro">
                Each spam keyword carries a fixed <b>weight</b>. Every occurrence
                contributes <code>weight × count</code> points. Structural
                heuristics (caps, exclamations, links) add bounded points on
                top. The total is normalized to a probability:
                <br />
                <code className="ss-formula">
                  probability = clamp(round(total / {result.normalizer} × 100), 0, 100)
                </code>
                <br />
                Anything ≥ <b>{result.threshold}%</b> is flagged as spam.
              </p>

              {result.matches.length > 0 && (
                <>
                  <div className="ss-explain-subhead">Keyword contributions</div>
                  <div className="ss-breakdown">
                    <div className="ss-bd-row ss-bd-head">
                      <span>Keyword</span>
                      <span>Weight</span>
                      <span>Count</span>
                      <span>Points</span>
                    </div>
                    {result.matches.map((m) => {
                      const share = result.totalScore
                        ? (m.points / result.totalScore) * 100
                        : 0;
                      return (
                        <div key={m.word} className="ss-bd-row">
                          <span className="ss-bd-word">{m.word}</span>
                          <span>{m.weight}</span>
                          <span>×{m.count}</span>
                          <span className="ss-bd-points">
                            <span className="ss-bd-bar">
                              <span
                                className="ss-bd-bar-fill"
                                style={{ width: `${share}%` }}
                              />
                            </span>
                            +{m.points}
                          </span>
                        </div>
                      );
                    })}
                    <div className="ss-bd-row ss-bd-sub">
                      <span>Keyword subtotal</span>
                      <span></span>
                      <span></span>
                      <span className="ss-bd-points">+{result.keywordScore}</span>
                    </div>
                  </div>
                </>
              )}

              {result.heuristics.length > 0 && (
                <>
                  <div className="ss-explain-subhead">Heuristic contributions</div>
                  <div className="ss-breakdown">
                    {result.heuristics.map((h) => (
                      <div key={h.label} className="ss-bd-row ss-bd-heur">
                        <span className="ss-bd-word">{h.label}</span>
                        <span className="ss-bd-detail">{h.detail}</span>
                        <span></span>
                        <span className="ss-bd-points">+{h.points}</span>
                      </div>
                    ))}
                    <div className="ss-bd-row ss-bd-sub">
                      <span>Heuristic subtotal</span>
                      <span></span>
                      <span></span>
                      <span className="ss-bd-points">+{result.heuristicScore}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="ss-total">
                <div className="ss-total-line">
                  <span>Total raw score</span>
                  <span className="ss-total-num">{result.totalScore}</span>
                </div>
                <div className="ss-total-line">
                  <span>÷ normalizer ({result.normalizer}) × 100</span>
                  <span>
                    {result.totalScore} / {result.normalizer} × 100 ={" "}
                    {Math.round((result.totalScore / result.normalizer) * 100)}
                  </span>
                </div>
                <div className="ss-total-line ss-total-final">
                  <span>Final probability (clamped 0–100)</span>
                  <span className="ss-total-num">{result.probability}%</span>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="ss-card ss-history">
          <div className="ss-card-head">
            <h2>Recent Analysis</h2>
            {history.length > 0 && (
              <button className="ss-link" onClick={clearHistory}>
                Clear history
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="ss-muted">No emails analyzed yet. Run your first check above.</p>
          ) : (
            <ul className="ss-list">
              {history.map((h) => (
                <li key={h.id} className="ss-list-item">
                  <span className={`ss-badge ss-badge-${h.verdict}`}>
                    {h.verdict.toUpperCase()}
                  </span>
                  <span className="ss-list-preview">{h.preview || "(empty)"}</span>
                  <span className="ss-list-prob">{h.probability}%</span>
                  <span className="ss-list-ts">{new Date(h.ts).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "danger" | "success";
}) {
  return (
    <div className={`ss-stat ss-stat-${tone}`}>
      <div className="ss-stat-label">{label}</div>
      <div className="ss-stat-value">{value}</div>
      <div className="ss-stat-glow" aria-hidden />
    </div>
  );
}

function BackgroundFX() {
  return (
    <div className="ss-bg" aria-hidden>
      <div className="ss-bg-orb ss-bg-orb-1" />
      <div className="ss-bg-orb ss-bg-orb-2" />
      <div className="ss-bg-grid" />
    </div>
  );
}

# SpamSense — Client-Side Email Spam Classifier

A fast, private spam classifier that analyzes emails **entirely in your browser**. No backend, no tracking, no data ever leaves your device.

## ✨ Features

- 🔍 **Weighted keyword scoring** — 30+ spam phrases with calibrated weights
- 🧠 **Heuristic rules** — detects ALL-CAPS bursts, excessive `!`, suspicious links
- 📊 **Live dashboard** — Total Checked / Spam Detected / Safe Emails
- 🎯 **Confidence & Risk Level** — 0–100% score mapped to Low / Medium / High
- 🏷 **Detected keywords** highlighted in the result
- 📚 **Local history** — last 25 analyses persisted via `localStorage`
- 🎨 **Dark / Light mode** + 5 accent themes
- 📱 **Fully responsive** — mobile and desktop
- 📩 **Sample emails** — Obvious Spam, Promotion, Safe Email, College Notice

## 🧪 How Detection Works

1. **Keyword Scoring** — every match adds a weighted score
2. **Heuristic Rules** — caps ratio, exclamation density, link count add to the score
3. **Verdict & Risk** — normalized to 0–100% → Spam/Safe + Low/Medium/High

## 🛠 Tech Stack

- HTML, CSS, JavaScript (React + TanStack Start)
- Vite build tooling
- 100% client-side — no backend, no database

## 🚀 Getting Started

```bash
# install
npm install

# dev
npm run dev

# production build
npm run build
```

## 📁 Project Structure

```
src/
├── routes/
│   ├── __root.tsx     # root layout
│   └── index.tsx      # SpamSense app
└── styles.css         # design tokens + UI
```

## 📜 License

MIT © 2026 Nithin Kumar — see [LICENSE](./LICENSE).

## 👤 Author

**Designed & Developed by Nithin Kumar**

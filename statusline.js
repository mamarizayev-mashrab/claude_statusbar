#!/usr/bin/env node
// Claude Code status line (bitta qator):
//   papka · branch · model · kontekst bar · 5-soatlik / haftalik / $ limitlar
//   (bar, foiz, reset soati va qolgan vaqt)
// Kirish: stdin orqali JSON (rate_limits.five_hour / .seven_day: used_percentage, resets_at).

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let d = {};
  try {
    d = JSON.parse(raw);
  } catch {}
  try {
    process.stdout.write(render(d));
  } catch (e) {
    process.stdout.write("statusline error: " + e.message);
  }
});

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const GRAY = "\x1b[90m";

const SEP = GRAY + "  │  " + RESET;
const BAR_WIDTH = 8;
const WEEKDAYS = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

function heat(pct) {
  if (pct >= 90) return RED;
  if (pct >= 70) return YELLOW;
  return GREEN;
}

function bar(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * BAR_WIDTH);
  return (
    heat(pct) + "━".repeat(filled) + RESET +
    GRAY + "━".repeat(BAR_WIDTH - filled) + RESET
  );
}

function short(p) {
  if (!p) return "";
  const s = String(p).replace(/[\\/]+$/, "");
  const i = Math.max(s.lastIndexOf("/"), s.lastIndexOf("\\"));
  return (i >= 0 ? s.slice(i + 1) : s) || s;
}

// resets_at: unix soniya (yoki ms / ISO satr) -> Date
function toDate(resetsAt) {
  if (typeof resetsAt === "number" && isFinite(resetsAt)) {
    return new Date(resetsAt < 1e12 ? resetsAt * 1000 : resetsAt);
  }
  if (typeof resetsAt === "string" && resetsAt) {
    const n = Number(resetsAt);
    if (isFinite(n)) return toDate(n);
    const t = Date.parse(resetsAt);
    if (isFinite(t)) return new Date(t);
  }
  return null;
}

const pad = (n) => String(n).padStart(2, "0");

// Qolgan vaqt: "45d", "2s10d", "3kun4s"
function left(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return m + "d";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "s" + (m % 60 ? (m % 60) + "d" : "");
  const days = Math.floor(h / 24);
  return days + "kun" + (h % 24 ? (h % 24) + "s" : "");
}

// Reset vaqti: bugun bo'lsa "14:30", aks holda "Pa 09:00"
function when(date) {
  const now = new Date();
  const hm = pad(date.getHours()) + ":" + pad(date.getMinutes());
  if (date.toDateString() === now.toDateString()) return hm;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return "ertaga " + hm;
  return WEEKDAYS[date.getDay()] + " " + pad(date.getDate()) + "." + pad(date.getMonth() + 1) + " " + hm;
}

function resetInfo(resetsAt) {
  const date = toDate(resetsAt);
  if (!date) return "";
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return GREEN + " ↻ yangilandi" + RESET;
  return (
    GRAY + " ↻ " + RESET + when(date) +
    GRAY + " (" + left(ms) + ")" + RESET
  );
}

function limit(label, win) {
  if (!win || typeof win.used_percentage !== "number") return null;
  const pct = Math.round(win.used_percentage);
  return (
    DIM + label + RESET + " " + bar(pct) + " " +
    heat(pct) + BOLD + pct + "%" + RESET +
    resetInfo(win.resets_at)
  );
}

// Branch JSON'da kelmaydi: .git/HEAD faylidan o'qiladi (git jarayonini ishga tushirmasdan).
function gitBranch(startDir) {
  if (!startDir) return "";
  const fs = require("fs");
  const path = require("path");
  let dir = path.resolve(startDir);
  for (;;) {
    const gitPath = path.join(dir, ".git");
    try {
      let gitDir = gitPath;
      if (fs.statSync(gitPath).isFile()) {
        const m = fs.readFileSync(gitPath, "utf8").match(/^gitdir:\s*(.+)$/m);
        if (!m) return "";
        gitDir = path.resolve(dir, m[1].trim());
      }
      const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
      const ref = head.match(/^ref: refs\/heads\/(.+)$/);
      return ref ? ref[1] : head.slice(0, 7);
    } catch {}
    const parent = path.dirname(dir);
    if (parent === dir) return "";
    dir = parent;
  }
}

function headerLine(d) {
  const parts = [];

  const cwd = d.workspace?.current_dir || d.cwd;
  const dir = short(cwd);
  const branch =
    d.workspace?.git_worktree?.branch || d.workspace?.repo?.branch || gitBranch(cwd);
  if (dir) {
    parts.push(
      CYAN + BOLD + dir + RESET +
      (branch ? GRAY + " ⎇ " + RESET + MAGENTA + branch + RESET : "")
    );
  }

  const model = d.model?.display_name;
  if (model) parts.push(model);

  const ctx = d.context_window?.used_percentage;
  if (typeof ctx === "number") {
    const p = Math.round(ctx);
    parts.push(DIM + "ctx" + RESET + " " + bar(p) + " " + heat(p) + p + "%" + RESET);
  }

  return parts.join(SEP);
}

function limitsLine(d) {
  const rl = d.rate_limits;
  if (!rl) return "";
  return [
    limit("5 soat", rl.five_hour),
    limit("hafta", rl.seven_day),
    limit("$", rl.spend_limit),
  ]
    .filter(Boolean)
    .join(SEP);
}

function render(d) {
  return [headerLine(d), limitsLine(d)].filter(Boolean).join(SEP);
}

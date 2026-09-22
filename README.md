# Claude Code Status Bar (statusline.js)

Claude Code uchun bitta qatorli maxsus status bar. Ko'rsatadi:

```
papka ⎇ branch  │  Opus 5  │  ctx ━━━━━━━━ 42%  │  5 soat ━━━━━━━━ 31% ↻ 14:30 (2s10d)  │  hafta ━━━━━━━━ 12% ↻ Pa 09:00 (3kun4s)
```

- **papka** — joriy ish katalogi nomi (cyan, qalin)
- **⎇ branch** — git branch (`.git/HEAD` dan to'g'ridan-to'g'ri o'qiladi, `git` jarayoni ishga tushirilmaydi)
- **model** — Claude modelining ko'rinadigan nomi
- **ctx** — kontekst oynasi to'lganligi (bar + foiz)
- **5 soat / hafta / $** — rate limitlar: bar, foiz, reset vaqti va qolgan vaqt

Barlar rangi issiqlik bo'yicha: `<70%` yashil, `70–89%` sariq, `>=90%` qizil.

---

## 1. Status bar qanday ishlaydi

Claude Code har bir yangilanishda `statusLine.command` da ko'rsatilgan buyruqni ishga tushiradi va
**stdin orqali JSON** uzatadi. Buyruq stdout ga nima chiqarsa — o'sha status barda ko'rinadi
(ANSI rang kodlari qo'llab-quvvatlanadi).

Kiruvchi JSON dan foydalanilgan maydonlar:

| Maydon | Ma'nosi |
|---|---|
| `workspace.current_dir` / `cwd` | joriy katalog |
| `workspace.git_worktree.branch` | branch (bo'lmasa `.git/HEAD` dan o'qiladi) |
| `model.display_name` | model nomi |
| `context_window.used_percentage` | kontekst foizi |
| `rate_limits.five_hour` | `{ used_percentage, resets_at }` |
| `rate_limits.seven_day` | `{ used_percentage, resets_at }` |
| `rate_limits.spend_limit` | `{ used_percentage, resets_at }` |

`resets_at` uch xil formatda kelishi mumkin — unix soniya, millisekund yoki ISO satr.
`toDate()` funksiyasi uchalasini ham to'g'ri Date ga aylantiradi.

## 2. Skriptning tuzilishi

| Funksiya | Vazifasi |
|---|---|
| `heat(pct)` | foizga qarab rang tanlaydi (yashil/sariq/qizil) |
| `bar(pct)` | 8 belgilik `━` progress bar chizadi |
| `short(path)` | to'liq yo'ldan faqat oxirgi papka nomini oladi |
| `toDate(resetsAt)` | unix/ms/ISO → `Date` |
| `left(ms)` | qolgan vaqt: `45d`, `2s10d`, `3kun4s` |
| `when(date)` | reset vaqti: bugun `14:30`, ertaga `ertaga 09:00`, aks holda `Pa 05.10 09:00` |
| `resetInfo()` | `↻ vaqt (qolgan)` qismini yig'adi |
| `limit(label, win)` | bitta limit blokini yig'adi |
| `gitBranch(dir)` | `.git/HEAD` ni yuqoriga qarab qidirib branch nomini oladi (worktree/submodule uchun `gitdir:` ham) |
| `headerLine(d)` | papka + branch + model + ctx |
| `limitsLine(d)` | 5 soat + hafta + $ |
| `render(d)` | ikkalasini `│` bilan birlashtiradi |

Muhim tafsilotlar:

- **`git` chaqirilmaydi.** Har yangilanishda protsess ochish sekin bo'lgani uchun branch fayldan o'qiladi.
- **Xatolar yutilmaydi:** `render` xato bersa, status barda `statusline error: ...` ko'rinadi.
- **Yo'q maydonlar o'tkazib yuboriladi:** `filter(Boolean)` tufayli JSON da bo'lmagan bo'lim shunchaki chiqmaydi.

## 3. O'rnatish

1. `statusline.js` ni nusxalang:

   ```bash
   cp statusline.js ~/.claude/statusline.js
   ```

   Windows (PowerShell):

   ```powershell
   Copy-Item statusline.js "$env:USERPROFILE\.claude\statusline.js"
   ```

2. `~/.claude/settings.json` ga qo'shing:

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node C:/Users/<USER>/.claude/statusline.js",
       "padding": 0,
       "refreshInterval": 30
     }
   }
   ```

   macOS/Linux uchun: `"command": "node ~/.claude/statusline.js"`.

3. Claude Code ni qayta ishga tushiring.

## 4. Tekshirish (Claude Code siz)

```bash
echo '{"workspace":{"current_dir":"/home/me/proj"},"model":{"display_name":"Opus 5"},"context_window":{"used_percentage":42},"rate_limits":{"five_hour":{"used_percentage":31,"resets_at":1790000000},"seven_day":{"used_percentage":88,"resets_at":1790300000}}}' | node statusline.js
```

Rangli bitta qator chiqsa — ishlayapti.

## 5. Sozlash

- `BAR_WIDTH` — bar uzunligi (standart `8`)
- `SEP` — bo'limlar orasidagi ajratgich (standart `  │  `)
- `heat()` dagi `90` va `70` — rang chegaralari
- `WEEKDAYS` — hafta kunlari qisqartmalari
- `limitsLine()` — kerakmas limitni o'chirib tashlash mumkin

## Talablar

- Node.js (tashqi paketlarsiz, faqat `fs` va `path`)
- ANSI ranglarni qo'llab-quvvatlaydigan terminal

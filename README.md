<div align="center">

```
в–€в–€в–€в–€в–€в–€в•— в–€в–€в•—в–€в–€в•—  в–€в–€в•—в–€в–€в–€в•—   в–€в–€в–€в•—в–€в–€в•—в–€в–€в–€в–€в–€в–€в–€в•—в–€в–€в–€в–€в–€в–€в–€в–€в•—
в–€в–€в•”в•ђв•ђв–€в–€в•—в–€в–€в•‘в–€в–€в•‘ в–€в–€в•”в•ќв–€в–€в–€в–€в•— в–€в–€в–€в–€в•‘в–€в–€в•‘в–€в–€в•”в•ђв•ђв•ђв•ђв•ќв•љв•ђв•ђв–€в–€в•”в•ђв•ђв•ќ
в–€в–€в–€в–€в–€в–€в•”в•ќв–€в–€в•‘в–€в–€в–€в–€в–€в•”в•ќ в–€в–€в•”в–€в–€в–€в–€в•”в–€в–€в•‘в–€в–€в•‘в–€в–€в–€в–€в–€в–€в–€в•—   в–€в–€в•‘
в–€в–€в•”в•ђв•ђв•ђв•ќ в–€в–€в•‘в–€в–€в•”в•ђв–€в–€в•— в–€в–€в•‘в•љв–€в–€в•”в•ќв–€в–€в•‘в–€в–€в•‘в•љв•ђв•ђв•ђв•ђв–€в–€в•‘   в–€в–€в•‘
в–€в–€в•‘     в–€в–€в•‘в–€в–€в•‘  в–€в–€в•—в–€в–€в•‘ в•љв•ђв•ќ в–€в–€в•‘в–€в–€в•‘в–€в–€в–€в–€в–€в–€в–€в•‘   в–€в–€в•‘
в•љв•ђв•ќ     в•љв•ђв•ќв•љв•ђв•ќ  в•љв•ђв•ќв•љв•ђв•ќ     в•љв•ђв•ќв•љв•ђв•ќв•љв•ђв•ђв•ђв•ђв•ђв•ђв•ќ   в•љв•ђв•ќ
```

**OSINT search across 695+ sites вЂ” with a beautiful web UI, rich exports and free AI analysis.**

[![CI](https://github.com/jermiDEV/pikmist/actions/workflows/ci.yml/badge.svg)](https://github.com/jermiDEV/pikmist/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.10%2B-14b8a6?logo=python&logoColor=white)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-30363d)
![Sites](https://img.shields.io/badge/sites-695%2B-0d9488)
![Stars](https://img.shields.io/github/stars/jermiDEV/pikmist?style=flat&color=14b8a6)

</div>

---

PikMist finds which platforms a given **username** or **email** is registered on, builds a "digital passport" of the person behind them, and exports a polished PDF report вЂ” all from a clean dark-themed web interface with a live ASCII-laser background, or from a classic CLI.

The site database comes from [WhatsMyName](https://github.com/WebBreacher/WhatsMyName), which keeps the false-positive rate low, and is updated automatically on every launch. PikMist additionally ships its own list of Russian platforms (Stihi.ru, Proza.ru, Author.Today, LiveLib).

## вњЁ Features

| | |
|---|---|
| рџЊђ **Web interface** | Search by username or email, live progress bar with spring-physics animation, result filtering, light & dark themes |
| рџ–Ґ **CLI** | The full engine in the terminal: file inputs, username permutation, proxies, concurrency tuning |
| рџЄЄ **Digital passport** | Auto-collected profile card: full name, birth year estimate, phone numbers, avatar вЂ” shown in the UI and in the PDF |
| рџ¤– **Free AI analysis** | Built-in AI summarizes found profiles: summary, categorization, tags, risk flags and insights. No API key required |
| рџ“„ **Exports** | Styled PDF report, CSV and JSON |
| рџ§© **Custom sites** | Add your own platforms to `data/custom-sites.json` вЂ” they survive database auto-updates |
| рџ”ћ **NSFW filter** | One toggle to hide adult-content sites from results |
| рџљЂ **695+ sites** | Social networks, forums, blogs, marketplaces, messengers and more |

## рџ“ё Screenshot

<div align="center">
  <img src="docs/screenshot-main.png" alt="PikMist web interface" width="900">
</div>

## рџљЂ Quick Start

### Web interface

```bash
pip install -r requirements.txt flask
python app.py
```

Open **http://127.0.0.1:8787** вЂ” the browser is all you need.

**Windows:** double-click `start_pikmist.bat`.

### CLI

```bash
python pikmist.py --username johndoe
python pikmist.py --email johndoe@example.com
python pikmist.py --username johndoe --pdf --ai
```

### Docker

```bash
docker build -t pikmist .
docker run --rm pikmist --username johndoe --pdf
```

## вљ™пёЏ CLI Options

| Flag | Description |
|---|---|
| `--username`, `--username-file` | One username or a list from file |
| `--permute`, `--permuteall` | Search variations / all combinations of username parts |
| `--email`, `--email-file` | Search by email (single or list) |
| `--filter` | Limit scope, e.g. `--filter cat=social` or `--filter name=GitHub` |
| `--no-nsfw` | Hide adult-content sites |
| `--csv`, `--json`, `--pdf` | Export formats |
| `--ai` | Run AI analysis of found profiles |
| `--setup-ai` | Configure the AI key interactively |
| `--proxy` | Custom proxy |
| `--timeout`, `--max-concurrent-requests` | Request tuning |
| `--dump` | Save raw HTML responses |
| `--verbose` | Detailed logging |
| `--no-update` | Skip database update on launch |

## рџЄЄ Digital Passport

When accounts are found, PikMist collects available metadata into a compact profile card вЂ” full name (Instagram в†’ Twitter в†’ TikTok в†’ Gravatar в†’ Duolingo priority), estimated birth year, phone numbers and the avatar. Enable the **AI analysis** chip in the web UI to see it alongside AI insights; in PDF reports the passport is always included.

## рџ¤– AI Analysis (free)

```bash
python pikmist.py --setup-ai
```

Found site names are sent for analysis; nothing else is transmitted. There is a daily request quota. In the web interface just turn on the **AI analysis** chip.

## рџ§© Adding Custom Sites

Append entries to `data/custom-sites.json` following the [WhatsMyName schema](https://github.com/WebBreacher/WhatsMyName/blob/main/OPERATIONS.md). Custom entries are merged into the live database on every run and are never overwritten by auto-updates.

## рџ“Ѓ Project Structure

```
app.py             Web server (Flask) and engine integration
pikmist.py         CLI entry point
src/               Search engine, exports, AI client
data/              Site database (auto-updated) + custom sites
static/ templates/ Web UI (themes, animations, progress bar)
tests/             Unit tests
results/           Saved reports
```

## вљ пёЏ Disclaimer

```
This program is for Educational purposes ONLY. Do not use it without permission.
By using this program you accept that any damage caused by its use is not
the responsibility of the authors.
```

## рџ™Џ Credits

- Engine based on [Blackbird](https://github.com/p1ngul1n0/blackbird) by p1ngul1n0 (Lucas Antoniaci)
- Site database: [WhatsMyName](https://github.com/WebBreacher/WhatsMyName) вЂ” CC BY-SA 4.0

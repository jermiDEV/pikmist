<div align="center">

```
██████╗ ██╗██╗  ██╗███╗   ███╗██╗███████╗████████╗
██╔══██╗██║██║ ██╔╝████╗ ████║██║██╔════╝╚══██╔══╝
██████╔╝██║█████╔╝ ██╔████╔██║██║███████╗   ██║
██╔═══╝ ██║██╔═██╗ ██║╚██╔╝██║██║╚════██║   ██║
██║     ██║██║  ██╗██║ ╚═╝ ██║██║███████║   ██║
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚══════╝   ╚═╝
```

**OSINT search across 695+ sites — with a beautiful web UI, rich exports and free AI analysis.**

[![CI](https://github.com/jermiDEV/pikmist/actions/workflows/ci.yml/badge.svg)](https://github.com/jermiDEV/pikmist/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.10%2B-14b8a6?logo=python&logoColor=white)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-30363d)
![Sites](https://img.shields.io/badge/sites-695%2B-0d9488)
![Stars](https://img.shields.io/github/stars/jermiDEV/pikmist?style=flat&color=14b8a6)

</div>

---

PikMist finds which platforms a given **username** or **email** is registered on, builds a "digital passport" of the person behind them, and exports a polished PDF report — all from a clean dark-themed web interface with a live ASCII-laser background, or from a classic CLI.

The site database comes from [WhatsMyName](https://github.com/WebBreacher/WhatsMyName), which keeps the false-positive rate low, and is updated automatically on every launch. PikMist additionally ships its own list of Russian platforms (Stihi.ru, Proza.ru, Author.Today, LiveLib).

## Features

| | |
|---|---|
| **Web interface** | Search by username or email, live progress bar with spring-physics animation, result filtering, light & dark themes |
| **CLI** | The full engine in the terminal: file inputs, username permutation, proxies, concurrency tuning |
| **Digital passport** | Auto-collected profile card: full name, birth year estimate, phone numbers, avatar — shown in the UI and in the PDF |
| **Free AI analysis** | Built-in AI summarizes found profiles: summary, categorization, tags, risk flags and insights. No API key required |
| **Exports** | Styled PDF report, CSV and JSON |
| **Custom sites** | Add your own platforms to `data/custom-sites.json` — they survive database auto-updates |
| **NSFW filter** | One toggle to hide adult-content sites from results |
| **695+ sites** | Social networks, forums, blogs, marketplaces, messengers and more |

## Screenshot

<div align="center">
  <img src="docs/screenshot-main.png" alt="PikMist web interface" width="900">
</div>

## Quick Start

### Web interface

```bash
pip install -r requirements.txt flask
python app.py
```

Open **http://127.0.0.1:8787** — the browser is all you need.

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

## CLI Options

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

## Digital Passport

When accounts are found, PikMist collects available metadata into a compact profile card — full name (Instagram → Twitter → TikTok → Gravatar → Duolingo priority), estimated birth year, phone numbers and the avatar. Enable the **AI analysis** chip in the web UI to see it alongside AI insights; in PDF reports the passport is always included.

## AI Analysis (free)

```bash
python pikmist.py --setup-ai
```

Found site names are sent for analysis; nothing else is transmitted. There is a daily request quota. In the web interface just turn on the **AI analysis** chip.

## Adding Custom Sites

Append entries to `data/custom-sites.json` following the [WhatsMyName schema](https://github.com/WebBreacher/WhatsMyName/blob/main/OPERATIONS.md). Custom entries are merged into the live database on every run and are never overwritten by auto-updates.

## Project Structure

```
app.py             Web server (Flask) and engine integration
pikmist.py         CLI entry point
src/               Search engine, exports, AI client
data/              Site database (auto-updated) + custom sites
static/ templates/ Web UI (themes, animations, progress bar)
tests/             Unit tests
results/           Saved reports
```

## Disclaimer

```
This program is for Educational purposes ONLY. Do not use it without permission.
By using this program you accept that any damage caused by its use is not
the responsibility of the authors.
```

## Credits

- Engine based on [Blackbird](https://github.com/p1ngul1n0/blackbird) by p1ngul1n0 (Lucas Antoniaci)
- Site database: [WhatsMyName](https://github.com/WebBreacher/WhatsMyName) — CC BY-SA 4.0

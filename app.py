"""
PikMist — веб-интерфейс для OSINT-поиска по никам и email.
База сайтов: WhatsMyName.

Запуск:  python app.py   →  http://127.0.0.1:8787
"""

import os
import sys
import json
import re
import time
import uuid
import logging
import threading
import traceback
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, "src"))

from dotenv import load_dotenv

load_dotenv()

import config as cfg
from modules.whatsmyname.list_operations import (
    checkUpdates,
    readList,
)
from modules.core.username import verifyUsername
from modules.core.email import verifyEmail
from modules.export.file_operations import createSaveDirectory
from modules.export.csv import saveToCsv
from modules.export.pdf import saveToPdf
from modules.export.json import saveToJson
from modules.utils.userAgent import getRandomUserAgent
from modules.utils.filter import applyFilters
from modules.ai.key_manager import load_api_key_from_file
from modules.utils.http_client import do_sync_request

from rich.console import Console
from flask import Flask, render_template, request, jsonify, send_file

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False

RESULTS_ROOT = os.path.abspath(os.path.join(BASE_DIR, "results"))

SEARCH_LOCK = threading.Lock()
TASKS = {}

class SearchCancelled(Exception):
    """Внутренний сигнал отмены поиска (новый запрос или обновление страницы)."""
    pass

def setup_engine():
    """Подготовка глобального конфига движка (аналог initiate() в pikmist.py)."""
    if not os.path.exists("logs/"):
        os.makedirs("logs/")
    logging.basicConfig(
        filename=cfg.LOG_PATH,
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    cfg.console = Console(quiet=True)

    cfg.dateRaw = datetime.now().strftime("%m_%d_%Y")
    cfg.datePretty = datetime.now().strftime("%B %d, %Y")

    try:
        cfg.userAgent = getRandomUserAgent(cfg)
    except Exception:
        cfg.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

    cfg.usernameFoundAccounts = None
    cfg.emailFoundAccounts = None
    cfg.currentUser = None
    cfg.currentEmail = None
    cfg.splash_line = ""
    cfg.instagram_session_id = os.getenv("INSTAGRAM_SESSION_ID")
    cfg.api_url = os.getenv("API_URL")
    cfg.aiModel = None
    cfg.passport = None
    cfg.ai_analysis = None
    cfg.max_concurrent_requests = 30
    cfg.timeout = 30
    cfg.proxy = None

def bootstrap_lists():
    """Однократное обновление базы сайтов при старте сервера."""
    try:
        checkUpdates(cfg)
    except Exception:
        pass

def patch_progress(module, task):
    """Оборачивает checkSite модуля: счётчик прогресса + точка отмены."""
    if getattr(module, "_orig_checkSite", None) is None:
        module._orig_checkSite = module.checkSite

    async def patched(*args, **kwargs):
        if task["cancelled"]:
            raise SearchCancelled()
        result = await module._orig_checkSite(*args, **kwargs)
        task["completed"] += 1
        if task["cancelled"]:
            raise SearchCancelled()
        return result

    module.checkSite = patched

def unpatch_progress(module):
    pass

def run_search(task, module):
    try:
        opts = task["options"]
        mode = task["mode"]
        query = task["query"]

        social = opts.get("filter") or opts.get("social")
        cfg.filter = "cat=social" if social and mode == "username" else None
        cfg.no_nsfw = bool(opts.get("no_nsfw")) and mode == "username"
        cfg.dump = False
        cfg.csv = bool(opts.get("csv"))
        cfg.pdf = bool(opts.get("pdf"))
        cfg.json = bool(opts.get("json"))
        cfg.verbose = False

        try:
            if mode == "username":
                data = readList("username", cfg)
                task["total"] = len(applyFilters(data["sites"], cfg))
            else:
                data = readList("email", cfg)
                task["total"] = len(data["sites"])
        except SystemExit:
            raise RuntimeError("Фильтр не дал ни одного сайта для поиска")
        except Exception:
            pass

        found = None
        if mode == "username":
            cfg.currentUser = query
            if cfg.dump or cfg.csv or cfg.pdf or cfg.json:
                createSaveDirectory(cfg)
            found = verifyUsername(query, cfg)
            found_key = "usernameFoundAccounts"
        else:
            cfg.currentEmail = query
            if cfg.dump or cfg.csv or cfg.pdf or cfg.json:
                createSaveDirectory(cfg)
            found = verifyEmail(query, cfg)
            found_key = "emailFoundAccounts"

        accounts = [sanitize_account(a) for a in (found or [])]
        if task["cancelled"]:
            raise SearchCancelled()
        task["accounts"] = accounts

        passport = build_passport(mode, query, accounts)
        task["passport"] = passport
        cfg.passport = passport

        files = []
        if accounts and (cfg.csv or cfg.pdf or cfg.json):
            if cfg.csv:
                saveToCsv(cfg.usernameFoundAccounts if mode == "username" else cfg.emailFoundAccounts, cfg)
            if cfg.pdf:
                saveToPdf(
                    cfg.usernameFoundAccounts if mode == "username" else cfg.emailFoundAccounts,
                    mode,
                    cfg,
                )
            if cfg.json:
                saveToJson(
                    cfg.usernameFoundAccounts if mode == "username" else cfg.emailFoundAccounts,
                    cfg,
                )
            save_dir = os.path.abspath(cfg.saveDirectory)
            base = os.path.basename(save_dir)
            for ext, label in (("pdf", "PDF-отчёт"), ("csv", "CSV"), ("json", "JSON")):
                p = os.path.join(save_dir, base + "." + ext)
                if os.path.isfile(p):
                    files.append({"label": label, "file": base + "." + ext})
            task["save_dir"] = save_dir

        task["files"] = files

        if opts.get("ai"):
            if len(accounts) > 2:
                result = analyze_sites([a["name"] for a in accounts])
                task["ai"] = result
                if result.get("result"):
                    cfg.ai_analysis = result["result"]
            else:
                task["ai"] = {"error": "Найдено меньше 3 аккаунтов — AI-анализ недоступен."}

            if accounts and cfg.pdf:
                saveToPdf(
                    cfg.usernameFoundAccounts if mode == "username" else cfg.emailFoundAccounts,
                    mode,
                    cfg,
                )
                files.clear()
                save_dir = os.path.abspath(cfg.saveDirectory)
                base = os.path.basename(save_dir)
                for ext, label in (("pdf", "PDF-отчёт"), ("csv", "CSV"), ("json", "JSON")):
                    p = os.path.join(save_dir, base + "." + ext)
                    if os.path.isfile(p):
                        files.append({"label": label, "file": base + "." + ext})

        task["state"] = "done"
        if not accounts:
            task["message"] = "Ничего не найдено"
    except SearchCancelled:
        task["state"] = "cancelled"
    except SystemExit as e:
        task["state"] = "error"
        task["error"] = "Фильтр не дал ни одного сайта для поиска"
    except Exception as e:
        task["state"] = "error"
        task["error"] = f"{type(e).__name__}: {e}"
        traceback.print_exc()
    finally:
        cfg.currentUser = None
        cfg.currentEmail = None
        cfg.usernameFoundAccounts = None
        cfg.emailFoundAccounts = None
        cfg.passport = None
        if module is not None and getattr(module, "_orig_checkSite", None) is not None:
            module.checkSite = module._orig_checkSite
        SEARCH_LOCK.release()

def sanitize_account(a):
    meta = a.get("metadata") or []
    clean_meta = [
        {"name": m.get("name"), "value": str(m.get("value"))}
        for m in meta
        if m.get("value")
    ]
    return {
        "name": a.get("name"),
        "url": a.get("url"),
        "category": a.get("category"),
        "metadata": clean_meta,
    }

_RE_PHONE = re.compile(r"\+?\d[\d\s\-()]{7,}\d")
_RE_YEAR4 = re.compile(r"(?<!\d)(19[3-9]\d|20[01]\d)(?!\d)")
_RE_YEAR2 = re.compile(r"(?<!\d)(\d{2})(?!\d)")

def _plausible_phone(text):
    digits = re.sub(r"\D", "", text)
    if not (9 <= len(digits) <= 15):
        return False
    if len(digits) <= 11 and _RE_YEAR4.search(text) and not text.strip().startswith("+"):
        return False
    return True

def build_passport(mode, query, accounts):
    """«Электронный паспорт»: эвристики по публичным данным аккаунтов."""
    out = {
        "name": None,
        "name_source": None,
        "birth": None,
        "phone": None,
        "phone_source": None,
        "location": None,
        "avatar": None,
        "mode": mode,
        "query": query,
        "sites_count": len(accounts),
        "top_categories": [],
    }

    name_priority = {"Instagram": 0, "Twitter": 1, "TikTok": 2, "Gravatar": 3, "Duolingo": 4}
    best_name_rank = 99
    cats = {}

    for acc in accounts:
        site = acc.get("name") or ""
        cat = acc.get("category")
        if cat:
            cats[cat] = cats.get(cat, 0) + 1
        for m in acc.get("metadata") or []:
            mn = (m.get("name") or "").lower()
            val = (m.get("value") or "").strip()
            if not val:
                continue
            if mn == "name" and not out["name"]:
                rank = name_priority.get(site, 10)
                if best_name_rank > rank or out["name"] is None:
                    best_name_rank = rank
                    out["name"] = val
                    out["name_source"] = site
            elif mn == "location" and not out["location"]:
                out["location"] = val
            elif mn == "avatar" and not out["avatar"] and val.startswith("http"):
                out["avatar"] = val
            elif not out["phone"] and _RE_PHONE.search(val) and _plausible_phone(val):
                out["phone"] = val[:24]
                out["phone_source"] = site

    if out["name"]:
        out["name"] = re.sub(r"[\u2700-\u27bf\u2600-\u27ff\U0001f000-\U0001faff]", "", out["name"]).strip() or None

    text = query if mode == "username" else query.split("@")[0]
    bio_texts = " ".join(
        m.get("value", "")
        for acc in accounts
        for m in (acc.get("metadata") or [])
        if (m.get("name") or "").lower() == "bio"
    )

    m4 = _RE_YEAR4.search(text)
    if m4:
        out["birth"] = {"year": int(m4.group(1)), "source": "год в нике", "confidence": "medium"}
    else:
        mb = _RE_YEAR4.search(bio_texts)
        if mb:
            out["birth"] = {"year": int(mb.group(1)), "source": "указан в био", "confidence": "medium"}
        else:
            m2 = _RE_YEAR2.search(text)
            if m2:
                yy = int(m2.group(1))
                if 10 <= yy <= 99:
                    year = (2000 + yy) if yy <= 15 else (1900 + yy)
                    out["birth"] = {"year": year, "source": "цифры в нике", "confidence": "low"}

    out["top_categories"] = sorted(cats.items(), key=lambda x: -x[1])[:4]
    return out

def analyze_sites(site_names):
    """AI-анализ напрямую через API (без консольной анимации CLI)."""
    apikey = load_api_key_from_file(cfg)
    if not apikey:
        return {
            "error": "Нет API-ключа. Получите его один раз: "
            "python pikmist.py --setup-ai (в папке проекта)"
        }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "blackbird-cli",
        "x-api-key": apikey,
    }
    payload = json.dumps({"prompt": ", ".join(site_names)})
    try:
        response = do_sync_request(
            method="POST",
            url=cfg.api_url + "/analyze",
            config=cfg,
            customHeaders=headers,
            data=payload,
        )
        if response is None:
            return {"error": "Сервер AI недоступен"}
        data = response.json()
        if response.status_code == 200 and data.get("success"):
            return {
                "result": data["data"]["result"],
                "remaining_quota": data["data"].get("remaining_quota"),
            }
        return {"error": data.get("message", "Ошибка AI-анализа")}
    except Exception as e:
        return {"error": f"Ошибка AI-запроса: {e}"}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/search", methods=["POST"])
def api_search():
    body = request.get_json(silent=True) or {}
    mode = body.get("mode", "username")
    query = (body.get("query") or "").strip()

    if mode not in ("username", "email"):
        return jsonify({"error": "Неизвестный режим поиска"}), 400
    if not query:
        return jsonify({"error": "Введите ник или email"}), 400

    task = {
        "id": uuid.uuid4().hex[:12],
        "mode": mode,
        "query": query,
        "options": body.get("options", {}),
        "state": "running",
        "completed": 0,
        "total": None,
        "accounts": None,
        "files": [],
        "ai": None,
        "error": None,
        "message": None,
        "cancelled": False,
        "started": time.time(),
    }

    if not SEARCH_LOCK.acquire(blocking=False):
        for t in TASKS.values():
            if t.get("state") == "running":
                t["cancelled"] = True
        deadline = time.time() + 15
        acquired = False
        while time.time() < deadline:
            if SEARCH_LOCK.acquire(blocking=False):
                acquired = True
                break
            time.sleep(0.05)
        if not acquired:
            return (
                jsonify({"error": "Предыдущий поиск ещё останавливается, попробуйте ещё раз"}),
                409,
            )

    TASKS[task["id"]] = task

    if mode == "username":
        import modules.core.username as username_mod

        patch_progress(username_mod, task)
        worker_module = username_mod
    else:
        import modules.core.email as email_mod

        patch_progress(email_mod, task)
        worker_module = email_mod

    threading.Thread(target=run_search, args=(task, worker_module), daemon=True).start()
    return jsonify({"id": task["id"]})

@app.route("/api/cancel", methods=["POST"])
def api_cancel():
    """Отмена фонового поиска (вызывается при загрузке/обновлении страницы)."""
    stopped = 0
    for t in TASKS.values():
        if t.get("state") == "running":
            t["cancelled"] = True
            stopped += 1
    return jsonify({"ok": True, "stopped": stopped})

@app.route("/api/status/<task_id>")
def api_status(task_id):
    task = TASKS.get(task_id)
    if not task:
        return jsonify({"error": "Задача не найдена"}), 404
    payload = {
        "state": task["state"],
        "completed": task["completed"],
        "total": task["total"],
        "elapsed": round(time.time() - task["started"], 1),
        "message": task["message"],
    }
    if task["state"] == "error":
        payload["error"] = task["error"]
    if task["state"] == "done":
        payload.update(
            {
                "query": task["query"],
                "mode": task["mode"],
                "accounts": task["accounts"],
                "files": task["files"],
                "ai": task["ai"],
                "passport": task.get("passport"),
            }
        )
    return jsonify(payload)

@app.route("/download/<task_id>/<path:filename>")
def download(task_id, filename):
    task = TASKS.get(task_id)
    if not task:
        return "Задача не найдена", 404
    file = next((f["file"] for f in task["files"] if f["file"] == filename), None)
    if not file:
        return "Файл не найден", 404
    return send_file(os.path.join(task.get("save_dir", RESULTS_ROOT), file), as_attachment=True)

@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Страница не найдена"}), 404

if __name__ == "__main__":
    setup_engine()
    print("🚀 PikMist: обновление базы сайтов...")
    bootstrap_lists()
    print("✅ PikMist запущен:  http://127.0.0.1:8787")
    app.run(host="127.0.0.1", port=8787, debug=False, threaded=True)

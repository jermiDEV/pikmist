from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit
import sys
import os

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "src"))
)

from ..export.file_operations import generateName

from ..utils.log import logError

_DARK = "#0d1117"
_ACCENT_1 = "#0d9488"
_ACCENT_2 = "#14b8a6"
_CARD_BG = "#f6f8fa"
_CARD_BORDER = "#d0d7de"
_MUTED = "#59636e"

def _accent_band(canva, x, y, w, h=3):
    """Плоская полоска-акцент (бирюза)."""
    steps = 60
    step_w = w / steps
    r1, g1, b1 = (0x14 / 255, 0xB8 / 255, 0xA6 / 255)
    r2, g2, b2 = (0x0D / 255, 0x94 / 255, 0x88 / 255)
    for i in range(steps):
        t = i / (steps - 1)
        canva.setFillColorRGB(
            r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t
        )
        canva.rect(x + i * step_w, y, step_w + 0.5, h, stroke=0, fill=1)

def _passport_photo_path(config, identifier):
    """Первый скачанный аватар из папки images_<identifier>."""
    d = os.path.join(config.saveDirectory, f"images_{identifier}")
    try:
        for f in os.listdir(d):
            if f.lower().endswith((".jpg", ".jpeg", ".png")):
                return os.path.join(d, f)
    except Exception:
        pass
    return None

def draw_passport(canva, config, width, height, y_top):
    """Рисует блок «цифровой паспорт», возвращает новый y_top."""
    p = getattr(config, "passport", None)
    if not p:
        return y_top

    card_h = 168
    bottom = y_top - card_h
    canva.setFillColor(_CARD_BG)
    canva.setStrokeColor(_CARD_BORDER)
    canva.roundRect(40, bottom, width - 80, card_h, 12, stroke=1, fill=1)

    head_h = 24
    canva.setFillColor(_DARK)
    canva.roundRect(40, y_top - head_h, width - 80, head_h, 12, stroke=0, fill=1)
    canva.rect(40, y_top - head_h, width - 80, head_h / 2, stroke=0, fill=1)
    _accent_band(canva, 40, y_top - head_h - 2.5, width - 80, 2.5)
    canva.setFillColor("#ffffff")
    canva.setFont(config.FONT_NAME_BOLD, 9)
    canva.drawString(55, y_top - 17, "PIKMIST · ЦИФРОВОЙ ПАСПОРТ")
    canva.setFillColor("#8b949e")
    canva.setFont(config.FONT_NAME_REGULAR, 7)
    canva.drawRightString(width - 55, y_top - 17, "предположительные данные")

    identifier = p["query"]
    photo = _passport_photo_path(config, identifier)
    ph_x, ph_y, ph_s = 58, bottom + 22, 62
    if photo:
        try:
            canva.drawImage(photo, ph_x, ph_y, width=ph_s, height=ph_s, mask="auto")
        except Exception:
            photo = None
    if not photo:
        canva.setFillColor(_ACCENT_1)
        canva.roundRect(ph_x, ph_y, ph_s, ph_s, 8, stroke=0, fill=1)
        canva.setFillColor("#ffffff")
        canva.setFont(config.FONT_NAME_BOLD, 26)
        initial = (p.get("name") or p["query"] or "?")[0].upper()
        canva.drawCentredString(ph_x + ph_s / 2, ph_y + 22, initial)

    fields = [
        ("ПОЛНОЕ ИМЯ", p.get("name") or "не определено"),
        (
            "ДАТА РОЖДЕНИЯ (ПРЕДП.)",
            (f"~{p['birth']['year']}" if p.get("birth") else "не определена"),
        ),
        ("ТЕЛЕФОН", p.get("phone") or "не найден"),
        ("ЛОКАЦИЯ", p.get("location") or "не определена"),
        (
            "НИК / EMAIL",
            p["query"],
        ),
        ("АККАУНТОВ НАЙДЕНО", str(p.get("sites_count", 0))),
    ]
    col2_x = width / 2 + 30
    row_y = y_top - head_h - 26
    for i, (label, value) in enumerate(fields):
        col = i % 2
        col_x = ph_x + ph_s + 22 if col == 0 else col2_x
        row = i // 2
        y = row_y - row * 40
        canva.setFillColor(_ACCENT_1)
        canva.setFont(config.FONT_NAME_BOLD, 6.5)
        canva.drawString(col_x, y, label)
        canva.setFillColor("#000000")
        canva.setFont(config.FONT_NAME_BOLD, 10)
        canva.drawString(col_x, y - 12, str(value)[:34])

    canva.setFillColor(_MUTED)
    canva.setFont(config.FONT_NAME_REGULAR, 6.5)
    src_bits = []
    if p.get("name_source"):
        src_bits.append(f"имя: {p['name_source']}")
    if p.get("birth"):
        src_bits.append(f"год: {p['birth']['source']}")
    if p.get("phone_source"):
        src_bits.append(f"телефон: {p['phone_source']}")
    note = " · ".join(src_bits) if src_bits else "публичные источники не дали данных"
    canva.drawString(58, bottom + 8, "Источники: " + note)

    return bottom - 30

def saveToPdf(foundAccounts, resultType, config):
    regularFontFile = os.path.join(
        os.getcwd(),
        config.ASSETS_DIRECTORY,
        config.FONTS_DIRECTORY,
        config.FONT_REGULAR_FILE,
    )
    boldFontFile = os.path.join(
        os.getcwd(),
        config.ASSETS_DIRECTORY,
        config.FONTS_DIRECTORY,
        config.FONT_BOLD_FILE,
    )
    try:
        pdfmetrics.registerFont(TTFont(config.FONT_NAME_REGULAR, regularFontFile))
        pdfmetrics.registerFont(TTFont(config.FONT_NAME_BOLD, boldFontFile))

        fileName = generateName(config, "pdf")
        path = os.path.join(config.saveDirectory, fileName)

        width, height = letter
        canva = canvas.Canvas(path, pagesize=letter)
        accountsCount = len(foundAccounts)

        if resultType == "username":
            identifier = config.currentUser
        elif resultType == "email":
            identifier = config.currentEmail

        header_h = 78
        canva.setFillColor(_DARK)
        canva.rect(0, height - header_h, width, header_h, stroke=0, fill=1)
        _accent_band(canva, 0, height - header_h - 4, width)

        canva.setFillColor(_ACCENT_1)
        canva.roundRect(36, height - header_h + 14, 40, 40, 9, stroke=0, fill=1)
        canva.setFillColor(_ACCENT_2)
        canva.roundRect(46, height - header_h + 24, 40, 40, 9, stroke=0, fill=1)
        canva.setFillColor("#0d1117")
        canva.setFont(config.FONT_NAME_BOLD, 22)
        canva.drawString(56, height - header_h + 33, "P")

        canva.setFillColor("#ffffff")
        canva.setFont(config.FONT_NAME_BOLD, 20)
        canva.drawString(96, height - 42, "PikMist")
        canva.setFillColor("#8b949e")
        canva.setFont(config.FONT_NAME_REGULAR, 9)
        canva.drawString(96, height - 58, "OSINT Account Report")
        canva.setFillColor("#8b949e")
        canva.setFont(config.FONT_NAME_REGULAR, 8)
        canva.drawRightString(width - 40, height - 42, config.datePretty)
        canva.drawString(width - 40, height - 54, f"{accountsCount} account(s) found")

        box_top = height - header_h - 22
        canva.setFillColor(_CARD_BG)
        canva.setStrokeColor(_CARD_BORDER)
        canva.roundRect(40, box_top - 40, width - 80, 40, 10, stroke=1, fill=1)
        canva.drawImage(
            os.path.join(
                os.getcwd(), config.ASSETS_DIRECTORY, config.IMAGES_DIRECTORY, "correct.png"
            ),
            width / 2 - stringWidth(identifier, config.FONT_NAME_BOLD, 12) / 2 - 16,
            box_top - 28,
            width=11,
            height=11,
            mask="auto",
        )
        canva.setFillColor("#000000")
        canva.setFont(config.FONT_NAME_BOLD, 12)
        canva.drawCentredString(width / 2, box_top - 28, identifier)
        canva.setFillColor(_MUTED)
        canva.setFont(config.FONT_NAME_REGULAR, 7)
        canva.drawCentredString(
            width / 2,
            box_top - 38,
            "Verified via WhatsMyName database · 600+ platforms",
        )

        warn_top = box_top - 62
        canva.setFillColor("#fff8c5")
        canva.setStrokeColor("#d9c884")
        canva.roundRect(40, warn_top - 26, width - 80, 26, 8, stroke=1, fill=1)
        canva.drawImage(
            os.path.join(
                os.getcwd(), config.ASSETS_DIRECTORY, config.IMAGES_DIRECTORY, "warning.png"
            ),
            54,
            warn_top - 17,
            width=10,
            height=10,
            mask="auto",
        )
        canva.setFillColor("#57523f")
        canva.setFont(config.FONT_NAME_REGULAR, 8)
        canva.drawString(70, warn_top - 17, "PikMist can make mistakes. Consider checking the information.")

        y_top = warn_top - 44

        y_top = draw_passport(canva, config, width, height, y_top)

        if config.ai_analysis:
            ai_bottom = y_top - 300
            canva.setFillColor(_CARD_BG)
            canva.setStrokeColor(_CARD_BORDER)
            canva.roundRect(40, ai_bottom, width - 80, 300, 12, stroke=1, fill=1)
            _accent_band(canva, 40, ai_bottom, width - 80, 3)

            canva.drawImage(
                os.path.join(
                    os.getcwd(), config.ASSETS_DIRECTORY, config.IMAGES_DIRECTORY, "ai-stars.png"
                ),
                55,
                y_top - 16,
                width=12,
                height=12,
                mask="auto",
            )
            canva.setFillColor("#000000")
            canva.setFont(config.FONT_NAME_BOLD, 10)
            canva.drawString(72, y_top - 15, "AI Profile Analysis")
            canva.setFillColor(_MUTED)
            canva.setFont(config.FONT_NAME_REGULAR, 7)
            canva.drawString(
                55, y_top - 26, "Generated by PikMist AI based on detected online presence."
            )

            y_position = y_top - 44
            ai = config.ai_analysis

            if ai.get("summary"):
                canva.setFillColor(_ACCENT_1)
                canva.setFont(config.FONT_NAME_BOLD, 9)
                canva.drawString(55, y_position, "SUMMARY")
                y_position -= 13
                canva.setFillColor("#1f2328")
                lines = simpleSplit(ai["summary"], config.FONT_NAME_REGULAR, 8, 500)
                for line in lines:
                    canva.drawString(55, y_position, line)
                    y_position -= 10
                y_position -= 6

            if ai.get("categorization"):
                canva.setFillColor(_ACCENT_1)
                canva.setFont(config.FONT_NAME_BOLD, 9)
                canva.drawString(55, y_position, "PROFILE TYPE")
                y_position -= 13
                canva.setFillColor("#1f2328")
                canva.setFont(config.FONT_NAME_REGULAR, 8)
                canva.drawString(55, y_position, ai["categorization"])
                y_position -= 18

            if ai.get("insights"):
                canva.setFillColor(_ACCENT_1)
                canva.setFont(config.FONT_NAME_BOLD, 9)
                canva.drawString(55, y_position, "INSIGHTS")
                y_position -= 13
                canva.setFillColor("#1f2328")
                canva.setFont(config.FONT_NAME_REGULAR, 8)
                for insight in ai["insights"]:
                    for line in simpleSplit(insight, config.FONT_NAME_REGULAR, 8, 480):
                        canva.drawString(65, y_position, line)
                        y_position -= 10
                    y_position -= 2
                y_position -= 4

            if ai.get("risk_flags"):
                canva.setFillColor("#cf222e")
                canva.setFont(config.FONT_NAME_BOLD, 9)
                canva.drawString(55, y_position, "RISK FLAGS")
                y_position -= 13
                canva.setFillColor("#1f2328")
                canva.setFont(config.FONT_NAME_REGULAR, 8)
                for risk in ai["risk_flags"]:
                    for line in simpleSplit(risk, config.FONT_NAME_REGULAR, 8, 480):
                        canva.drawString(65, y_position, line)
                        y_position -= 10
                    y_position -= 2

            y_top = ai_bottom - 30

        if accountsCount >= 1:
            canva.setFillColor("#000000")
            canva.setFont(config.FONT_NAME_BOLD, 13)
            canva.drawString(40, y_top, f"Found accounts ({accountsCount})")

            y_position = y_top - 14
            for idx, result in enumerate(foundAccounts):
                if y_position < 80:
                    canva.showPage()
                    y_position = height - 60

                if idx > 0:
                    canva.setStrokeColor("#d8dee4")
                    canva.setLineWidth(0.6)
                    canva.line(40, y_position + 12, width - 40, y_position + 12)

                canva.setFillColor(_ACCENT_1)
                canva.setFont(config.FONT_NAME_BOLD, 8)
                canva.drawString(40, y_position - 4, f"{idx + 1:02d}")

                canva.setFillColor("#000000")
                canva.setFont(config.FONT_NAME_BOLD, 12)
                name = result["name"]
                canva.drawString(60, y_position, name)

                siteWidth = stringWidth(name, config.FONT_NAME_BOLD, 12)
                canva.drawImage(
                    os.path.join(
                        os.getcwd(), config.ASSETS_DIRECTORY, config.IMAGES_DIRECTORY, "link.png"
                    ),
                    66 + siteWidth,
                    y_position,
                    width=10,
                    height=10,
                    mask="auto",
                )
                canva.linkURL(
                    result["url"],
                    (66 + siteWidth, y_position, 76 + siteWidth, y_position + 10),
                    relative=1,
                )

                cat = result.get("category")
                if cat:
                    canva.setFillColor(_MUTED)
                    canva.setFont(config.FONT_NAME_REGULAR, 7)
                    catWidth = stringWidth(cat, config.FONT_NAME_REGULAR, 7)
                    canva.drawString(
                        width - 44 - catWidth, y_position, cat
                    )

                y_position -= 16
                meta_top = y_position
                canva.setStrokeColor(_ACCENT_2)
                canva.setLineWidth(1.5)

                try:
                    if result["metadata"]:
                        for data in result["metadata"]:
                            if y_position < 60:
                                canva.showPage()
                                y_position = height - 60
                            if data["type"] == "String":
                                value = str(data["value"])
                                canva.setFillColor("#e6f4f2")
                                label = f"{data['name']}:"
                                lw = stringWidth(label, config.FONT_NAME_BOLD, 7)
                                vw = stringWidth(value[:80], config.FONT_NAME_REGULAR, 7)
                                chip_w = lw + vw + 12
                                canva.roundRect(
                                    60, y_position - 3, chip_w, 13, 6, fill=1, stroke=0
                                )
                                canva.setFillColor(_ACCENT_1)
                                canva.setFont(config.FONT_NAME_BOLD, 7)
                                canva.drawString(65, y_position, label)
                                canva.setFillColor("#1f2328")
                                canva.setFont(config.FONT_NAME_REGULAR, 7)
                                canva.drawString(65 + lw + 2, y_position, value[:80])
                                y_position -= 15
                            elif data["type"] == "Array":
                                canva.setFillColor(_ACCENT_1)
                                canva.setFont(config.FONT_NAME_BOLD, 7)
                                canva.drawString(65, y_position, f"{data['name']}:")
                                y_position -= 14
                                for value in data["value"]:
                                    canva.setFillColor("#e6f4f2")
                                    vw = stringWidth(str(value)[:60], config.FONT_NAME_REGULAR, 7)
                                    canva.roundRect(
                                        72, y_position - 3, vw + 10, 13, 6, fill=1, stroke=0
                                    )
                                    canva.setFillColor("#1f2328")
                                    canva.setFont(config.FONT_NAME_REGULAR, 7)
                                    canva.drawString(77, y_position, str(value)[:60])
                                    y_position -= 15
                            elif data["type"] == "Image":
                                if data.get("downloaded"):
                                    try:
                                        y_position -= 4
                                        canva.drawImage(
                                            os.path.join(
                                                config.saveDirectory,
                                                f"images_{identifier}",
                                                f"{result['name']}_image.jpg",
                                            ),
                                            62,
                                            y_position - 30,
                                            width=34,
                                            height=34,
                                        )
                                        y_position -= 38
                                    except Exception:
                                        pass
                        canva.line(52, meta_top + 4, 52, y_position + 6)
                    y_position -= 14
                except Exception as e:
                    print(e)

        canva.setFillColor(_MUTED)
        canva.setFont(config.FONT_NAME_REGULAR, 7)
        canva.drawCentredString(
            width / 2, 36, "Generated by PikMist · Data: WhatsMyName (CC BY-SA 4.0)"
        )
        _accent_band(canva, 0, 28, width)

        canva.save()
        config.console.print(f"💾  Saved results to '[cyan1]{fileName}[/cyan1]'")
        return True
    except Exception as e:
        logError(e, "Couldn't save results to PDF file!", config)
        return False

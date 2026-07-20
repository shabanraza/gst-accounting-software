#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / "assets" / "store"
OUT = STORE / "screenshots"
REAL = OUT / "real-captures-v2"
MASCOT = ROOT / "assets" / "brand" / "hisaabkro-mascot.png"
ICON = STORE / "play-icon-512.png"

W, H = 1080, 1920
FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)


def hex_rgb(hex_value):
    value = hex_value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def cover_resize(image, size, anchor_y=0.36):
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = max(0, (resized.width - target_w) // 2)
    top = max(0, min(resized.height - target_h, round((resized.height - target_h) * anchor_y)))
    return resized.crop((left, top, left + target_w, top + target_h))


def text_size(draw, text, fnt):
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if text_size(draw, candidate, fnt)[0] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_headline(draw, x, y, verb, desc, max_width, palette, align="left"):
    verb_font = font(80, True)
    desc_font = font(58, True)
    sub_font = font(28)
    line_gap = 10

    for line in wrap(draw, verb.upper(), verb_font, max_width):
        tx = x if align == "left" else x + max_width / 2
        draw.text((tx, y), line, font=verb_font, fill=palette["headline"], anchor="la" if align == "left" else "ma")
        y += 82 + line_gap

    for line in wrap(draw, desc.upper(), desc_font, max_width):
        tx = x if align == "left" else x + max_width / 2
        draw.text((tx, y), line, font=desc_font, fill=palette["headline"], anchor="la" if align == "left" else "ma")
        y += 62 + line_gap

    if palette.get("subline"):
        draw.text((x, y + 16), palette["subline"], font=sub_font, fill=palette["muted"])
    return y


def gradient_bg(top, bottom):
    top_rgb, bottom_rgb = hex_rgb(top), hex_rgb(bottom)
    image = Image.new("RGBA", (W, H), (*top_rgb, 255))
    draw = ImageDraw.Draw(image)
    for y in range(H):
        t = y / max(1, H - 1)
        rgb = tuple(round(top_rgb[i] * (1 - t) + bottom_rgb[i] * t) for i in range(3))
        draw.line((0, y, W, y), fill=(*rgb, 255))
    return image


def solid_bg(color):
    return Image.new("RGBA", (W, H), (*hex_rgb(color), 255))


def paste_asset(canvas, path, box, shadow=True):
    if not path.exists():
        return
    asset = Image.open(path).convert("RGBA")
    asset.thumbnail((box[2], box[3]), Image.Resampling.LANCZOS)
    x, y = box[0] - asset.width // 2, box[1] - asset.height // 2
    if shadow:
        alpha = asset.getchannel("A")
        sh = Image.new("RGBA", asset.size, (10, 16, 40, 110))
        sh.putalpha(alpha.filter(ImageFilter.GaussianBlur(12)))
        canvas.alpha_composite(sh, (x + 10, y + 16))
    canvas.alpha_composite(asset, (x, y))


def add_phone(canvas, screenshot_path, x, y, phone_w, phone_h, lift=0):
    shot = Image.open(screenshot_path).convert("RGBA")
    screen_w, screen_h = phone_w - 34, phone_h - 34
    shot = cover_resize(shot, (screen_w, screen_h), anchor_y=0.30)

    shadow = Image.new("RGBA", (phone_w + 96, phone_h + 96), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((48, 48, phone_w + 48, phone_h + 48), radius=76, fill=(5, 10, 35, 118))
    shadow = shadow.filter(ImageFilter.GaussianBlur(25))
    canvas.alpha_composite(shadow, (x - 48, y - 26 + lift))

    frame = Image.new("RGBA", (phone_w, phone_h), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rounded_rectangle((0, 0, phone_w, phone_h), radius=80, fill=(13, 18, 33, 255))
    fd.rounded_rectangle((10, 10, phone_w - 10, phone_h - 10), radius=70, fill=(225, 230, 245, 255))
    fd.rounded_rectangle((17, 17, phone_w - 17, phone_h - 17), radius=62, fill=(255, 255, 255, 255))
    fd.rounded_rectangle((phone_w // 2 - 68, 30, phone_w // 2 + 68, 58), radius=15, fill=(13, 18, 33, 255))
    canvas.alpha_composite(frame, (x, y + lift))

    screen_mask = rounded_mask((screen_w, screen_h), 54)
    canvas.paste(shot, (x + 17, y + 17 + lift), screen_mask)


def add_badge(draw, text, x, y, fill, fg, border=None):
    fnt = font(28, True)
    tw, th = text_size(draw, text, fnt)
    pad_x, pad_y = 22, 13
    box = (x, y, x + tw + pad_x * 2, y + th + pad_y * 2)
    draw.rounded_rectangle(box, radius=24, fill=fill, outline=border, width=2 if border else 1)
    draw.text((x + pad_x, y + pad_y - 1), text, font=fnt, fill=fg)


def add_wave(canvas, fill):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    points = [(0, 1140), (250, 1030), (500, 1120), (760, 990), (1080, 1060), (1080, 1920), (0, 1920)]
    draw.polygon(points, fill=fill)
    canvas.alpha_composite(layer)


def card_stack(canvas, x, y, colors):
    draw = ImageDraw.Draw(canvas)
    labels = [("GST", "READY"), ("PDF", "INVOICE"), ("KHATA", "LEDGER")]
    for idx, ((a, b), color) in enumerate(zip(labels, colors)):
        yy = y + idx * 88
        draw.rounded_rectangle((x, yy, x + 260, yy + 72), radius=24, fill=color)
        draw.text((x + 24, yy + 15), a, font=font(26, True), fill=(255, 255, 255, 255))
        draw.text((x + 94, yy + 15), b, font=font(26, True), fill=(255, 255, 255, 210))


def variation_a(slide, output):
    palette = {
        "headline": (255, 255, 255, 255),
        "muted": (205, 240, 255, 255),
        "subline": slide["subline"],
    }
    canvas = gradient_bg("#004FC4", "#0066F5")
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((-210, 980, 900, 2070), radius=130, fill=(255, 255, 255, 28))
    draw.ellipse((745, 325, 1225, 805), fill=(34, 211, 238, 42))
    draw_headline(draw, 66, 118, slide["verb"], slide["desc"], 760, palette)
    paste_asset(canvas, MASCOT, (875, 280, 210, 210), shadow=True)
    add_phone(canvas, slide["shot"], 252, 610, 600, 1225)
    for badge in slide["badges"]:
        add_badge(draw, *badge, fill=(255, 255, 255, 235), fg=(31, 41, 85, 255))
    canvas.convert("RGB").save(output, quality=96)


def variation_b(slide, output):
    palette = {
        "headline": (255, 255, 255, 255),
        "muted": (190, 247, 255, 255),
        "subline": slide["subline"],
    }
    canvas = gradient_bg("#043B9E", "#0066F5")
    add_wave(canvas, (255, 255, 255, 230))
    draw = ImageDraw.Draw(canvas)
    draw_headline(draw, 70, 104, slide["verb"], slide["desc"], 780, palette)
    card_stack(canvas, 725, 392, [(80, 70, 229, 238), (14, 165, 233, 238), (16, 185, 129, 238)])
    paste_asset(canvas, MASCOT, (870, 1060, 250, 250), shadow=True)
    add_phone(canvas, slide["shot"], 154, 640, 570, 1165)
    for badge in slide["badges"][:2]:
        add_badge(draw, *badge, fill=(255, 255, 255, 240), fg=(30, 41, 95, 255))
    canvas.convert("RGB").save(output, quality=96)


def variation_c(slide, output):
    palette = {
        "headline": (18, 24, 58, 255),
        "muted": (86, 99, 130, 255),
        "subline": slide["subline"],
    }
    canvas = solid_bg("#F8FAFF")
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((48, 54, 1032, 560), radius=58, fill=(0, 102, 245, 255))
    draw.rounded_rectangle((48, 54, 1032, 560), radius=58, outline=(96, 165, 250, 255), width=2)
    draw_headline(
        draw,
        92,
        116,
        slide["verb"],
        slide["desc"],
        710,
        {"headline": (255, 255, 255, 255), "muted": (221, 244, 255, 255), "subline": slide["subline"]},
    )
    paste_asset(canvas, ICON, (888, 210, 120, 120), shadow=True)
    paste_asset(canvas, MASCOT, (850, 505, 190, 190), shadow=True)
    add_phone(canvas, slide["shot"], 236, 675, 610, 1245)
    for badge in slide["badges"]:
        add_badge(draw, *badge, fill=(234, 242, 255, 255), fg=(0, 82, 204, 255), border=(191, 219, 254, 255))
    canvas.convert("RGB").save(output, quality=96)


def build_showcase(folder):
    files = sorted(folder.glob("play-*.png"))
    thumbs = []
    for path in files:
        im = Image.open(path).convert("RGB")
        im.thumbnail((260, 462), Image.Resampling.LANCZOS)
        thumbs.append((path, im.copy()))
    canvas = Image.new("RGB", (len(thumbs) * 300 + 40, 560), (255, 255, 255))
    draw = ImageDraw.Draw(canvas)
    draw.text((32, 24), folder.name.replace("-", " ").title(), font=font(32, True), fill=(17, 24, 39))
    x = 32
    for path, im in thumbs:
        canvas.paste(im, (x, 78))
        draw.text((x, 78 + im.height + 14), path.stem.replace("play-", ""), font=font(18, True), fill=(71, 85, 105))
        x += 300
    canvas.save(folder / "showcase.png", quality=96)


def main():
    slides = [
        {
            "slug": "01-business-dashboard",
            "verb": "TRACK",
            "desc": "DAILY BUSINESS HISAAB",
            "subline": "Sales, GST, receivable and payable in one view",
            "shot": REAL / "dashboard.png",
            "badges": [("GST snapshot", 60, 458), ("Cash flow", 60, 530), ("Khata ready", 60, 602)],
        },
        {
            "slug": "02-gst-invoice",
            "verb": "CREATE",
            "desc": "GST INVOICES FAST",
            "subline": "Sales billing with customer, tax and PDF flow",
            "shot": REAL / "sales-line-filled.png",
            "badges": [("GST billing", 60, 468), ("PDF invoice", 60, 540), ("Credit/Cash", 60, 612)],
        },
        {
            "slug": "03-gst-review",
            "verb": "REVIEW",
            "desc": "GST TOTALS CLEARLY",
            "subline": "Check taxable value, GST and grand total before posting",
            "shot": REAL / "sales-review-flat-invoice.png",
            "badges": [("Taxable value", 60, 468), ("GST total", 60, 540), ("Grand total", 60, 612)],
        },
        {
            "slug": "04-stock-ledger",
            "verb": "MANAGE",
            "desc": "STOCK LEDGER",
            "subline": "Inventory quantities and item balances for daily work",
            "shot": REAL / "stock.png",
            "badges": [("Inventory", 60, 468), ("Item balances", 60, 540), ("Godowns", 60, 612)],
        },
    ]

    for slide in slides:
        if not slide["shot"].exists():
            raise FileNotFoundError(f"Missing real app capture: {slide['shot']}")

    base = OUT / "aso-variations"
    variants = {
        "variation-a-indigo-bold": variation_a,
        "variation-b-blue-wave": variation_b,
        "variation-c-premium-light": variation_c,
    }
    for name, fn in variants.items():
        folder = base / name
        folder.mkdir(parents=True, exist_ok=True)
        for stale in folder.glob("play-*.png"):
            stale.unlink()
        for slide in slides:
            fn(slide, folder / f"play-{slide['slug']}.png")
        build_showcase(folder)
        print(f"generated {folder}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Tap picker fields on emulator and verify footer hides."""
from __future__ import annotations

import re
import subprocess
import time
from pathlib import Path

REPORT = Path(__file__).resolve().parents[2] / "e2e-reports"
PKG = "com.hisaabkro.mobile"


def adb(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["adb", *args], capture_output=True, text=True)


def deep_link(path: str) -> None:
    adb(
        "shell",
        "am",
        "start",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        f"hisaabkro://{path}",
        "-n",
        f"{PKG}/.MainActivity",
    )
    time.sleep(2.5)


def dump_ui() -> str:
    adb("shell", "uiautomator", "dump", "/sdcard/ui.xml")
    adb("pull", "/sdcard/ui.xml", str(REPORT / "ui-tmp.xml"))
    return (REPORT / "ui-tmp.xml").read_text()


def find_clickable_bounds(xml: str, needle: str) -> tuple[int, int, int, int] | None:
    for chunk in re.split(r"<node ", xml):
        if needle not in chunk or 'clickable="true"' not in chunk:
            continue
        match = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', chunk)
        if match:
            return tuple(int(v) for v in match.groups())  # type: ignore[return-value]
    return None


def tap_center(bounds: tuple[int, int, int, int]) -> tuple[int, int]:
    x1, y1, x2, y2 = bounds
    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
    adb("shell", "input", "tap", str(cx), str(cy))
    time.sleep(1.2)
    return cx, cy


def screenshot(name: str) -> None:
    with open(REPORT / name, "wb") as handle:
        subprocess.run(["adb", "exec-out", "screencap", "-p"], stdout=handle, check=True)
    print(f"saved {name}")


def footer_visible(xml: str, labels: list[str]) -> bool:
    return any(f'content-desc="{label}"' in xml or f'text="{label}"' in xml for label in labels)


def main() -> None:
    REPORT.mkdir(parents=True, exist_ok=True)
    adb("logcat", "-c")

    tests = [
        ("parties/new", "Maharashtra (27)", ["Create party"], "e2e-party-state-picker-v2.png"),
        ("items/new", "General", ["Create item"], "e2e-item-group-picker-v2.png"),
        ("sales/new", "Select customer", ["Next"], "e2e-sales-customer-picker-v2.png"),
        ("expenses/new", "Cash", ["Post expense"], "e2e-expense-payment-picker-v2.png"),
        ("returns/new", "Sales invoice", ["Post return"], "e2e-return-doc-picker-v2.png"),
        ("journal/new", "Select account", ["Post entry"], "e2e-journal-picker-v2.png"),
    ]

    print("screen|field|pass|details")
    for route, needle, footer_labels, shot in tests:
        deep_link(route)
        xml = dump_ui()
        bounds = find_clickable_bounds(xml, needle)
        if not bounds:
            print(f"{route}|{needle}|FAIL|no bounds")
            continue

        cx, cy = tap_center(bounds)
        xml_after = dump_ui()
        hidden = not footer_visible(xml_after, footer_labels)
        picker_hint = any(
            token in xml_after
            for token in ("Close", "Payment account", "Select state", "Ledger account")
        )
        screenshot(shot)
        status = "PASS" if hidden and picker_hint else "FAIL"
        if status == "FAIL":
            screenshot(f"e2e-fail-{route.replace('/', '-')}-{needle.replace(' ', '-')}.png")
        print(
            f"{route}|{needle}|{status}|tap={cx},{cy} footer_hidden={hidden} picker={picker_hint}"
        )
        adb("shell", "input", "keyevent", "4")
        time.sleep(0.5)

    log = adb("logcat", "-d", "-s", "ReactNativeJS:V").stdout
    errors = [
        line
        for line in log.splitlines()
        if re.search(r"error|invalid|re-render", line, re.I)
    ]
    if errors:
        print("LOGCAT_ERRORS:")
        for line in errors[-15:]:
            print(line)


if __name__ == "__main__":
    main()

"""UI 截图工具 — 给 Claude 看页面渲染效果用。

用法:
  python tools/screenshot.py <url> <out.png> [--full] [--width=1280] [--height=900] [--wait=1500]
  python tools/screenshot.py http://localhost:3000 /tmp/home.png --full

可选交互(截 hover/点击后的状态):
  --click="选择器"     点击某元素后再截
  --hover="选择器"     悬停某元素后再截
"""
import sys
from playwright.sync_api import sync_playwright


def kv(args, key, default):
    for a in args:
        if a.startswith(key + "="):
            return a.split("=", 1)[1]
    return default


def main():
    args = sys.argv[1:]
    url = next((a for a in args if a.startswith("http")), "http://localhost:3000")
    out = next((a for a in args if a.endswith(".png")), "/tmp/screenshot.png")
    full = "--full" in args
    width = int(kv(args, "--width", "1280"))
    height = int(kv(args, "--height", "900"))
    wait = int(kv(args, "--wait", "1500"))
    click = kv(args, "--click", None)
    hover = kv(args, "--hover", None)
    ls = []
    for a in args:
        if a.startswith("--ls="):
            kvp = a[5:]
            if "=" in kvp:
                k, v = kvp.split("=", 1)
                ls.append([k, v])
    # --ls-json=<file>：从 JSON 文件批量注入 localStorage（值为对象时自动 stringify）
    import json as _json
    ls_file = kv(args, "--ls-json", None)
    if ls_file:
        with open(ls_file, encoding="utf-8") as f:
            for k, v in _json.load(f).items():
                ls.append([k, v if isinstance(v, str) else _json.dumps(v, ensure_ascii=False)])

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": width, "height": height})
        page.goto(url, wait_until="networkidle", timeout=30000)
        if ls:
            page.evaluate("(pairs)=>{for(const [k,v] of pairs) localStorage.setItem(k,v)}", ls)
            page.reload(wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(wait)
        if hover:
            page.hover(hover)
            page.wait_for_timeout(400)
        if click:
            page.click(click)
            page.wait_for_timeout(600)
        page.screenshot(path=out, full_page=full)
        browser.close()
    print("saved", out)


if __name__ == "__main__":
    main()

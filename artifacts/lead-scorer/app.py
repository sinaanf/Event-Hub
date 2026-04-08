import os
import json
import re
import ipaddress
import socket
from urllib.parse import urlparse
from flask import Flask, request, jsonify, render_template
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import anthropic

BASE_PATH = os.environ.get("BASE_PATH", "/lead-scorer/").rstrip("/")

app = Flask(__name__)
app.config["APPLICATION_ROOT"] = BASE_PATH + "/"

ICP_FILE = os.path.join(os.path.dirname(__file__), "icp.txt")

_PRIVATE_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

def _is_private_ip(host: str) -> bool:
    try:
        infos = socket.getaddrinfo(host, None)
        for info in infos:
            addr = info[4][0]
            ip = ipaddress.ip_address(addr)
            if any(ip in net for net in _PRIVATE_RANGES):
                return True
        return False
    except Exception:
        return True

def validate_url(url: str) -> str | None:
    """Returns an error message if the URL is unsafe, or None if it's fine."""
    try:
        parsed = urlparse(url)
    except Exception:
        return "Invalid URL."

    if parsed.scheme not in ("http", "https"):
        return "Only http and https URLs are allowed."

    host = parsed.hostname
    if not host:
        return "Could not determine host from URL."

    if host.lower() in ("localhost", "0.0.0.0"):
        return "Requests to localhost are not allowed."

    if _is_private_ip(host):
        return "Requests to private/internal network addresses are not allowed."

    return None

def load_icp():
    try:
        with open(ICP_FILE, "r", encoding="utf-8") as f:
            return f.read().strip()
    except FileNotFoundError:
        return "No ICP defined."

def scrape_page(url: str) -> dict:
    import shutil
    system_chromium = shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
    launch_kwargs = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
    if system_chromium:
        launch_kwargs["executable_path"] = system_chromium

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch_kwargs)
        try:
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            try:
                page.wait_for_load_state("networkidle", timeout=10000)
            except PlaywrightTimeout:
                pass

            text = page.evaluate("""() => {
                const selectors = ['script', 'style', 'noscript', 'svg', 'path'];
                selectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => el.remove());
                });
                return document.body ? document.body.innerText : '';
            }""")

            links = page.evaluate("""() => {
                return Array.from(document.querySelectorAll('a[href]'))
                    .map(a => ({ text: a.innerText.trim(), href: a.href }))
                    .filter(l => l.href && !l.href.startsWith('javascript:'));
            }""")

            return {
                "text": text[:20000],
                "links": links[:200]
            }
        finally:
            browser.close()

def extract_and_score_leads(scraped_text: str, links: list) -> list:
    icp = load_icp()
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    links_text = "\n".join(
        f"- {l.get('text', '')} -> {l.get('href', '')}"
        for l in links[:100]
    )

    prompt = f"""You are a B2B sales intelligence assistant. Your job is to extract leads from scraped web page content and score each lead against an Ideal Customer Profile (ICP).

--- IDEAL CUSTOMER PROFILE ---
{icp}

--- SCRAPED PAGE TEXT ---
{scraped_text}

--- LINKS FOUND ON PAGE ---
{links_text}

--- INSTRUCTIONS ---
1. Extract every identifiable person from the page content and links above.
2. For each person, populate as many fields as possible:
   - first_name (string or null)
   - last_name (string or null)
   - title (job title, string or null)
   - company (string or null)
   - email (string or null — look for mailto: links or email patterns in text)
   - linkedin (full LinkedIn profile URL, string or null — look for linkedin.com/in/ links)
3. Score each lead from 0 to 100 against the ICP described above.
   - 70–100: Strong match (green)
   - 40–69: Moderate match (amber)
   - 0–39: Poor match (red)
4. Write a brief reason (1–2 sentences) explaining the score.
5. If no identifiable people are found, return an empty array.

Respond ONLY with a valid JSON array. No markdown, no code fences, no extra text. Example format:
[
  {{
    "first_name": "Jane",
    "last_name": "Smith",
    "title": "VP of Sales",
    "company": "Acme Corp",
    "email": "jane@acme.com",
    "linkedin": "https://linkedin.com/in/janesmith",
    "score": 85,
    "reason": "Decision-maker in a mid-size SaaS company with direct revenue responsibility."
  }}
]"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()

    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)

    leads = json.loads(raw)
    return leads


@app.route(BASE_PATH + "/")
@app.route(BASE_PATH)
@app.route("/")
def index():
    return render_template("index.html", base_path=BASE_PATH)


@app.route(BASE_PATH + "/scrape", methods=["POST"])
@app.route("/scrape", methods=["POST"])
def scrape():
    data = request.get_json(force=True)
    url = (data or {}).get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    ssrf_error = validate_url(url)
    if ssrf_error:
        return jsonify({"error": ssrf_error}), 400

    try:
        scraped = scrape_page(url)
    except PlaywrightTimeout:
        return jsonify({"error": "Page load timed out. Try a different URL or check that the site is publicly accessible."}), 504
    except Exception as e:
        app.logger.error("Scraping error for %s: %s", url, e)
        return jsonify({"error": "Failed to scrape the page. The site may be blocking automated access."}), 500

    try:
        leads = extract_and_score_leads(scraped["text"], scraped["links"])
    except json.JSONDecodeError as e:
        app.logger.error("Claude JSON parse error: %s", e)
        return jsonify({"error": "Lead extraction failed: unexpected response format from AI. Please try again."}), 500
    except anthropic.APIError as e:
        app.logger.error("Claude API error: %s", e)
        return jsonify({"error": "AI service error. Please try again in a moment."}), 500
    except Exception as e:
        app.logger.error("Extraction error: %s", e)
        return jsonify({"error": "Lead extraction failed. Please try again."}), 500

    return jsonify({"leads": leads, "url": url})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)

"""
Scraper LinkedIn — Playwright + Google Chrome.
Extraction via JavaScript evaluate() directement dans le navigateur
pour contourner les sélecteurs CSS obfusqués de LinkedIn.
Stats extraites : likes, commentaires, reposts, impressions.
"""

import os
import re
import time
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

PROFILE_URL = "https://www.linkedin.com/in/thibault-bellec/recent-activity/all/"
CHROME_PATH  = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
SESSION_DIR  = os.path.join(os.path.dirname(__file__), "playwright_session")

# Conteneurs de posts — essayés dans l'ordre
POST_CONTAINER_SELECTORS = [
    "div.feed-shared-update-v2",
    "div.occludable-update",
    "div[data-view-name='profile-card']",
    "li.profile-creator-shared-feed-update__container",
    "div[data-urn*='activity']",
]

# ─── Script JS d'extraction ───────────────────────────────────────────────────
# Exécuté dans le contexte du navigateur sur chaque conteneur de post.
# Utilise aria-labels (stables) + recherche textuelle comme fallback.

_EXTRACT_JS = """
el => {
    /* ── Utilitaires ─────────────────────────────────────── */

    // Récupère le innerText du premier sélecteur qui match
    const get = (...sels) => {
        for (const s of sels) {
            try {
                const n = el.querySelector(s);
                if (n) {
                    const t = (n.innerText || n.textContent || '').trim();
                    if (t) return t;
                }
            } catch(_) {}
        }
        return '';
    };

    // Cherche dans les aria-labels les mots-clés et extrait le premier nombre
    const fromAria = (...keywords) => {
        const nodes = el.querySelectorAll('[aria-label]');
        for (const n of nodes) {
            const label = (n.getAttribute('aria-label') || '').toLowerCase();
            if (keywords.some(k => label.includes(k))) {
                // Extraire le premier nombre (avec séparateurs de milliers)
                const m = label.match(/([\d][\\d\\s ,.]*)/);
                if (m) return m[1].replace(/[\\s ]/g, '').replace(',', '.');
            }
        }
        return '';
    };

    // Cherche un texte contenant un nombre ET un mot-clé dans les noeuds feuilles
    const fromLeafText = (...keywords) => {
        const all = el.querySelectorAll('span, button, a, li');
        for (const n of all) {
            if (n.children.length > 0) continue; // garder seulement les feuilles
            const t = (n.innerText || n.textContent || '').trim();
            if (t.match(/\\d/) && keywords.some(k => t.toLowerCase().includes(k))) {
                return t;
            }
        }
        return '';
    };

    /* ── Contenu du post ─────────────────────────────────── */
    const content = get(
        '.feed-shared-text span[dir="ltr"]',
        '.feed-shared-text',
        '.update-components-text span[dir="ltr"]',
        '.update-components-text',
        '.feed-shared-update-v2__description',
        '[class*="commentary"]',
        'span[dir="ltr"]'
    ) || el.innerText.trim().slice(0, 3000);

    /* ── Date relative (ex: "2 sem.") ────────────────────── */
    const date = get(
        '.update-components-actor__sub-description span[aria-hidden="true"]',
        '.feed-shared-actor__sub-description span[aria-hidden="true"]',
        '.update-components-actor__sub-description',
        'time'
    );

    /* ── Réactions/Likes ─────────────────────────────────── */
    // aria-label : "1 234 personnes ont réagi" / "Voir les 56 réactions"
    let likes =
        fromAria('réaction', 'reaction', "j'aime", 'like', 'personnes ont réagi') ||
        get(
            '.social-details-social-counts__reactions-count',
            'span[data-test-id="social-counts-reactions"]',
            '.social-details-social-counts__count-value'
        ) ||
        fromLeafText('réaction', 'reaction');

    /* ── Commentaires ────────────────────────────────────── */
    let comments =
        fromAria('commentaire', 'comment') ||
        get(
            '.social-details-social-counts__comments span',
            'button[data-test-id="social-counts-comments"] span'
        ) ||
        fromLeafText('commentaire', 'comment');

    /* ── Republications / Reposts ────────────────────────── */
    let reposts =
        fromAria('republication', 'repost', 'partage', 'share') ||
        get('.social-details-social-counts__shares span') ||
        fromLeafText('republication', 'repost', 'partage');

    /* ── Impressions ─────────────────────────────────────── */
    // LinkedIn affiche "X impressions" pour vos propres posts
    let impressions =
        fromAria('impression', 'vue', 'view') ||
        fromLeafText('impression') ||
        get('[data-test-id="analytics-impressions"]', '[class*="impression"]');

    return { content, date, likes, comments, reposts, impressions };
}
"""


# ─── Parsing des nombres ──────────────────────────────────────────────────────

def _parse_count(text) -> int:
    """
    Convertit un texte LinkedIn en entier.
    Gère : '1 234', '1 234', '1.2k', '12k', '1,2k', '45'.
    """
    if not text:
        return 0
    t = str(text).strip().lower()
    # Supprimer espaces insécables et normaux utilisés comme séparateurs de milliers
    t = re.sub(r"[\s  ]", "", t)
    # Gérer le format "1.2k" ou "1,2k"
    m = re.match(r"^([\d]+[.,]?[\d]*)k$", t)
    if m:
        try:
            return int(float(m.group(1).replace(",", ".")) * 1000)
        except ValueError:
            pass
    # Extraire seulement les chiffres
    digits = re.sub(r"[^\d]", "", t)
    return int(digits) if digits else 0


# ─── Scraper principal ────────────────────────────────────────────────────────

def scrape_linkedin_posts(max_scrolls: int = 40) -> list[dict]:
    """
    Scrape tous les posts visibles + leurs stats d'engagement.
    Retourne une liste de dicts prêts à insérer en base.
    """
    extracted = []
    os.makedirs(SESSION_DIR, exist_ok=True)

    with sync_playwright() as p:
        print("[*] Ouverture de Google Chrome...")
        context = p.chromium.launch_persistent_context(
            user_data_dir=SESSION_DIR,
            executable_path=CHROME_PATH,
            headless=False,
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = context.new_page()

        # ── 1. Navigation ─────────────────────────────────────────────────────
        print(f"[*] Navigation vers {PROFILE_URL}")
        try:
            page.goto(PROFILE_URL, wait_until="domcontentloaded", timeout=30_000)
        except PlaywrightTimeout:
            print("[!] Timeout de chargement — on continue")
        time.sleep(3)

        # ── 2. Détection authwall ─────────────────────────────────────────────
        AUTHWALL = ["input#session_key", "input#session_password",
                    ".authwall-join-form", "form.login__form"]

        is_authwall = any(kw in page.url for kw in ("authwall", "login", "checkpoint", "signup"))
        if not is_authwall:
            is_authwall = any(page.query_selector(s) for s in AUTHWALL)

        if is_authwall:
            print("\n[!] Connexion LinkedIn requise.")
            print("[>] Connectez-vous dans Chrome, puis attendez.")
            print("    Le scraping reprendra automatiquement.\n")
            page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded")
            try:
                page.wait_for_url(
                    lambda url: "linkedin.com/feed" in url or "linkedin.com/in/" in url,
                    timeout=600_000,
                )
                print("[OK] Connexion detectee.")
            except PlaywrightTimeout:
                print("[ERREUR] Timeout connexion (10 min). Abandon.")
                context.close()
                return []
            page.goto(PROFILE_URL, wait_until="domcontentloaded", timeout=30_000)
            time.sleep(5)

        # ── 3. Scroll ─────────────────────────────────────────────────────────
        print("[*] Scroll pour charger tous les posts...")
        prev_height, stalls = 0, 0
        for i in range(max_scrolls):
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(2.5)
            h = page.evaluate("() => document.body.scrollHeight")
            if h == prev_height:
                stalls += 1
                if stalls >= 4:
                    print(f"   Fin du contenu (scroll {i+1}).")
                    break
            else:
                stalls = 0
            prev_height = h
            for sel in POST_CONTAINER_SELECTORS:
                n = len(page.query_selector_all(sel))
                if n:
                    print(f"   Scroll {i+1} — {n} posts visibles")
                    break

        # ── 4. Extraction via JS ──────────────────────────────────────────────
        print("[*] Extraction des donnees...")
        containers = []
        for sel in POST_CONTAINER_SELECTORS:
            containers = page.query_selector_all(sel)
            if containers:
                print(f"   Selecteur : '{sel}' -> {len(containers)} posts")
                break

        if not containers:
            print("[!] Aucun post trouve.")
            page.screenshot(path=os.path.join(os.path.dirname(__file__), "debug_scraper.png"))
            context.close()
            return []

        seen = set()
        for i, container in enumerate(containers):
            try:
                # Extraction JS dans le contexte navigateur
                raw = container.evaluate(_EXTRACT_JS)

                content = (raw.get("content") or "").strip()
                if not content or len(content) < 10:
                    continue

                content = content[:3000]
                lines = [l.strip() for l in content.splitlines() if l.strip()]
                title = next((l for l in lines if len(l) > 15), lines[0] if lines else content[:100])
                title = title[:300]

                key = title[:80].lower()
                if key in seen:
                    continue
                seen.add(key)

                likes       = _parse_count(raw.get("likes"))
                comments    = _parse_count(raw.get("comments"))
                reposts     = _parse_count(raw.get("reposts"))
                impressions = _parse_count(raw.get("impressions"))

                extracted.append({
                    "title":            title,
                    "content":          content,
                    "status":           "published",
                    "planned_date":     None,
                    "likes":            likes,
                    "comments":         comments,
                    "reposts":          reposts,
                    "impressions":      impressions,
                    "linkedin_date_raw": (raw.get("date") or "").strip(),
                })

                stats = f"likes={likes} comments={comments} reposts={reposts} impressions={impressions}"
                print(f"   [+] [{i+1}] {title[:50]}... | {stats}")

            except Exception as e:
                print(f"   [!] Post {i+1} erreur : {e}")

        context.close()

    print(f"\n[OK] {len(extracted)} posts extraits.")
    return extracted

"""
Parseur de texte LinkedIn.
Transforme le texte brut collé depuis la page LinkedIn en liste de dicts.
Filtre uniquement les posts propres (Thibault Bellec • Vous + Voir les statistiques).
"""

import re

# Mots de réaction LinkedIn concaténés (ligne seule)
_REACTION_RE = re.compile(
    r'^(like|love|celebrate|support|funny|insightful|curious)+$', re.IGNORECASE
)

# Lignes de bruit à retirer du contenu
_NOISE = [
    re.compile(r'^… plus$'),
    re.compile(r"^Activez pour voir l'image en plus grand\.$"),
    re.compile(r'^Aucune description alternative pour cette image$'),
    re.compile(r'^Le chargement de votre document est terminé$'),
    re.compile(r'^Lire$'),
    re.compile(r'^Temps restant'),
    re.compile(r'^Vitesse de lecture$'),
    re.compile(r'^Activer$'),
    re.compile(r'^Activer le plein écran$'),
    re.compile(r'^\+\d+$'),            # "+5" indicateur d'images
    re.compile(r'^Voir les identifiants de contenu$'),
]


def _is_noise(line: str) -> bool:
    s = line.strip()
    return any(p.match(s) for p in _NOISE)


def _parse_int(text: str) -> int:
    """Extrait un entier depuis une chaîne avec espaces/virgules en séparateurs."""
    clean = re.sub(r'[\s ,]', '', str(text))
    m = re.match(r'^\d+', clean)
    return int(m.group()) if m else 0


def _extract_stats(left_block: str) -> tuple:
    """
    Depuis le bloc gauche (avant 'J'aime'), extrait (likes, comments, reposts).
    """
    # Retire le "like" de fin (bouton action)
    block = re.sub(r'\nlike\s*$', '', left_block.strip())

    comments = 0
    m = re.search(r'(\d[\d\s ]*)\s*commentaires?', block, re.IGNORECASE)
    if m:
        comments = _parse_int(m.group(1))

    reposts = 0
    m = re.search(r'(\d[\d\s ]*)\s*republications?', block, re.IGNORECASE)
    if m:
        reposts = _parse_int(m.group(1))

    likes = 0
    lines = block.split('\n')
    for i, line in enumerate(lines):
        s = line.strip().lower()
        if s and _REACTION_RE.match(s):
            # La ligne suivante non vide est le nombre de réactions
            for j in range(i + 1, min(i + 5, len(lines))):
                nxt = lines[j].strip()
                if not nxt:
                    continue
                pure = re.match(r'^(\d[\d\s ]*)$', nxt)
                if pure:
                    likes = _parse_int(pure.group(1))
                else:
                    # "Vous et N autres personnes"
                    vm = re.match(r'Vous et (\d+) autres', nxt)
                    if vm:
                        likes = int(vm.group(1)) + 1
                break
            break

    return likes, comments, reposts


def _extract_content_and_title(block: str, vis_end: int) -> tuple:
    """
    Extrait le contenu et le titre depuis le bloc de texte,
    à partir de la fin de la ligne de visibilité (vis_end).
    Retourne (content, title).
    """
    raw = block[vis_end:]

    # Nettoyer le bruit ligne par ligne
    lines_clean = []
    for ln in raw.split('\n'):
        if not _is_noise(ln.strip()):
            lines_clean.append(ln)

    # Retirer les lignes de stats en fin de bloc
    # (réaction, nombre, description, commentaires, republications)
    while lines_clean:
        last = lines_clean[-1].strip()
        llow = last.lower()
        if (
            not last
            or _REACTION_RE.match(llow)
            or re.match(r'^\d[\d\s ]*$', last)
            or re.match(r'^vous et \d+', llow)
            or re.match(r'^\w[\w\s]* et \d+ autres', llow)  # "Florian et 6 autres"
            or re.match(r'^\d+\s*commentaires?$', llow)
            or re.match(r'^\d+\s*republications?$', llow)
        ):
            lines_clean.pop()
        else:
            break

    content = '\n'.join(lines_clean).strip()
    if len(content) < 10:
        return None, None

    # Titre : première ligne de plus de 15 caractères
    title_candidates = [l.strip() for l in content.split('\n') if l.strip()]
    title = next((l for l in title_candidates if len(l) > 15), title_candidates[0] if title_candidates else "")
    return content[:3000], title[:300]


def parse_linkedin_page_text(text: str) -> list:
    """
    Reçoit le texte brut collé depuis la page LinkedIn.
    Retourne une liste de dicts : title, content, likes, comments, reposts,
    impressions, linkedin_date_raw.
    """
    # Séparation en blocs post
    blocks = re.split(r"Post du fil d'actualité numéro \d+", text)

    results = []
    seen = set()

    for block in blocks[1:]:
        # Filtre : uniquement ses propres posts avec stats
        if '• Vous' not in block and 'Thibault Bellec • Vous' not in block:
            continue
        if "a republié ceci" in block:
            continue
        if 'Voir les statistiques' not in block:
            continue

        # Ligne de visibilité (marque la fin de l'en-tête)
        vis_match = re.search(r'Visible (?:de tous|uniquement)[^\n]*\n', block)
        if not vis_match:
            continue

        header = block[:vis_match.start()]

        # Date relative (dans l'en-tête, ex : "4 sem." ou "3 mois")
        date_raw = ""
        dm = re.search(r'(\d+)\s*(h|j\.|sem\.|mois|an)', header)
        if dm:
            date_raw = dm.group(0).strip()

        # Séparation sur "J'aime" pour isoler le bloc de stats
        split = re.split(r"\nJ'aime\s*\n", block, maxsplit=1)
        if len(split) < 2:
            continue
        left, right = split

        # Impressions (dans la partie droite, avant "Voir les statistiques")
        impressions = 0
        imp_m = re.search(r'([\d\s ]+)\s*impressions', right)
        if imp_m:
            impressions = _parse_int(imp_m.group(1))

        # Likes, commentaires, reposts depuis la partie gauche
        likes, comments, reposts = _extract_stats(left)

        # Contenu et titre
        content, title = _extract_content_and_title(block, vis_match.end())
        if not content or not title:
            continue

        # Dédoublonnage dans ce batch
        key = title[:80].lower()
        if key in seen:
            continue
        seen.add(key)

        results.append({
            "title":            title,
            "content":          content,
            "likes":            likes,
            "comments":         comments,
            "reposts":          reposts,
            "impressions":      impressions,
            "linkedin_date_raw": date_raw,
        })

    return results

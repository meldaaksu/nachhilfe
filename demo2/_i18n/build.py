"""Build the Turkish and English pages from the German ones.

The German pages in demo1/ are the source. Every visible text (and alt, aria-label, title, meta
content) found in TEXTS is replaced; everything else stays as it is. Run after changing German pages:

    python3 _i18n/build.py

It writes tr/ and en/ next to the German pages and lists German texts that have no translation yet.
Impressum and Datenschutz stay German only.
"""
import html
import pathlib
import re

from texts import TEXTS

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ['index.html', 'kurse.html', 'projekte.html', 'ueber-uns.html']
GERMAN_ONLY = ['impressum.html', 'datenschutz.html']
LANGS = {'de': 'DE', 'tr': 'TR', 'en': 'EN'}
# Texts that are the same in every language (names, formulas, sample phrases in the speech bubbles).
KEEP = re.compile(r'^(DE|TR|EN|FOKUS.*|Luisen Bildungsverein e\.V\.|Darmstadt|Online|Bonjour!|x² \+ y² = z²|H₂O|info@beispiel\.de|info@fokuslernzentrum\.de|06151 4920501|'
                  r'Saalbaustraße 22.*|64283 Darmstadt|https?://.*|summary_large_image|website|noindex|#\w+|width=.*|Hallo!.*|Hello!.*|Bonjour !.*|Was für.*|Schön, dich.*|.*\|.*)$')
ATTRS = re.compile(r'\b(alt|aria-label|placeholder|content|title)="([^"]*)"')


def switcher(page, lang):
    """Language links for the header: same page in the other languages (German-only pages link to the home pages)."""
    links = []
    for code, label in LANGS.items():
        target = page if page in PAGES else 'index.html'
        if lang == 'de':
            href = target if code == 'de' else f'{code}/{target}'
        else:
            href = f'../{target}' if code == 'de' else (target if code == lang else f'../{code}/{target}')
        current = ' aria-current="true"' if code == lang else ''
        links.append(f'<a href="{href}" lang="{code}" hreflang="{code}"{current}>{label}</a>')
    label = 'Sprache' if lang == 'de' else TEXTS['Sprache'][lang]
    return f'<div class="lang-switch" aria-label="{label}">' + ''.join(links) + '</div>'


def put_switcher(source, page, lang):
    return re.sub(r'<div class="lang-switch".*?</div>', lambda m: switcher(page, lang), source, count=1, flags=re.S)


def translate(source, lang, missing):
    table = {de: texts[lang] for de, texts in TEXTS.items()}
    out, skip = [], 0
    for part in re.split(r'(<[^>]+>)', source):
        if part.startswith('<'):
            name = re.match(r'</?([a-zA-Z0-9]+)', part)
            if name and name.group(1).lower() in ('script', 'style'):
                skip += -1 if part.startswith('</') else 1
            # The speech bubbles' phrases are samples of each language and stay as they are.
            if 'data-phrases' not in part:
                part = ATTRS.sub(lambda m: f'{m.group(1)}="{attr(m.group(2), table, missing)}"', part)
            out.append(part)
            continue
        core = ' '.join(html.unescape(part).split())
        if skip or not core or not any(c.isalpha() for c in core):
            out.append(part)
        elif core in table:
            lead, trail = re.match(r'^\s*', part).group(), re.search(r'\s*$', part).group()
            out.append(lead + html.escape(table[core], quote=False) + trail)
        else:
            if not KEEP.match(core):
                missing.add(core)
            out.append(part)
    return ''.join(out)


def attr(value, table, missing):
    core = html.unescape(value)
    if core in table:
        return html.escape(table[core])
    if any(c.isalpha() for c in core) and not KEEP.match(core):
        missing.add(core)
    return value


def relocate(source):
    """Paths for a page one folder deeper (tr/, en/)."""
    source = source.replace('"../images/', '"../../images/')
    for asset in ('style.css', 'script.js', 'fokus-logo-light.svg', 'favicon.png', 'apple-touch-icon.png', 'impressum.html', 'datenschutz.html'):
        source = source.replace(f'"{asset}', f'"../{asset}')
    return source


missing = set()
for page in PAGES + GERMAN_ONLY:
    path = ROOT / page
    path.write_text(put_switcher(path.read_text(), page, 'de'))
for lang in ('tr', 'en'):
    (ROOT / lang).mkdir(exist_ok=True)
    for page in PAGES:
        source = (ROOT / page).read_text()
        source = source.replace('<html lang="de">', f'<html lang="{lang}">', 1)
        source = put_switcher(relocate(translate(source, lang, missing)), page, lang)
        (ROOT / lang / page).write_text(source)

print('Fertig: tr/ und en/ erzeugt.')
if missing:
    print('Ohne Übersetzung:')
    for text in sorted(missing):
        print('  -', text)

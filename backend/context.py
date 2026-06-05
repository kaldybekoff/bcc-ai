"""
Загрузка базы знаний BCC.

Парсит все .doc файлы из backend/knowledge/ (включая подпапки) в одну строку.
Загружается один раз при старте сервера и кэшируется в памяти.

Большинство файлов — MHTML-экспорт из Confluence, 1 (общие условия.doc) — Word 97.

КЛЮЧЕВОЕ ОТЛИЧИЕ от старого парсера (html2text):
Ставки/лимиты/тарифы в Confluence лежат в <table> и в карточках (aura-card),
где заголовок и значение — разные элементы. html2text расплющивал их в плоский
список чисел без привязки к продукту ("14,50%", "СТАВКА" по отдельности).
Здесь используется BeautifulSoup:
  • реальные <table> → markdown-таблицы (строки/колонки сохраняются);
  • aura-card → строка "**заголовок** — значение" (связь не теряется);
карточки одной группы (aura-cards-wrapper) идут подряд.
"""
from __future__ import annotations

import email
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"

# ── HTML → Markdown (BeautifulSoup) ───────────────────────────────────────────

_SKIP_TAGS = {"script", "style", "svg", "img", "noscript", "head", "input", "button"}
_HEADINGS = {"h1": 1, "h2": 2, "h3": 3, "h4": 4, "h5": 5, "h6": 6}
_BLOCK_TAGS = {"p", "div", "section", "article", "ul", "ol", "tbody", "thead"}

# Служебный мусор Confluence-экспорта (точное совпадение строки целиком)
_NOISE_LINES = {
    "КАЗ", "Назад", "Вопрос:", "Электронный адрес:", "Задать вопрос",
    "Список СПИ", "* * *", "•", "—",
}


def _clean(text: str) -> str:
    return text.replace("\xa0", " ").strip()


def _looks_like_b64_junk(line: str) -> bool:
    """True для строк-блобов base64 (встроенные картинки), а не текста.

    Признаки: длинная строка без пробелов из символов base64 (картинки нарезаны
    на строки по ~76 символов). Кириллица в charset не входит, поэтому русский
    текст, e-mail (@,.) и URL (:) сюда не попадают.
    """
    s = line.strip()
    if len(s) < 60 or " " in s:
        return False
    return bool(re.fullmatch(r"[A-Za-z0-9+/=]+", s))


def _cell_text(cell: Tag) -> str:
    return _clean(cell.get_text(" ", strip=True)).replace("|", "\\|").replace("\n", " ")


def _render_table(table: Tag) -> str:
    """Реальная <table> → markdown-таблица с сохранением строк и колонок."""
    rows: list[list[str]] = []
    for tr in table.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if not cells:
            continue
        rows.append([_cell_text(c) for c in cells])
    rows = [r for r in rows if any(c.strip() for c in r)]
    if not rows:
        return ""
    ncol = max(len(r) for r in rows)
    rows = [r + [""] * (ncol - len(r)) for r in rows]
    out = ["| " + " | ".join(rows[0]) + " |",
           "| " + " | ".join(["---"] * ncol) + " |"]
    for r in rows[1:]:
        out.append("| " + " | ".join(r) + " |")
    return "\n".join(out)


def _render_cards(wrapper: Tag) -> str:
    """Группа карточек aura-card → строки '**заголовок** — значение'."""
    lines: list[str] = []
    for card in wrapper.find_all("div", class_="aura-card"):
        t = card.find(class_="aura-card-title")
        b = card.find(class_="aura-card-body")
        tt = _clean(t.get_text(" ", strip=True)) if t else ""
        bb = _clean(b.get_text(" ", strip=True)) if b else ""
        if tt and bb:
            lines.append(f"- **{tt}** — {bb}")
        elif tt:
            lines.append(f"- **{tt}**")
        elif bb:
            lines.append(f"- {bb}")
    return "\n".join(lines)


def _walk(node: Tag, out: list[str]) -> None:
    for child in node.children:
        if isinstance(child, NavigableString):
            txt = _clean(str(child))
            if txt:
                out.append(txt + " ")
            continue
        if not isinstance(child, Tag):
            continue

        name = child.name
        if name in _SKIP_TAGS:
            continue

        classes = child.get("class") or []

        if name == "table":
            md = _render_table(child)
            if md:
                out.append("\n\n" + md + "\n\n")
            continue

        if "aura-cards-wrapper" in classes:
            md = _render_cards(child)
            if md:
                out.append("\n" + md + "\n")
            continue

        if name in _HEADINGS:
            txt = _clean(child.get_text(" ", strip=True))
            if txt:
                out.append(f"\n\n{'#' * _HEADINGS[name]} {txt}\n")
            continue

        if name == "li":
            txt = _clean(child.get_text(" ", strip=True))
            if txt:
                out.append(f"- {txt}\n")
            continue

        if name == "br":
            out.append("\n")
            continue

        if name in _BLOCK_TAGS:
            out.append("\n")
            _walk(child, out)
            out.append("\n")
        else:
            _walk(child, out)


def _html_to_markdown(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    body = soup.body or soup
    out: list[str] = []
    _walk(body, out)
    text = "".join(out)

    # нормализация пробелов и переносов
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # выкидываем строки-мусор Confluence и base64-блобы изображений
    kept = [
        ln for ln in text.split("\n")
        if ln.strip() not in _NOISE_LINES and not _looks_like_b64_junk(ln)
    ]
    return "\n".join(kept).strip()


# ── парсеры файлов ────────────────────────────────────────────────────────────

def _is_mhtml(raw: bytes) -> bool:
    head = raw[:2048].lstrip()
    return head.startswith((b"Date:", b"MIME-Version:", b"From:", b"Content-Type:"))


def _parse_mhtml(path: Path) -> str:
    raw = path.read_bytes()
    msg = email.message_from_bytes(raw)
    html_parts: list[str] = []
    for part in msg.walk():
        if part.get_content_type() != "text/html":
            continue
        payload = part.get_payload(decode=True)
        if not payload:
            continue
        charset = part.get_content_charset() or "utf-8"
        if charset.lower() in ("unicode", "unicode-1-1-utf-8"):
            charset = "utf-16"
        html_parts.append(payload.decode(charset, errors="replace"))
    return _html_to_markdown("\n".join(html_parts))


def _parse_word97(path: Path) -> str:
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        return f"[{path.name}: LibreOffice не найден, файл пропущен]"
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [soffice, "--headless", "--convert-to", "docx", "--outdir", tmp, str(path)],
            check=True,
            capture_output=True,
            timeout=180,
        )
        docx_path = next(Path(tmp).glob("*.docx"), None)
        if not docx_path:
            return f"[{path.name}: конвертация не дала .docx]"
        from docx import Document
        doc = Document(str(docx_path))
        lines = [
            p.text for p in doc.paragraphs
            if p.text.strip() and not _looks_like_b64_junk(p.text)
        ]
        return "\n".join(lines)


def _parse_file(path: Path) -> str:
    raw = path.read_bytes()
    if _is_mhtml(raw):
        return _parse_mhtml(path)
    return _parse_word97(path)


# ── публичный API ─────────────────────────────────────────────────────────────

def load_context() -> str:
    """Загрузить все .doc файлы (рекурсивно) и вернуть единую строку базы знаний."""
    files = sorted(KNOWLEDGE_DIR.rglob("*.doc"))
    if not files:
        raise RuntimeError(
            f"В {KNOWLEDGE_DIR} нет .doc файлов. "
            "Положите файлы базы знаний (см. KNOWLEDGE_BASE.md)."
        )

    sections: list[str] = []
    for path in files:
        print(f"  • {path.name} …", end=" ", flush=True)
        try:
            text = _parse_file(path)
            sections.append(f"=== {path.name} ===\n{text.strip()}")
            print("OK")
        except Exception as exc:  # noqa: BLE001
            sections.append(f"=== {path.name} ===\n[Ошибка: {exc}]")
            print(f"ОШИБКА: {exc}")

    return "\n\n".join(s for s in sections if s)


# ── singleton cache ───────────────────────────────────────────────────────────

_CONTEXT: str | None = None
_FILE_COUNT: int = 0


def get_context() -> str:
    global _CONTEXT, _FILE_COUNT
    if _CONTEXT is None:
        files = list(KNOWLEDGE_DIR.rglob("*.doc"))
        _FILE_COUNT = len(files)
        print(f"Загрузка базы знаний: {_FILE_COUNT} файлов…")
        _CONTEXT = load_context()
        print(f"База знаний загружена: {len(_CONTEXT):,} символов")
    return _CONTEXT


def get_file_count() -> int:
    return _FILE_COUNT

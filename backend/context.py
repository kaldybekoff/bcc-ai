"""
Загрузка базы знаний BCC.

Парсит все 16 .doc файлов из backend/knowledge/ в одну строку.
Загружается один раз при старте сервера и кэшируется в памяти.

15 файлов — MHTML из Confluence.
1 файл  — общие условия.doc (Word 97, нужен LibreOffice).
"""
from __future__ import annotations

import email
import shutil
import subprocess
import tempfile
from pathlib import Path

import html2text

KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"

# ── parsers ──────────────────────────────────────────────────────────────────

def _is_mhtml(raw: bytes) -> bool:
    head = raw[:2048].lstrip()
    return head.startswith((b"Date:", b"MIME-Version:", b"From:", b"Content-Type:"))


def _parse_mhtml(path: Path) -> str:
    raw = path.read_bytes()
    msg = email.message_from_bytes(raw)
    parts: list[str] = []
    for part in msg.walk():
        if part.get_content_type() != "text/html":
            continue
        payload = part.get_payload(decode=True)
        if not payload:
            continue
        charset = part.get_content_charset() or "utf-8"
        if charset.lower() in ("unicode", "unicode-1-1-utf-8"):
            charset = "utf-16"
        html = payload.decode(charset, errors="replace")
        h = html2text.HTML2Text()
        h.ignore_links = True
        h.ignore_images = True
        h.body_width = 0
        parts.append(h.handle(html))
    return "\n".join(parts).strip()


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
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def _parse_file(path: Path) -> str:
    raw = path.read_bytes()
    if _is_mhtml(raw):
        return _parse_mhtml(path)
    return _parse_word97(path)


# ── public API ────────────────────────────────────────────────────────────────

def load_context() -> str:
    """Загрузить все .doc файлы и вернуть единую строку базы знаний."""
    files = sorted(KNOWLEDGE_DIR.rglob("*.doc"))
    if not files:
        raise RuntimeError(
            f"В {KNOWLEDGE_DIR} нет .doc файлов. "
            "Положите 16 файлов базы знаний (см. KNOWLEDGE_BASE.md)."
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

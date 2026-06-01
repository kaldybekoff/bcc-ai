"""Парсинг файлов базы знаний BCC.

15 файлов — MHTML экспорт из Confluence.
1 файл — общие_условия.doc — старый бинарный Word 97 (нужен LibreOffice).

См. KNOWLEDGE_BASE.md и CLAUDE.md.
"""
from __future__ import annotations

import email
import shutil
import subprocess
import tempfile
from pathlib import Path

import html2text


def _looks_like_mhtml(raw: bytes) -> bool:
    """MHTML-файлы начинаются с заголовков письма (Date:/MIME-Version:/From:)."""
    head = raw[:2048].lstrip()
    return head.startswith((b"Date:", b"MIME-Version:", b"From:", b"Content-Type:"))


def parse_mhtml(filepath: str | Path) -> str:
    """Распарсить MHTML (.doc из Confluence) → чистый текст."""
    raw = Path(filepath).read_bytes()
    msg = email.message_from_bytes(raw)

    parts: list[str] = []
    for part in msg.walk():
        if part.get_content_type() != "text/html":
            continue
        payload = part.get_payload(decode=True)
        if not payload:
            continue
        charset = part.get_content_charset() or "utf-8"
        # "unicode" в MHTML означает UTF-16 LE
        if charset.lower() in ("unicode", "unicode-1-1-utf-8"):
            charset = "utf-16"
        html = payload.decode(charset, errors="replace")

        h = html2text.HTML2Text()
        h.ignore_links = True
        h.ignore_images = True
        h.body_width = 0  # не переносить строки
        parts.append(h.handle(html))

    return "\n".join(parts).strip()


def parse_word97(filepath: str | Path) -> str:
    """Распарсить старый Word 97 (.doc) через LibreOffice → текст.

    Требуется установленный `soffice` (libreoffice). Конвертирует .doc → .docx
    во временную папку, затем читает через python-docx.
    """
    from docx import Document  # импорт здесь, чтобы parse_mhtml не требовал python-docx

    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        raise RuntimeError(
            "LibreOffice (soffice) не найден. Установите libreoffice для парсинга "
            f"{Path(filepath).name}."
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        subprocess.run(
            [soffice, "--headless", "--convert-to", "docx", "--outdir", tmpdir, str(filepath)],
            check=True,
            capture_output=True,
            timeout=180,
        )
        docx_path = next(Path(tmpdir).glob("*.docx"), None)
        if docx_path is None:
            raise RuntimeError(f"Конвертация не дала .docx файла для {filepath}")

        doc = Document(str(docx_path))
        lines = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(lines).strip()


def parse_file(filepath: str | Path) -> str:
    """Автовыбор парсера по содержимому файла."""
    path = Path(filepath)
    raw = path.read_bytes()
    if _looks_like_mhtml(raw):
        return parse_mhtml(path)
    # бинарный Word 97 (общие_условия.doc)
    return parse_word97(path)

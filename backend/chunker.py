"""Умный (семантический) чанкинг текста базы знаний.

Не режем слепо по символам — режем по смыслу: сначала по markdown-заголовкам
(html2text отдаёт markdown), затем по абзацам, затем накапливаем блоки до
целевого размера ~500 токенов с overlap ~50 токенов. См. ARCHITECTURE.md.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from config import CHUNK_OVERLAP_CHARS, CHUNK_TARGET_CHARS


@dataclass
class Chunk:
    content: str
    topic: str
    chunk_index: int

    @property
    def char_count(self) -> int:
        return len(self.content)


# markdown-заголовок: "# ...", "## ...", и т.п.
_HEADER_RE = re.compile(r"^#{1,6}\s+.*$", re.MULTILINE)


def _split_into_sections(text: str) -> list[str]:
    """Разбить текст на секции по markdown-заголовкам.

    Каждая секция начинается со своего заголовка (если он есть).
    """
    matches = list(_HEADER_RE.finditer(text))
    if not matches:
        return [text]

    sections: list[str] = []
    # текст до первого заголовка (преамбула)
    if matches[0].start() > 0:
        preamble = text[: matches[0].start()].strip()
        if preamble:
            sections.append(preamble)

    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        section = text[m.start():end].strip()
        if section:
            sections.append(section)
    return sections


def _split_paragraphs(text: str) -> list[str]:
    """Разбить секцию на абзацы (по пустым строкам)."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", text)]
    return [p for p in paras if p]


def _hard_split(block: str, target: int) -> list[str]:
    """Жёсткое разбиение слишком длинного блока по строкам/предложениям."""
    if len(block) <= target:
        return [block]

    pieces: list[str] = []
    buf = ""
    # сначала пробуем по строкам, чтобы не рвать таблицы/списки посреди строки
    for line in block.splitlines(keepends=True):
        if len(buf) + len(line) > target and buf:
            pieces.append(buf.strip())
            buf = ""
        # отдельная строка длиннее target — режем по предложениям
        if len(line) > target:
            for sent in re.split(r"(?<=[.!?])\s+", line):
                if len(buf) + len(sent) > target and buf:
                    pieces.append(buf.strip())
                    buf = ""
                buf += sent + " "
        else:
            buf += line
    if buf.strip():
        pieces.append(buf.strip())
    return pieces


def chunk_text(text: str, topic: str) -> list[Chunk]:
    """Разбить очищенный текст файла на семантические чанки.

    topic — базовая тема (обычно имя файла без расширения), уходит в метаданные.
    """
    blocks: list[str] = []
    for section in _split_into_sections(text):
        if len(section) <= CHUNK_TARGET_CHARS:
            blocks.append(section)
            continue
        # большая секция → дробим на абзацы, длинные абзацы — жёстко
        for para in _split_paragraphs(section):
            blocks.extend(_hard_split(para, CHUNK_TARGET_CHARS))

    # накапливаем блоки до целевого размера
    raw_chunks: list[str] = []
    buf = ""
    for block in blocks:
        if buf and len(buf) + len(block) + 2 > CHUNK_TARGET_CHARS:
            raw_chunks.append(buf.strip())
            # overlap: хвост предыдущего чанка
            buf = buf[-CHUNK_OVERLAP_CHARS:] if CHUNK_OVERLAP_CHARS else ""
        buf = f"{buf}\n\n{block}".strip()
    if buf.strip():
        raw_chunks.append(buf.strip())

    return [
        Chunk(content=c, topic=topic, chunk_index=i)
        for i, c in enumerate(raw_chunks)
        if c.strip()
    ]

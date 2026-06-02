"""
Поиск релевантных фрагментов базы знаний BCC (keyword retrieval).

Проблема старого подхода: каждый .doc считался одним «разделом», поэтому
большие файлы (вопросы-ответы, общие условия, Рефинансирование) с огромным
словарём матчили почти любой вопрос и вытесняли маленькие точечные файлы
(тарифы.doc, кэшбэк.doc). Операторы получали неверные источники.

Решение: режем каждый файл на чанки ~1800 символов, ищем лучшие чанки по
ВСЕЙ базе (а не по файлам), с отсевом стоп-слов и частотным скорингом.
Так маленький точный файл побеждает большой нерелевантный.
"""
from __future__ import annotations

import re
from collections import Counter

# ── Стоп-слова (RU + немного KZ) ─────────────────────────────────────────────
_STOPWORDS: set[str] = {
    # русские предлоги/союзы/частицы/местоимения
    "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то",
    "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за",
    "бы", "по", "только", "ее", "мне", "было", "вот", "от", "меня", "еще",
    "нет", "о", "из", "ему", "теперь", "когда", "даже", "ну", "вдруг", "ли",
    "если", "уже", "или", "ни", "быть", "был", "него", "до", "вас", "нибудь",
    "опять", "уж", "вам", "ведь", "там", "потом", "себя", "ничего", "ей",
    "может", "они", "тут", "где", "есть", "надо", "ней", "для", "мы", "тебя",
    "их", "чем", "была", "сам", "чтоб", "без", "будто", "чего", "раз", "тоже",
    "себе", "под", "будет", "ж", "тогда", "кто", "этот", "того", "потому",
    "этого", "какой", "совсем", "ним", "здесь", "этом", "один", "почти", "мой",
    "тем", "чтобы", "нее", "сейчас", "были", "куда", "зачем", "всех", "никогда",
    "можно", "при", "наконец", "два", "об", "другой", "хоть", "после", "над",
    "больше", "тот", "через", "эти", "нас", "про", "всего", "них", "какая",
    "много", "разве", "три", "эту", "моя", "впрочем", "хорошо", "свою", "этой",
    "перед", "иногда", "лучше", "чуть", "том", "нельзя", "такой", "им", "более",
    "всю", "между", "это", "клиент", "клиента", "клиенту", "вопрос", "ответ",
    "какие", "какой", "сколько", "можно", "нужно", "это",
    # казахские частые служебные
    "мен", "бен", "пен", "және", "не", "ме", "ба", "бе", "па", "пе", "ге",
}


def _tokenize(text: str) -> list[str]:
    """Слова длиной ≥3, без стоп-слов, в нижнем регистре."""
    words = re.findall(r"[а-яёa-z0-9#]+", text.lower())
    return [w for w in words if len(w) >= 3 and w not in _STOPWORDS]


# ── Чанкинг ──────────────────────────────────────────────────────────────────

def _split_file(text: str, target: int = 1800) -> list[str]:
    """Разбить текст файла на чанки ~target символов по абзацам."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paras:
        if buf and len(buf) + len(p) + 2 > target:
            chunks.append(buf.strip())
            buf = ""
        # абзац сам по себе длиннее target — режем по строкам
        if len(p) > target:
            if buf:
                chunks.append(buf.strip())
                buf = ""
            for line in p.splitlines():
                if buf and len(buf) + len(line) + 1 > target:
                    chunks.append(buf.strip())
                    buf = ""
                buf += line + "\n"
        else:
            buf = f"{buf}\n\n{p}".strip()
    if buf.strip():
        chunks.append(buf.strip())
    return chunks


class Chunk:
    __slots__ = ("source", "text", "tokens")

    def __init__(self, source: str, text: str) -> None:
        self.source = source
        self.text = text
        self.tokens = Counter(_tokenize(text))


_INDEX: list[Chunk] | None = None


def build_index(full_context: str) -> list[Chunk]:
    """Построить индекс чанков из полной базы (=== filename === разделители)."""
    parts = re.split(r"(=== .+? ===)", full_context)
    chunks: list[Chunk] = []
    i = 1
    while i < len(parts):
        header = parts[i].strip()
        source = header.strip("= ").strip()
        content = parts[i + 1] if i + 1 < len(parts) else ""
        for piece in _split_file(content.strip()):
            chunks.append(Chunk(source, piece))
        i += 2
    return chunks


def get_index(full_context: str) -> list[Chunk]:
    global _INDEX
    if _INDEX is None:
        _INDEX = build_index(full_context)
    return _INDEX


# ── Поиск ────────────────────────────────────────────────────────────────────

def find_relevant(
    question: str,
    full_context: str,
    top_k: int = 8,
    max_total_chars: int = 24000,
) -> str:
    """Вернуть топ-K релевантных чанков по всей базе, сгруппированных по файлам."""
    index = get_index(full_context)
    q_tokens = set(_tokenize(question))
    if not q_tokens:
        # вопрос из одних стоп-слов — отдать начало базы
        return full_context[:max_total_chars]

    scored: list[tuple[float, Chunk]] = []
    for ch in index:
        # сколько РАЗНЫХ слов запроса встретилось (точность) + лёгкий бонус за частоту
        distinct = sum(1 for t in q_tokens if t in ch.tokens)
        if distinct == 0:
            continue
        freq = sum(ch.tokens[t] for t in q_tokens)
        score = distinct * 10 + freq  # distinct важнее частоты
        scored.append((score, ch))

    if not scored:
        return full_context[:max_total_chars]

    scored.sort(key=lambda x: x[0], reverse=True)

    # собираем чанки в рамках бюджета, группируя по исходному файлу
    selected: list[Chunk] = []
    total = 0
    for _, ch in scored[:top_k]:
        if total + len(ch.text) > max_total_chars:
            continue
        selected.append(ch)
        total += len(ch.text)
        if total >= max_total_chars:
            break

    # группировка по файлу для читаемости промпта
    by_file: dict[str, list[str]] = {}
    for ch in selected:
        by_file.setdefault(ch.source, []).append(ch.text)

    blocks = [f"=== {src} ===\n" + "\n\n".join(texts) for src, texts in by_file.items()]
    return "\n\n".join(blocks)


def relevant_sources(question: str, full_context: str, top_k: int = 8) -> list[str]:
    """Список файлов-источников для топ-чанков (для UI)."""
    index = get_index(full_context)
    q_tokens = set(_tokenize(question))
    if not q_tokens:
        return []
    scored: list[tuple[float, Chunk]] = []
    for ch in index:
        distinct = sum(1 for t in q_tokens if t in ch.tokens)
        if distinct:
            scored.append((distinct * 10 + sum(ch.tokens[t] for t in q_tokens), ch))
    scored.sort(key=lambda x: x[0], reverse=True)
    seen: list[str] = []
    for _, ch in scored[:top_k]:
        if ch.source not in seen:
            seen.append(ch.source)
    return seen

"""
Поиск релевантных фрагментов базы знаний BCC — ГИБРИДНЫЙ (семантика + ключевые слова).

Почему гибрид:
  • Семантические эмбеддинги (text-embedding-3-small) понимают СМЫСЛ вопроса:
    «сколько стоит обслуживание карты» находит «выпуск 0 ₸, обслуживание 0 ₸»,
    даже если слова не совпадают. Keyword-поиск это пропускал.
  • Но эмбеддинги хуже ловят ТОЧНЫЕ термины: «#картакарта», MCC-коды, названия
    продуктов («Birge+», «AQYL»). Поэтому к косинусной близости добавляется
    небольшой бонус за точное совпадение редких слов запроса.

Эмбеддинги чанков считаются один раз и кэшируются на диск (.embcache/),
ключ кэша = хэш(модель + полный контекст). При неизменной базе повторного
вызова API при старте сервера нет. Если ключа OPENAI_API_KEY нет или API
недоступен — мягкий откат на чистый keyword-поиск.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from collections import Counter
from functools import lru_cache
from pathlib import Path

import numpy as np
from openai import OpenAI

_CACHE_DIR = Path(__file__).parent / ".embcache"


def _embed_model() -> str:
    # читаем лениво: переменные окружения грузятся (load_dotenv) после импорта модуля
    return os.getenv("EMBED_MODEL", "text-embedding-3-small")


def _api_key() -> str:
    return os.getenv("OPENAI_API_KEY", "")

# ── Стоп-слова (RU + немного KZ) ─────────────────────────────────────────────
_STOPWORDS: set[str] = {
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
    "какие", "сколько", "нужно",
    "мен", "бен", "пен", "және", "ме", "ба", "бе", "па", "пе", "ге",
}


def _tokenize(text: str) -> list[str]:
    words = re.findall(r"[а-яёa-z0-9#]+", text.lower())
    return [w for w in words if len(w) >= 3 and w not in _STOPWORDS]


# ── Чанкинг ──────────────────────────────────────────────────────────────────

def _split_file(text: str, target: int = 2000) -> list[str]:
    """Разбить текст файла на чанки ~target символов по абзацам.

    Абзацы (включая целые markdown-таблицы — у них нет пустых строк внутри)
    не разрываются, пока помещаются в бюджет.
    """
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paras:
        if buf and len(buf) + len(p) + 2 > target:
            chunks.append(buf.strip())
            buf = ""
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


# ── Индекс (чанки + эмбеддинги) ───────────────────────────────────────────────

_CHUNKS: list[Chunk] | None = None
_EMB: np.ndarray | None = None          # (N, D), L2-нормированные; None → keyword-only


def build_chunks(full_context: str) -> list[Chunk]:
    """Разрезать полную базу (=== filename === разделители) на чанки."""
    parts = re.split(r"(=== .+? ===)", full_context)
    chunks: list[Chunk] = []
    i = 1
    while i < len(parts):
        source = parts[i].strip("= ").strip()
        content = parts[i + 1] if i + 1 < len(parts) else ""
        for piece in _split_file(content.strip()):
            chunks.append(Chunk(source, piece))
        i += 2
    return chunks


def _embed_texts(texts: list[str]) -> np.ndarray:
    """Получить эмбеддинги через OpenAI батчами. Возвращает (len(texts), D)."""
    client = OpenAI(api_key=_api_key())
    model = _embed_model()
    vecs: list[list[float]] = []
    BATCH = 100
    for start in range(0, len(texts), BATCH):
        batch = texts[start:start + BATCH]
        resp = client.embeddings.create(model=model, input=batch)
        vecs.extend(d.embedding for d in resp.data)
    arr = np.asarray(vecs, dtype=np.float32)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return arr / norms


def _cache_key(full_context: str) -> str:
    h = hashlib.sha256((_embed_model() + "\n" + full_context).encode("utf-8"))
    return h.hexdigest()[:16]


def _load_cache(key: str) -> np.ndarray | None:
    f = _CACHE_DIR / f"{key}.npy"
    if f.exists():
        try:
            return np.load(f)
        except Exception:  # noqa: BLE001
            return None
    return None


def _save_cache(key: str, emb: np.ndarray) -> None:
    try:
        _CACHE_DIR.mkdir(exist_ok=True)
        np.save(_CACHE_DIR / f"{key}.npy", emb)
    except Exception:  # noqa: BLE001
        pass


def warmup(full_context: str) -> None:
    """Построить индекс чанков и эмбеддинги (с диск-кэшем). Вызывать при старте."""
    global _CHUNKS, _EMB
    if _CHUNKS is not None:
        return
    _CHUNKS = build_chunks(full_context)
    print(f"Retrieval: {len(_CHUNKS)} чанков.")

    if not _api_key():
        print("Retrieval: OPENAI_API_KEY не задан → keyword-only режим.")
        _EMB = None
        return

    key = _cache_key(full_context)
    emb = _load_cache(key)
    if emb is not None and emb.shape[0] == len(_CHUNKS):
        print(f"Retrieval: эмбеддинги из кэша ({emb.shape}).")
        _EMB = emb
        return

    try:
        print(f"Retrieval: считаю эмбеддинги {len(_CHUNKS)} чанков ({_embed_model()})…")
        _EMB = _embed_texts([c.text for c in _CHUNKS])
        _save_cache(key, _EMB)
        print(f"Retrieval: эмбеддинги готовы и закэшированы ({_EMB.shape}).")
    except Exception as exc:  # noqa: BLE001
        print(f"Retrieval: ошибка эмбеддингов ({exc}) → keyword-only режим.")
        _EMB = None


def _ensure(full_context: str) -> list[Chunk]:
    if _CHUNKS is None:
        warmup(full_context)
    return _CHUNKS or []


@lru_cache(maxsize=256)
def _embed_query(question: str) -> tuple[float, ...]:
    """Эмбеддинг запроса (кэш в памяти, чтобы не дёргать API дважды за запрос)."""
    arr = _embed_texts([question])[0]
    return tuple(float(x) for x in arr)


def _keyword_scores(q_tokens: set[str], chunks: list[Chunk]) -> np.ndarray:
    """Доля совпавших РАЗНЫХ слов запроса в чанке (0..1)."""
    n = len(chunks)
    scores = np.zeros(n, dtype=np.float32)
    if not q_tokens:
        return scores
    qn = len(q_tokens)
    for i, ch in enumerate(chunks):
        distinct = sum(1 for t in q_tokens if t in ch.tokens)
        scores[i] = distinct / qn
    return scores


def _rank(question: str, full_context: str) -> list[tuple[float, Chunk]]:
    chunks = _ensure(full_context)
    if not chunks:
        return []
    q_tokens = set(_tokenize(question))
    kw = _keyword_scores(q_tokens, chunks)

    if _EMB is not None:
        q = np.asarray(_embed_query(question), dtype=np.float32)
        qn = np.linalg.norm(q) or 1.0
        cos = _EMB @ (q / qn)          # (N,) косинусная близость, т.к. _EMB нормирован
        # семантика — основа, ключевые слова — бонус за точные термины
        final = cos + 0.12 * kw
    else:
        final = kw

    order = np.argsort(-final)
    return [(float(final[i]), chunks[i]) for i in order]


# ── Публичный API ─────────────────────────────────────────────────────────────

def retrieve(
    question: str,
    full_context: str,
    top_k: int = 14,
    max_total_chars: int = 24000,
) -> tuple[str, list[str]]:
    """Вернуть (текст релевантных чанков, список файлов-источников)."""
    ranked = _rank(question, full_context)
    if not ranked:
        return full_context[:max_total_chars], []

    selected: list[Chunk] = []
    total = 0
    for _, ch in ranked[:top_k]:
        if total + len(ch.text) > max_total_chars and selected:
            continue
        selected.append(ch)
        total += len(ch.text)
        if total >= max_total_chars:
            break

    by_file: dict[str, list[str]] = {}
    sources: list[str] = []
    for ch in selected:
        by_file.setdefault(ch.source, []).append(ch.text)
        if ch.source not in sources:
            sources.append(ch.source)

    blocks = [f"=== {src} ===\n" + "\n\n".join(texts) for src, texts in by_file.items()]
    return "\n\n".join(blocks), sources


# Обратная совместимость со старым API main.py
def find_relevant(question: str, full_context: str, top_k: int = 14,
                  max_total_chars: int = 24000) -> str:
    return retrieve(question, full_context, top_k, max_total_chars)[0]


def relevant_sources(question: str, full_context: str, top_k: int = 14) -> list[str]:
    ranked = _rank(question, full_context)
    sources: list[str] = []
    for _, ch in ranked[:top_k]:
        if ch.source not in sources:
            sources.append(ch.source)
    return sources

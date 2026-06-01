"""Индексация базы знаний BCC в ChromaDB.

Запускается ОДИН РАЗ перед стартом сервера (и при сборке Docker-образа):

    python embeddings.py

Шаги: парсинг 16 .doc → семантический чанкинг → text-embedding-004 → ChromaDB.
См. ARCHITECTURE.md (Этап 1: Индексация).
"""
from __future__ import annotations

import sys
from pathlib import Path

import chromadb
from google import genai
from google.genai import types

from chunker import chunk_text
from config import (
    CHROMA_COLLECTION,
    CHROMA_PATH,
    EMBEDDING_MODEL,
    GEMINI_API_KEY,
    KNOWLEDGE_DIR,
)
from parsers import parse_file

_EMBED_BATCH = 5  # gemini-embedding-001 free tier: небольшие батчи с паузами


def _get_client() -> genai.Client:
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY не задан. Создайте backend/.env (см. ENV.md)."
        )
    return genai.Client(api_key=GEMINI_API_KEY)


def embed_texts(texts: list[str], task_type: str) -> list[list[float]]:
    """Векторизовать список текстов через gemini-embedding-001.

    Небольшие батчи + retry с экспоненциальным backoff для free tier.
    """
    import time

    client = _get_client()
    vectors: list[list[float]] = []
    total = len(texts)
    for i in range(0, total, _EMBED_BATCH):
        batch = texts[i : i + _EMBED_BATCH]
        batch_num = i // _EMBED_BATCH + 1
        total_batches = (total + _EMBED_BATCH - 1) // _EMBED_BATCH
        print(f"    батч {batch_num}/{total_batches} ({len(batch)} текстов)…", end=" ", flush=True)
        for attempt in range(5):
            try:
                resp = client.models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=batch,
                    config=types.EmbedContentConfig(task_type=task_type),
                )
                for emb in resp.embeddings:
                    vectors.append(emb.values)
                print("OK")
                break
            except Exception as exc:
                wait = 2 ** attempt * 5  # 5, 10, 20, 40, 80 сек
                print(f"retry {attempt + 1} ({exc}) — жду {wait}с…", end=" ", flush=True)
                time.sleep(wait)
        else:
            raise RuntimeError(f"Не удалось векторизовать батч {batch_num} после 5 попыток")
        # пауза между батчами чтобы не превышать RPM
        if i + _EMBED_BATCH < total:
            time.sleep(2)
    return vectors


def embed_query(text: str) -> list[float]:
    """Векторизовать один вопрос для поиска."""
    return embed_texts([text], task_type="RETRIEVAL_QUERY")[0]


def get_chroma_client() -> chromadb.ClientAPI:
    return chromadb.PersistentClient(path=CHROMA_PATH)


def get_collection(create: bool = False):
    """Получить (или создать) коллекцию ChromaDB."""
    client = get_chroma_client()
    if create:
        return client.get_or_create_collection(
            name=CHROMA_COLLECTION, metadata={"hnsw:space": "cosine"}
        )
    return client.get_collection(name=CHROMA_COLLECTION)


def _collect_chunks() -> list[dict]:
    """Распарсить и нарезать все .doc файлы из knowledge/ (включая подпапки)."""
    files = sorted(KNOWLEDGE_DIR.rglob("*.doc"))
    if not files:
        raise RuntimeError(
            f"В {KNOWLEDGE_DIR} нет .doc файлов. Положите 16 файлов базы знаний "
            "(см. KNOWLEDGE_BASE.md) и запустите снова."
        )

    records: list[dict] = []
    for path in files:
        topic = path.stem
        print(f"  • {path.name} …", end=" ", flush=True)
        try:
            text = parse_file(path)
        except Exception as exc:  # noqa: BLE001
            print(f"ОШИБКА парсинга: {exc}")
            continue

        chunks = chunk_text(text, topic=topic)
        for ch in chunks:
            records.append(
                {
                    "id": f"{topic}_chunk_{ch.chunk_index}",
                    "document": ch.content,
                    "metadata": {
                        "source_file": path.name,
                        "topic": ch.topic,
                        "chunk_index": ch.chunk_index,
                        "char_count": ch.char_count,
                    },
                }
            )
        print(f"{len(chunks)} чанков")
    return records


def index() -> int:
    """Полная переиндексация базы знаний. Возвращает число чанков."""
    print(f"Парсинг и чанкинг из {KNOWLEDGE_DIR} …")
    records = _collect_chunks()
    print(f"Всего чанков: {len(records)}")

    # пересоздаём коллекцию с нуля
    client = get_chroma_client()
    try:
        client.delete_collection(CHROMA_COLLECTION)
    except Exception:  # noqa: BLE001
        pass
    collection = client.get_or_create_collection(
        name=CHROMA_COLLECTION, metadata={"hnsw:space": "cosine"}
    )

    print("Векторизация через text-embedding-004 …")
    documents = [r["document"] for r in records]
    embeddings = embed_texts(documents, task_type="RETRIEVAL_DOCUMENT")

    collection.add(
        ids=[r["id"] for r in records],
        documents=documents,
        embeddings=embeddings,
        metadatas=[r["metadata"] for r in records],
    )

    count = collection.count()
    print(f"[OK] Готово. В коллекции '{CHROMA_COLLECTION}': {count} чанков -> {CHROMA_PATH}")
    return count


if __name__ == "__main__":
    try:
        index()
    except Exception as exc:  # noqa: BLE001
        print(f"\n❌ {exc}", file=sys.stderr)
        sys.exit(1)

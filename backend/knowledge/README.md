# knowledge/ — база знаний BCC

Сюда положите **16 .doc файлов** базы знаний (см. список и анализ в `files/KNOWLEDGE_BASE.md`).

15 из них — MHTML-экспорт из Confluence, 1 (`общие_условия.doc`) — бинарный Word 97.
Парсер определяет формат автоматически (`parsers.py`).

После добавления файлов запустите индексацию:

```bash
cd backend
python embeddings.py
```

Ожидаемый результат: ~100–120 чанков в ChromaDB (`backend/chroma_db/`).

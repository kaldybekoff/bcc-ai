"""Конфигурация BCC Assistant backend.

Все настройки читаются из переменных окружения (.env). См. ENV.md.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# --- Пути ---
BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_DIR = BASE_DIR / "knowledge"

# --- Gemini ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
EMBEDDING_MODEL = "gemini-embedding-001"
GENERATION_MODEL = "gemini-2.5-flash"

# --- ChromaDB ---
CHROMA_PATH = os.getenv("CHROMA_PATH", str(BASE_DIR / "chroma_db"))
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "bcc_knowledge")

# --- RAG ---
N_RESULTS = 5            # топ-N чанков из ChromaDB
DISTANCE_THRESHOLD = 1.5  # игнорировать чанки с дистанцией больше порога

# --- Чанкинг ---
# ~500 токенов ≈ 2000 символов для русского текста; overlap ~50 токенов ≈ 200 символов
CHUNK_TARGET_CHARS = 1800
CHUNK_OVERLAP_CHARS = 200

# --- Окружение / CORS ---
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

# --- Параметры генерации Gemini (см. PROMPTS.md) ---
GENERATION_CONFIG = {
    "temperature": 0.1,
    "top_p": 0.8,
    "top_k": 40,
    "max_output_tokens": 1024,
}

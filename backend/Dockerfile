FROM python:3.11-slim

WORKDIR /app

# LibreOffice для парсинга общие_условия.doc (Word 97)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Контекст загружается при старте сервера — индексация не нужна
ENV PORT=8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]

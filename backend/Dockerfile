FROM python:3.11-slim

WORKDIR /app

# Asennetaan riippuvuudet
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopioidaan koodi
COPY . .

# Luodaan upload-kansio valmiiksi
RUN mkdir -p uploads

# Käynnistetään FastAPI (4 workeria, koska sinulla on 4 vCorea!)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

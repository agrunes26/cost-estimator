FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY *.py ./
COPY templates/ ./templates/
COPY static/ ./static/
RUN mkdir -p /app/data
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s CMD curl -f http://localhost:8080/ || exit 1
CMD ["python", "app.py"]

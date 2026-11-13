# OmniSeam 3D - Backend Dockerfile (Hugging Face Spaces & Docker compatible)
# Debian codename pinned so apt packages (FreeCAD 0.20.x) stay stable across rebuilds.
FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=7860

WORKDIR /app

# Install system dependencies (FreeCAD, OpenCASCADE dependencies, libgl1, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libgl1 \
    libglx-mesa0 \
    libglib2.0-0 \
    libgomp1 \
    freecad \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt constraints.txt /app/backend/
RUN pip install --no-cache-dir --upgrade "pip==25.3" && \
    pip install --no-cache-dir -r /app/backend/requirements.txt -c /app/backend/constraints.txt

# Copy application source
COPY backend /app/backend

ENV PYTHONPATH=/app

EXPOSE 7860 8000

CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]

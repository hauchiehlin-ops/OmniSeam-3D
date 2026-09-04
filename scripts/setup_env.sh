#!/bin/bash
set -e

echo "=== PolyHeal 3D Environment Setup ==="

# 1. Setup Python Virtual Environment
echo "Setting up Python virtual environment..."
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# 2. Setup Frontend Dependencies
echo "Setting up Frontend NPM dependencies..."
cd frontend
npm install
cd ..

echo "=== Environment Setup Complete! ==="
echo "To start backend:  source .venv/bin/activate && uvicorn backend.app.main:app --reload --port 8000"
echo "To start frontend: cd frontend && npm run dev"

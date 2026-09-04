#!/bin/bash
set -e

echo "=== Running PolyHeal 3D Automated Test Suite ==="

# Backend tests
echo "[1/2] Running Backend Pytest Geometry & API suite..."
source .venv/bin/activate
PYTHONPATH=. pytest backend/tests -v

# Frontend test / build verification
echo "[2/2] Running Frontend TypeScript Typecheck & Build..."
cd frontend
npm run build
cd ..

echo "=== All Tests & Builds Passed Successfully! ==="

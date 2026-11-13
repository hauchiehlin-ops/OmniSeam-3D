# Hugging Face Space (Docker SDK) that only pulls the prebuilt engine image.
# Build/version pinning happens in .github/workflows/engine-image.yml.
# To update a duplicated Space: Settings → "Factory rebuild".
FROM ghcr.io/hauchiehlin-ops/omniseam-engine:latest

ENV PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]

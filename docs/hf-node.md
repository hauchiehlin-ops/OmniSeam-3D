# Free Hugging Face processing nodes

All cloud processing runs on Hugging Face **free CPU Basic** Spaces (2 vCPU · 16 GB RAM).

## Nodes
| Node | URL | Purpose |
|---|---|---|
| Public demo node | https://hauchieh-omniseam-engine.hf.space | Shared, 25 MB limit (`IS_PUBLIC_DEMO_NODE=true`) |
| App Review node | your own duplicate | Only for Apple review; URL goes into Review Notes |
| User nodes | `https://<user>-<space>.hf.space` | Created by users via "Duplicate this Space" |

The public node URL, duplicate link and minimum node version are served by
`frontend/public/config.json` (deployed with the web app). The iOS app reads
`https://omniseam-3d.vercel.app/config.json`, so they can change without an app update.

## Hardening (backend/app/hardening.py)
| Env var | Default | Meaning |
|---|---|---|
| `FILE_TTL_MINUTES` | 60 | Uploads/results older than this are deleted (sweeper every `CLEANUP_INTERVAL_SECONDS`) |
| `TASK_TIMEOUT_SECONDS` | 300 | Tasks running longer are reported as failed |
| `RATE_LIMIT_PER_MINUTE` | 20 | Per-IP limit on upload endpoints (0 = off) |
| `EXTRA_ALLOWED_ORIGINS` | – | Extra CORS origins, comma-separated |
| `CORS_ORIGIN_REGEX` | Vercel previews | Regex of allowed origins |

CORS always allows `https://omniseam-3d.vercel.app` (web) and `capacitor://localhost` (iOS app).

## Deploying to the Space
Automatic: `.github/workflows/deploy-hf.yml` runs on every push to `main` that touches the backend
(i.e. after a PR is merged). It runs the backend tests, pushes only the Space files
(`app.py`, `backend/`, `requirements.txt`, `constraints.txt`, `packages.txt`, `README.md`), sets
`IS_PUBLIC_DEMO_NODE=true` on the Space, then waits until `/api/v1/health` reports the new version.
It can also be started by hand: GitHub → Actions → "Deploy engine to Hugging Face Space" → Run workflow.

One-time setup: repository secret `HF_TOKEN` (Hugging Face token with **Write** permission);
optional variable `HF_SPACE` (default `hauchieh/omniseam-engine`).

Manual fallback: `./scripts/deploy_to_hf.sh hauchieh/omniseam-engine` (pushes the whole repo; may be
rejected if Hugging Face requires LFS for the PNG files).

## STEP/IGES readers
The converter tries, in order: FreeCAD (`freecadcmd`, apt package) → pythonocc → trimesh + `cascadio`
(pinned in `requirements.txt`, ships its own OpenCASCADE). `/api/v1/health` lists what is installed
in `engine_features.step_readers`. `backend/tests/test_step_conversion.py` converts the App Review
test plate end-to-end with cascadio only.

## Keeping nodes awake
`.github/workflows/keep-alive.yml` pings the public node every 6 hours (free Spaces sleep after ~48 h idle).
Set repository variable `REVIEW_NODE_URL` to also ping the review node.

## Reproducible builds
- `requirements.txt` pins direct dependencies; `constraints.txt` locks the full tree for linux x86_64.
- Both must install on **Python 3.10** (ZeroGPU Spaces are fixed to 3.10 and ignore `python_version`) and **3.11** (CPU Spaces, Docker). CI tests both.
- Docker images use `python:3.11-slim-bookworm` and install with `-c constraints.txt`.
- Regenerate the lock after changing `requirements.txt`:
  ```bash
  pip install --dry-run --ignore-installed --python-version 3.10 --platform manylinux2014_x86_64 \
    --platform manylinux_2_28_x86_64 --platform any --implementation cp --only-binary=:all: \
    --target /tmp/x --report /tmp/report.json -r requirements.txt
  ```
  then rewrite `constraints.txt` from `report.json`, run `PYTHONPATH=. pytest backend/tests`, and bump the version.

## Prebuilt image (optional, recommended)
`.github/workflows/engine-image.yml` builds `ghcr.io/<owner>/omniseam-engine:<version>` on every `v*` tag.
To switch the public Space to it:
1. Make the GHCR package public (GitHub → Packages → omniseam-engine → Settings).
2. Push `deploy/hf-space/Dockerfile` and `deploy/hf-space/README.md` as the Space's root `Dockerfile` / `README.md` (Docker SDK).
3. Users then duplicate a Space that only pulls the image, so it starts in minutes and does not break when upstream packages change.
4. Users update with **Settings → Factory rebuild**; the app warns when a node is older than `minNodeVersion`.

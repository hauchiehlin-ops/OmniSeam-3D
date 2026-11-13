# App Review Information

## Sign-in
No sign-in required. (Leave "Sign-in required" unchecked.)

## Notes (paste into App Store Connect → App Review Information → Notes)

```
OmniSeam 3D does not require an account.

Core features run entirely on the device and work offline:
1. Scroll to "No model at hand? Try a sample" and tap "Box with holes (STL)".
   Holes are highlighted in red in the 3D view.
2. Tap "Start conversion & auto-repair". A health report opens.
   Tap the download icon to save the report or result via the Share sheet ("Save to Files").
3. Load "L-bracket (OBJ)" and tap the 📱 AR button in the toolbar → "Project in AR"
   to open native AR Quick Look (requires a real device with ARKit).
Files can also be opened from the Files app via Share → OmniSeam 3D.

Optional cloud processing (only for parametric STEP/IGES and native CAD/BIM formats):
- The app uses the OmniSeam public demo node by default; no setup is needed:
  https://hauchieh-omniseam-engine.hf.space  (health: /api/v1/health)
- Before any upload, the app shows a consent dialog; choosing Cancel uploads nothing.
- Test file (parametric STEP plate with fillets and holes, 39 KB):
  https://raw.githubusercontent.com/hauchiehlin-ops/OmniSeam-3D/main/docs/app-store/test-files/review_test_plate.step
  Open the link in Safari → Share → Save to Files, then in OmniSeam 3D tap the
  upload area and pick the file (or share it from Files to OmniSeam 3D).
  Tap "Start conversion & auto-repair" → "Upload and process".
  The node runs on free hardware; if it reports that it is starting up,
  please wait 1–3 minutes and try again.

The "Create your own free node" guide links to Hugging Face's free CPU Basic
hardware only. The app contains no paid content, purchases or subscriptions.
```

## Before you submit
Review node: **option A** — the public demo node `hauchieh-omniseam-engine` doubles as the review node.
GitHub variable `REVIEW_NODE_URL` = `https://hauchieh-omniseam-engine.hf.space` (set 2026-11-14).

- [x] Set GitHub repository variable `REVIEW_NODE_URL`.
- [x] Fill in the review node URL and test file link above.
- [ ] Merge the PR into `main` (the test-file link and the keep-alive workflow only work from `main`).
- [ ] Deploy the backend to the Space and set `IS_PUBLIC_DEMO_NODE=true` (see `docs/hf-node.md`).
- [ ] Confirm `/api/v1/health` shows `"version":"4.3.0"` or later and a non-empty `"step_readers"` list
      (on 2026-11-14 the node reported v1.0.24, which the app flags as outdated).
      `cascadio` alone is enough for STEP/IGES; FreeCAD is only needed for native CAD such as SolidWorks.
- [ ] Open the test file link in a browser and convert it once yourself through the app.
- [ ] During review, temporarily change `.github/workflows/keep-alive.yml` cron to every 2 hours (`17 */2 * * *`).
- [ ] Contact info: name, phone, email of the person Apple can reach.

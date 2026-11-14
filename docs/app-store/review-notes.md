# App Review Information

## Sign-in
No sign-in required. (Leave "Sign-in required" unchecked.)

## Notes (paste into App Store Connect → App Review Information → Notes)

```
OmniSeam 3D does not require an account.

PLANS AND IN-APP PURCHASES
- Basic is free: open/inspect mesh models, defect heatmap, measure, section,
  AR, and convert mesh formats without repair.
- Pro is a one-time Non-Consumable purchase (…omniseam3d.pro).
- A free 7-day Pro trial is offered as a price-tier-0 Non-Consumable named
  "7-Day Pro Trial" (…omniseam3d.trial7d), per Guideline 3.1.1. It does not
  renew or charge; the app returns to Basic afterwards.
- The plan screen opens on first launch and from the crown button at the
  top right. It shows the price, trial terms, Restore Purchases, the EULA and
  the privacy policy. Locked controls carry a "PRO" label and open the same screen.
- To review Pro features, tap "Start 7-day free trial" (sandbox account).

Core features run entirely on the device and work offline:
1. Scroll to "No model at hand? Try a sample" and tap "Box with holes (STL)".
   Holes are highlighted in red in the 3D view.
2. Tap "Start conversion & auto-repair". On Basic the plan screen appears;
   choose "Convert without repair (Basic)" or start the trial. A health report opens.
   With Pro/trial, tap the download icon to save the report via the Share sheet ("Save to Files").
3. Load "L-bracket (OBJ)" and tap the 📱 AR button in the toolbar → "Project in AR"
   to open native AR Quick Look (requires a real device with ARKit).
Files can also be opened from the Files app via Share → OmniSeam 3D.

Optional cloud processing (Pro; only for parametric STEP/IGES and native CAD/BIM formats):
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
hardware only. All paid features are sold only through In-App Purchase;
the app has no subscriptions and no links to external payment.
```

## Before you submit
Review node: **option A** — the public demo node `hauchieh-omniseam-engine` doubles as the review node.
GitHub variable `REVIEW_NODE_URL` = `https://hauchieh-omniseam-engine.hf.space` (set 2026-11-14).

- [x] Set GitHub repository variable `REVIEW_NODE_URL`.
- [x] Fill in the review node URL and test file link above.
- [ ] Merge the PR into `main` (the test-file link and the keep-alive workflow only work from `main`).
- [ ] Add repository secret `HF_TOKEN` (HF Write token); merging into `main` then deploys the Space and sets `IS_PUBLIC_DEMO_NODE=true` automatically (`deploy-hf.yml`, see `docs/hf-node.md`).
- [ ] Confirm `/api/v1/health` shows `"version":"4.3.0"` or later and a non-empty `"step_readers"` list
      (on 2026-11-14 the node reported v1.0.24, which the app flags as outdated).
      `cascadio` alone is enough for STEP/IGES; FreeCAD is only needed for native CAD such as SolidWorks.
- [ ] Open the test file link in a browser and convert it once yourself through the app.
- [ ] During review, temporarily change `.github/workflows/keep-alive.yml` cron to every 2 hours (`17 */2 * * *`).
- [ ] Contact info: name, phone, email of the person Apple can reach.
- [ ] Both IAPs (`.pro`, `.trial7d`) are created, have a review screenshot, and are attached to this app version (see `in-app-purchases.md`).

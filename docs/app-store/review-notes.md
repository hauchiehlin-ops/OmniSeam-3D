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
- Before any upload, the app shows a consent dialog; choosing Cancel uploads nothing.
- Review node: https://<YOUR-REVIEW-NODE>.hf.space
  Footer → "Engine Node" → paste the URL → "Test connection" → "Save and use this node".
- Test STEP file (parametric): <LINK TO A SMALL TEST STEP FILE>

The "Create your own free node" guide links to Hugging Face's free CPU Basic
hardware only. The app contains no paid content, purchases or subscriptions.
```

## Before you submit
- [ ] Create the review node: duplicate the public Space into your HF account, keep **CPU Basic · Free**, wait for **Running**.
- [ ] Set GitHub repository variable `REVIEW_NODE_URL` to it, and during review temporarily change `.github/workflows/keep-alive.yml` cron to every 2 hours (`17 */2 * * *`).
- [ ] The day before submitting, open `<review-node>/api/v1/health` and confirm `"status":"healthy"`.
- [ ] Replace the two placeholders above.
- [ ] Contact info: name, phone, email of the person Apple can reach.

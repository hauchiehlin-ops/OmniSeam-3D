# Building and uploading the iOS app

Requirements: macOS with Xcode 26+, an Apple Developer Program membership (US$99/year).

```bash
cd frontend
npm ci
npm run ios:sync        # vite build + copy into ios/App/App/public
npm run ios:open        # opens Xcode
```

In Xcode (target **App**):
1. Signing & Capabilities → select your Team; keep "Automatically manage signing".
2. General → Version = marketing version (e.g. 1.0.0), Build = increment for every upload.
3. If you change the bundle ID, also change `appId` in `frontend/capacitor.config.ts`.
4. Product → Archive → Distribute App → App Store Connect → Upload.
5. In App Store Connect: TestFlight internal testing → external testing (beta review) → submit for review.

Quick simulator build without signing:
```bash
npm run ios:build:sim
```

Notes
- The repository may sit on an exFAT drive, where macOS creates `._*` files. The Vite build and an Xcode build phase ("Strip AppleDouble Files") remove them from the bundle; `.gitignore` excludes them.
- Test AR Quick Look and "Open in OmniSeam 3D" on a real device; the simulator cannot show AR.

# App Privacy ("nutrition label") answers

App Store Connect → App Privacy → Data collection: **Yes, we collect data**.

| Data type | Collected? | Linked to user | Used for tracking | Purpose |
|---|---|---|---|---|
| User Content → **Other User Content** (3D model files the user chooses to upload in cloud mode) | Yes | **No** | **No** | App Functionality |
| Everything else (contact info, identifiers, usage data, diagnostics, location, …) | No | – | – | – |

Notes
- Files are only uploaded in optional cloud mode, after an in-app consent dialog, and are deleted by the node within 1 hour (`FILE_TTL_MINUTES=60`).
- No analytics, advertising, crash-reporting or tracking SDKs are included, so **no** App Tracking Transparency prompt is needed.
- Settings (language, node URL, consent choice) are stored only on the device.
- These answers match `frontend/ios/App/App/PrivacyInfo.xcprivacy` and the public policy at https://hauchiehlin-ops.github.io/OmniSeam-3D/privacy.html — keep all three in sync.

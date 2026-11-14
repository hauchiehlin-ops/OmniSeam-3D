# Building and uploading the iOS app

Full step-by-step guide (Apple Developer enrollment, App ID, App Store Connect fields,
TestFlight, review): **[ASC-上架手冊.md](ASC-上架手冊.md)**.

One command (after filling `.asc.env`, see `.asc.env.example`):

```bash
./scripts/apple-release.sh patch --push
```

Bumps the version, builds the web app, syncs Capacitor, archives with automatic signing,
uploads to App Store Connect, then commits/tags/pushes. `./scripts/apple-release.sh --help`
lists all options; `--check` validates the pipeline without an Apple account.

Manual alternative in Xcode: `cd frontend && npm run ios:sync && npm run ios:open`, select your
Team, Product → Archive → Distribute App → App Store Connect.

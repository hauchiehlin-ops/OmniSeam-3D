# 取消網頁版：公開頁面從 Vercel 搬到 GitHub Pages

OmniSeam 3D 不再提供網頁版。仍需要公開網址的只有 3 個檔案，放在 repo 的 `site/` 資料夾：

| 檔案 | 用途 |
|---|---|
| `privacy.html` | App Store Connect 必填的隱私權政策網址 |
| `support.html` | App Store Connect 必填的支援網址 |
| `config.json` | App 啟動時讀取的遠端設定（公用節點網址、公告）；App 也用這個請求的伺服器時間檢查試用期 |
| `index.html` | 簡單首頁（行銷網址，選填） |

新網址：`https://hauchiehlin-ops.github.io/OmniSeam-3D/`

## 為什麼要分階段

送審中、以及使用者手機上已安裝的 **4.5.0 版**，仍連到 `https://omniseam-3d.vercel.app` 的這些檔案。
如果直接關掉 Vercel：
- App Store Connect 的隱私權政策網址會變成 404，審核會被退件。
- 舊版 App 讀不到遠端設定與伺服器時間，會改用內建預設值與離線模式，還能用，但無法再遠端切換節點。

所以 Vercel 先保留，但**只發布 `site/` 的靜態檔案、不再發布網頁版 App**（見 `vercel.json`）。網址不變，舊版不受影響。

## 切換步驟

### 1. 開啟 GitHub Pages（一次性）
GitHub repo → **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
或在終端機執行：
```bash
gh api -X POST repos/hauchiehlin-ops/OmniSeam-3D/pages -f build_type=workflow
```

### 2. 合併這次的 PR
- `.github/workflows/pages.yml` 會把 `site/` 發布到 GitHub Pages。
- Vercel 會自動重新部署，改為只提供靜態頁面。
- 確認以下網址都能開啟：
  - https://hauchiehlin-ops.github.io/OmniSeam-3D/privacy.html
  - https://hauchiehlin-ops.github.io/OmniSeam-3D/support.html
  - https://hauchiehlin-ops.github.io/OmniSeam-3D/config.json
  - https://omniseam-3d.vercel.app/privacy.html（舊網址仍要能開）

### 3. 發布使用新網址的 App 版本（例如 4.5.1）
這個版本的程式已改用 GitHub Pages（`frontend/src/platform/links.ts`、`StorePlugin.swift`）。用 `scripts/apple-release.sh` 建置上傳。

### 4. 更新 App Store Connect 的網址
在 4.5.1 送審時一併修改：
- **App 隱私 → 隱私權政策網址**：`https://hauchiehlin-ops.github.io/OmniSeam-3D/privacy.html`
- **版本頁 → 支援網址**：`https://hauchiehlin-ops.github.io/OmniSeam-3D/support.html`
- **版本頁 → 行銷網址**（選填）：`https://hauchiehlin-ops.github.io/OmniSeam-3D/`

### 5. 關閉 Vercel（4.5.1 上架且大多數使用者已更新後）
1. 在 Vercel 刪除 OmniSeam 專案，或至少中斷它與 GitHub 的連結。
2. 刪除 repo 中的 `vercel.json` 與 `frontend/vercel.json`。
3. 把 GitHub repo 首頁連結（About → Website）改成 GitHub Pages 網址。

> 舊版 App 之後讀不到 Vercel，會使用內建預設值，仍可正常使用；只是無法收到遠端設定更新。

## 修改公開頁面
編輯 `site/` 內的檔案並合併到 `main`，GitHub Pages 會自動更新。修改隱私權政策時，請同步更新 `docs/app-store/privacy-labels.md` 與 `frontend/ios/App/App/PrivacyInfo.xcprivacy`。

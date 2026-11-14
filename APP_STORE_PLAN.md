# OmniSeam 3D — Apple App Store 上架整改方案（全免費 HF 版）

> ⚠️ 2026-11-14 更新：已取消網頁版部署，本文中關於 Vercel 網頁版、CORS 白名單保留 Vercel 網域、網頁版回歸測試等項目已不適用。公開頁面改由 GitHub Pages 提供，見 `docs/網站搬遷-GitHub-Pages.md`。

> 評估日期：2026-11-14 · 評估對象：v4.3.0（React 18 + Vite + Three.js 前端／FastAPI + Gradio 後端部署於 Hugging Face Space）
> 營運前提：**不租用任何付費主機**。公用示範節點與使用者自建節點全部使用 Hugging Face 免費 CPU Basic。

---

## 0. 結論先講

**路線：Capacitor 包裝現有前端 + 補足原生功能 + 定位為「本地優先、雲端節點為可選進階功能」。**

- 前端 `engine/`（解析、修復、匯出約 3,000 行 TS）與 Three.js 全部沿用，不重寫。
- **App 不依賴雲端也要完整可用**：本地模式就能完成 STL／OBJ／3MF／PLY／GLB 的檢查、修復、轉檔、熱圖、量測、剖面、AR。這是通過 **Guideline 2.1／4.2** 的核心。
- 原生 CAD（NURBS STEP、IGES、SolidWorks、Rhino、Inventor、DWG 等）定位為「**進階：連接處理節點**」，可用公用示範節點，或引導使用者在 HF 免費建立自己的節點。
- 這類「自備伺服器」模式在 App Store 有先例（Jellyfin、Home Assistant、Nextcloud 等），前提是：審核時有可用節點、引導不像外部付費解鎖。

預估工時：單人約 **3–4 週**可送審。固定成本只有 Apple Developer Program 每年 US$99。

---

## 1. 現況檢查：會被退件或在 iOS 上失效的項目

| # | 問題 | 位置 | 對應條款／後果 | 嚴重度 |
|---|------|------|----------------|--------|
| 1 | 公用節點是免費 HF Space，閒置約 48 小時會休眠，喚醒需數分鐘；審核員可能剛好遇到 | `frontend/src/api/client.ts:57` | 2.1 功能不完整 | 🔴 必修（keep-alive + 審核專用節點） |
| 2 | `CadUnlockModal` 使用鎖頭／✨ 圖示與「解鎖」用語，看起來像付費牆 | `components/CadUnlockModal.tsx` | 3.1.1：疑似引導 App 外解鎖 | 🔴 必修（改用語） |
| 3 | 引導文案若提到 HF 付費硬體、升級、價格 | `PublicLimitModal.tsx`、`BackendSettingsModal.tsx`、各語系 `translation.json` | 3.1.1／3.1.3 外部購買引導 | 🔴 必修（只提免費 CPU Basic） |
| 4 | AR 用 `<a rel="ar">` 觸發 Quick Look，**WKWebView 內不會動** | `engine/ar-manager.ts:87-103` | 功能失效 → 2.1 | 🔴 必修 |
| 5 | 匯出／ZIP／截圖都用 `a.download` + Blob URL，**WKWebView 不支援下載** | `App.tsx:330, 517`，`format-exporters.ts` | 核心功能失效 → 2.1 | 🔴 必修 |
| 6 | 檔案會上傳到伺服器，但沒有上傳前同意、也沒有公開的隱私權政策網址 | `PrivacyPolicyModal.tsx` 只在 App 內 | 5.1.1／5.1.2，App Privacy 標籤必填 | 🔴 必修 |
| 7 | 後端相依未鎖版本（apt `freecad`、`gradio>=4.44`、`trimesh>=4.2` 等），使用者日後 duplicate 可能建置失敗 | `Dockerfile`、`packages.txt`、`requirements.txt` | 不影響審核，但會造成大量負評與客服 | 🟠 必修 |
| 8 | 上傳檔與轉換結果從不刪除（只有 AR session 有清理） | `storage/file_manager.py` | 免費 Space 磁碟會滿；與隱私承諾不符 | 🟠 必修 |
| 9 | AR 頁面把 LAN 網址送到 `api.qrserver.com` 產生 QR Code | `ArPreviewModal.tsx:111` | 未揭露的第三方資料傳輸 | 🟠 iOS 版移除 |
| 10 | 可手動填 `http://localhost`／`http://192.168.x.x` 後端 | `BackendSettingsModal.tsx:367`、`client.ts` | ATS 會擋 http；需 Local Network 權限 | 🟠 iOS 版只允許 https |
| 11 | CORS 為 `"*"` 搭配 `allow_credentials=True` | `backend/app/config.py:21`、`app.py:50` | 安全性與瀏覽器相容性 | 🟡 改明確白名單 |
| 12 | Google Fonts 走 CDN | `index.html:156-158` | 離線會壞、多一個第三方 | 🟡 打包進 App |
| 13 | `frontend/public`、`src` 內有 63 個 macOS `._*` 檔 | `frontend/public/._favicon.ico` 等 | 會被複製進 App bundle | 🟡 清除 |
| 14 | 本地處理上限 500MB | `client.ts` `DEDICATED_MAX_SIZE_MB` | iPhone WebView 記憶體不足會閃退 | 🟡 iOS 版本地上限約 100MB |
| 15 | 文案大量使用 SolidWorks、Inventor、Rhino 等商標，並稱「100% privacy」 | `index.html` meta、README | 2.3.1 描述準確；5.2.1 商標不可放關鍵字 | 🟡 改寫 App Store 文案 |
| 16 | 專案不是 git repo | 根目錄 | 難以管理送審版本 | 🟡 建議 `git init` |

---

## 2. 架構

```
┌──────────────── iOS App (Capacitor) ────────────────┐
│ WKWebView：現有 React + Three.js + engine/（離線運作）  │
│   → 本地模式即為完整核心功能                            │
│                                                      │
│ 原生層（Swift 外掛）                                    │
│  ├ 檔案開啟：Files App／「用 OmniSeam 開啟」（UTType 註冊）│
│  ├ 檔案輸出：Share Sheet + 存到「檔案」(Filesystem)     │
│  ├ AR：QLPreviewController 開 USDZ                    │
│  ├ 設定：Preferences（節點網址等）                       │
│  └ 隱私：上傳前同意對話框 + PrivacyInfo.xcprivacy       │
└───────────────┬───────────────────────┬──────────────┘
                │ HTTPS（可選）          │ HTTPS（可選）
┌───────────────▼──────────┐ ┌──────────▼───────────────┐
│ 公用示範節點（免費 HF）     │ │ 使用者自建節點（免費 HF）   │
│ 25MB 上限、共用排隊         │ │ duplicate 官方映像檔       │
│ keep-alive 定時 ping       │ │ 檔案只進使用者自己的 Space   │
└──────────────────────────┘ └──────────────────────────┘
```

**節點網址可遠端設定**：App 啟動時讀取一份公開設定檔（例如放在 Vercel 的 `/config.json`），內含公用節點網址與公告。日後 HF 政策改變時不必重新送審就能切換。

---

## 3. 執行步驟

### Phase 1 — 清理與 iOS build 環境（2–3 天）
1. `git init`，刪除所有 `._*` 檔案，`.gitignore` 加 `._*`。
2. 加入 Capacitor：
   ```bash
   cd frontend && npm i @capacitor/core @capacitor/ios @capacitor/filesystem @capacitor/share @capacitor/preferences @capacitor/splash-screen @capacitor/status-bar
   npx cap init "OmniSeam 3D" com.<你的網域>.omniseam --web-dir dist
   npx cap add ios
   ```
3. 加平台旗標 `const IS_NATIVE = Capacitor.isNativePlatform()`，所有 iOS 專用行為都用它分流，**網頁版行為保持不變**。
4. Google Fonts 改成本地字型檔。
5. Vite 設 `base: './'`，確認 `npx cap sync` 後 Simulator 能開。

### Phase 2 — 修好在 WebView 內失效的核心功能（4–6 天）
1. **匯出／下載**：新增 `saveOrShareFile(blob, filename)`
   - Native：`Filesystem.writeFile`（Cache）→ `Share.share({ files: [uri] })`
   - Web：維持 `a.download`
   - 替換截圖、批次 ZIP、`format-exporters.ts` 各匯出點。
2. **AR Quick Look**：寫 Capacitor 外掛 `QuickLookPlugin.present(fileUri)`，用 `QLPreviewController` 開 USDZ。iOS 版隱藏 LAN／QR Code 流程。
3. **開啟檔案**：`Info.plist` 註冊 `CFBundleDocumentTypes`／`UTImportedTypeDeclarations`（stl, obj, 3mf, ply, glb, gltf, step/stp, iges/igs, usdz, dxf）。
4. **記憶體保護**：iOS 本地上限約 100MB；監聽 `webglcontextlost` 顯示明確提示，而不是白屏。

### Phase 3 — 免費 HF 節點強化（3–5 天，過審關鍵）

**3-1 讓 duplicate 穩定可重現**
1. 鎖定所有版本：`requirements.txt` 全部改 `==`；apt 套件鎖版本或固定 Debian snapshot；Python base image 用 digest。
2. 建議改成 **預先建好的 Docker image**（推到 GitHub Container Registry 或 Docker Hub），HF Space 改用 Docker SDK，Dockerfile 只剩一行 `FROM ghcr.io/<you>/omniseam-engine:4.3.0`。使用者 duplicate 時只需拉映像檔，幾分鐘內就能啟動，不會因上游更新而建置失敗。
3. 後端 `/api/v1/health` 回傳版本號；App 偵測到節點版本過舊時，提示「請在 HF 上 Factory Rebuild 你的節點」。

**3-2 公用示範節點與審核**
1. **Keep-alive**：用 GitHub Actions `schedule`（或 cron-job.org）每 12 小時 ping 一次 `/api/v1/health`，避免 48 小時閒置休眠。（只能防休眠，HF 平台重啟仍可能短暫中斷。）
2. **審核專用節點**：自己另外 duplicate 一個 Space 只給審核員用，網址寫在 Review Notes；送審前一天手動喚醒並確認健康檢查正常，審核期間每 2–3 小時 ping 一次。
3. 公用節點維持 25MB 上限、同時 2 個任務；App 內清楚標示「公用示範節點，可能需要排隊」，並顯示排隊狀態。

**3-3 後端必要修改**
1. **自動清理**：加定時任務，上傳檔與轉換結果 **1 小時後刪除**（與隱私權政策一致，也避免免費 Space 磁碟爆滿）。
2. **單一任務逾時**：例如 120 秒，逾時回傳明確錯誤碼。
3. **依 IP 限流**：保護公用節點不被單一使用者占滿。
4. **CORS**：改為明確白名單：`https://omniseam-3d.vercel.app`、`capacitor://localhost`、本機開發網址。**務必保留 Vercel 網域，否則網頁版會壞。**
5. 不強制 API Key（寫在 App／網頁裡的金鑰可被拆出，保護有限，且會影響網頁版）。

**3-4 前端引導改寫（iOS 版與網頁版共用新文案）**
1. `CadUnlockModal`：移除鎖頭／✨ 與「解鎖」字樣，改為「此格式需要雲端處理節點」，選項為：
   - 使用公用示範節點（≤25MB）
   - 連接我自己的節點
   - 了解如何建立免費節點
2. `PublicLimitModal`：說明公用節點上限，提供「建立自己的免費節點」引導；**不出現升級硬體、價格、付費等字眼**。
3. **3 步驟引導（附截圖）**：① 註冊 Hugging Face 免費帳號 → ② 點「Duplicate this Space」並選 **CPU Basic（免費）** → ③ 複製 Space 網址貼回 App 並按「測試連線」。引導內說明首次啟動需等候數分鐘。
4. 外部連結一律用系統瀏覽器（Safari）開啟。
5. 前端雲端請求加逾時（約 30 秒）、喚醒中狀態（偵測到節點休眠時顯示「節點啟動中，約需 1–3 分鐘」）與重試按鈕。
6. 6 個語系的 `translation.json` 同步修改。

> 💡 若日後要收費（例如官方高速節點），**必須用 In-App Purchase**，不可導向網站或 HF 付費方案。

### Phase 4 — 隱私與合規（2–3 天）
1. **上傳前同意**：第一次使用雲端節點時跳出說明，依節點類型顯示：
   - 公用節點：「檔案將上傳至 OmniSeam 公用節點（Hugging Face 主機）處理，處理後 1 小時內刪除。」
   - 自建節點：「檔案將上傳至你自己的 Hugging Face Space，資料處理由你與 Hugging Face 的服務條款規範。」
2. **隱私權政策網址**：把 `PrivacyPolicyModal` 內容做成公開網頁（例如 `omniseam-3d.vercel.app/privacy`），涵蓋本地模式、公用節點、自建節點三種情境。另需 Support URL。
3. **App Privacy 標籤**：無分析／追蹤 SDK → 「使用者內容 › 其他使用者內容（上傳的 3D 檔）」，用途「App 功能」，不與身分連結、不用於追蹤。
4. **PrivacyInfo.xcprivacy**：宣告 `NSPrivacyAccessedAPICategoryUserDefaults`（`CA92.1`）、`NSPrivacyAccessedAPICategoryFileTimestamp`（`C617.1`，若有用到）；`NSPrivacyTracking = false`。
5. `Info.plist`：`ITSAppUsesNonExemptEncryption = NO`；不加 `NSAllowsArbitraryLoads`；iOS 版不開 Local Network。
6. **開源授權頁**：App 內列出 three.js、i18next 等授權；後端 OCCT、FreeCAD（LGPL）、LibreDWG（GPLv3）只在伺服器端執行，不隨 App 散布，但一併列出。

### Phase 5 — 原生體驗打磨（3–5 天）
1. **內建範例模型**：3–4 個小檔（有破洞的 STL、faceted STEP、OBJ），首頁一鍵載入，讓審核員只用本地模式就能體驗完整功能。
2. 安全區域、狀態列、Splash Screen、App Icon（1024×1024 無透明）。
3. iPad 版面在橫直向都可用。
4. 實測雙指縮放／平移與量測工具精度。
5. iOS 版隱藏只對網站有意義的 Footer 連結。

### Phase 6 — 上架素材與送審（2–3 天）
1. **App Store Connect**：名稱、副標題、分類（生產力工具／圖形與設計）、年齡分級 4+。
2. **文案**：
   - 主打「離線 3D 模型修復與轉檔」，雲端 CAD 處理寫成進階功能；
   - 商標名只在描述中寫「相容 … 格式」，不放關鍵字欄位；
   - 「100% 隱私」改為「本地模式完全在裝置上處理；雲端模式為可選功能」。
3. **在地化**：en／zh-TW／zh-CN／ja／ko／th 六語系文案與截圖。
4. **截圖**：6.9" iPhone、13" iPad，展示破洞熱圖 → 修復後、AR、格式轉換。
5. **Review Notes**（範例）：
   > 本 App 不需登入。核心功能（3D 模型檢查、修復、轉檔、AR）完全在裝置上離線執行，可在首頁點選「範例模型」測試。
   > 原生 CAD 格式（STEP NURBS、IGES 等）為可選進階功能，需連接處理節點。審核用節點：`https://<審核專用節點>.hf.space`（設定 → 處理節點 → 貼上 → 測試連線）。測試用 STEP 檔：<下載連結>。
   > 「建立自己的節點」引導只使用 Hugging Face 免費方案，App 內沒有任何付費內容。
6. 先走 **TestFlight** 內部 → 外部測試 → 正式送審。

---

## 4. 送審前檢查清單

- [ ] 飛航模式下開 App：本地轉換、修復、匯出、AR、範例模型全部可用
- [ ] 審核專用節點健康檢查正常，keep-alive 排程已啟用
- [ ] App 內任何地方都沒有「解鎖」「升級」「付費」「價格」字樣
- [ ] 按照 App 內引導，從零 duplicate 一個新節點能在 10 分鐘內連線成功
- [ ] 所有匯出都能透過分享面板存到「檔案」
- [ ] AR 在實機能開啟 Quick Look
- [ ] 從「檔案」App 分享 STL 到 OmniSeam 3D 能開啟
- [ ] 第一次雲端上傳有同意對話框；App 內與網頁隱私權政策一致
- [ ] 後端 1 小時自動清理已生效
- [ ] `PrivacyInfo.xcprivacy` 存在；Xcode Archive 驗證無警告
- [ ] bundle 內沒有 `._*` 檔案
- [ ] iPhone SE 與 iPad 橫向排版正常
- [ ] 載入 100MB 模型不會閃退（或有明確提示）
- [ ] **網頁版回歸測試**：Vercel 預覽網址上下載、AR、節點連線、CORS 皆正常

---

## 5. 時程與成本

| 階段 | 工時 | 備註 |
|------|------|------|
| 1 清理 + Capacitor | 2–3 天 | |
| 2 檔案進出／AR／記憶體 | 4–6 天 | 需實機測 AR |
| 3 免費 HF 節點強化 + 引導改寫 | 3–5 天 | 過審關鍵 |
| 4 隱私合規 | 2–3 天 | |
| 5 原生體驗打磨 | 3–5 天 | |
| 6 素材 + TestFlight + 送審 | 2–3 天 | 審核通常 1–3 天 |
| **合計** | **約 3–4 週** | |

**固定成本**：Apple Developer Program 每年 US$99。HF Space、GitHub Actions keep-alive、GHCR 映像檔、Vercel 隱私權政策頁皆使用免費方案。

---

## 6. 營運風險與對策

| 風險 | 對策 |
|------|------|
| 公用節點被大量使用而塞車 | 25MB 上限、IP 限流、排隊狀態顯示；鼓勵重度使用者建立自己的節點 |
| HF 平台重啟或維護造成中斷 | App 顯示「節點啟動中」並自動重試；本地模式不受影響 |
| 使用者 duplicate 後建置失敗 | 改用預建 Docker image 並鎖版本 |
| 使用者覺得申請流程太難 | 附截圖的 3 步驟引導 + 測試連線按鈕；網頁版提供同一份教學頁 |
| HF 免費政策日後改變 | 節點網址由遠端 `config.json` 控制，可不重新送審就切換 |
| 審核期間節點剛好休眠 | 審核專用節點 + 提高 ping 頻率 + 送審前手動確認 |

---

## 7. 對網頁版的影響

- iOS 專用行為全部以 `Capacitor.isNativePlatform()` 分流，網頁版的下載、AR／QR Code、localhost 節點、500MB 上限保持不變。
- 兩邊共用的改動都是改善：本地字型、上傳同意、逾時與重試、新引導文案、`._*` 清理、後端自動清理。
- 唯一需特別注意：CORS 白名單**必須保留 `https://omniseam-3d.vercel.app`**。
- 每次修改後先 `npm run build` 並在 Vercel 預覽網址實測，再 `npx cap sync` 到 iOS。

---

## 8. 執行狀態（2026-11-14，分支 `feature/ios-app-store`）

| Phase | 狀態 | 主要產出 |
|---|---|---|
| 1 清理與 iOS 環境 | ✅ 完成 | `frontend/ios/`（Capacitor 8）、`capacitor.config.ts`、本地字型、`._*` 清除（`.gitignore`、Vite 外掛、Xcode build phase）、App Icon／Splash |
| 2 WebView 失效功能 | ✅ 完成 | `src/platform/native.ts`（分享面板儲存、AR Quick Look、「用 OmniSeam 開啟」）、`QuickLookPlugin.swift`、`Info.plist` 文件類型、100MB 上限、WebGL context lost 提示、USDZ 匯出材質修正 |
| 3 免費 HF 節點強化 | ✅ 程式完成 | `backend/app/hardening.py`（CORS 白名單、IP 限流、1 小時清理、任務逾時）+ 6 個測試、`requirements.txt` 鎖版本 + `constraints.txt`、`keep-alive.yml`、`engine-image.yml`、`deploy/hf-space/`、遠端 `config.json`、引導文案 6 語系改寫、節點版本檢查與喚醒提示 |
| 4 隱私合規 | ✅ 完成 | 上傳前同意對話框、`PrivacyInfo.xcprivacy`、`public/privacy.html`、`public/support.html`、開源授權頁 |
| 5 原生體驗 | ✅ 完成 | 3 個內建範例（`scripts/generate_samples.py`）、安全區域、iOS 原生分享、iPad 版面確認 |
| 6 上架素材 | ✅ 文件完成 | `docs/app-store/`（6 語系文案、Review Notes、隱私標籤答案、上傳步驟、草稿截圖） |

**需要你本人完成（需帳號或付費，無法代勞）：**
1. 加入 Apple Developer Program，在 Xcode 選 Team、Archive、上傳（見 `docs/app-store/release-ios.md`）。
2. 建立審核專用 HF 節點，設定 GitHub 變數 `REVIEW_NODE_URL`，填入 Review Notes 佔位符。
3. 部署網頁版到 Vercel（讓 `privacy.html`、`support.html`、`config.json` 上線），並把 HF Space 更新到此分支的後端（`scripts/deploy_to_hf.sh`）。
4. 依 `docs/hf-node.md` 決定是否把公用 Space 改為預建映像檔（需將 GHCR 套件設為公開）。
5. 實機測試 AR Quick Look 與「檔案」App 開啟；製作正式截圖。

**已知限制：** iPad 寬度下部分策略卡片文字擠成直排（既有版面）；手機上 3D 檢視區佔據畫面，需在檢視區外滑動捲頁。

# OmniSeam 3D — App Store 上架手冊（從零開始）

> 適用版本：OmniSeam 3D 4.3.0 · iOS／iPadOS 通用 App（Capacitor 8）· 2026-11
> Apple 後台介面偶爾改版，按鈕名稱若略有不同，以同位置、同意思的選項為準。

---

## 0. 現在可以打包上傳了嗎？

| 項目 | 狀態 |
|---|---|
| iOS 專案可正式 Archive（Release） | ✅ `scripts/apple-release.sh --check` 通過 |
| 隱私權政策／支援頁面上線 | ✅ https://omniseam-3d.vercel.app/privacy.html ・ /support.html |
| 遠端設定 `config.json` 上線 | ✅ |
| 雲端節點 v4.3.0、審核測試檔可轉換 | ✅ |
| PrivacyInfo.xcprivacy、加密聲明、App Icon | ✅ 已在專案中 |
| Apple Developer 帳號、Team ID、API Key | ⏳ **你本人完成第 1–6 步後即可上傳** |

完成第 1–6 步後，執行一行指令就能升版、打包、上傳：

```bash
./scripts/apple-release.sh patch --push
```

---

## 1. 加入 Apple Developer Program（US$99／年）

1. 準備一個**已開啟雙重認證**的 Apple ID。
2. 前往 https://developer.apple.com/programs/enroll/ → **Start Your Enrollment**。
3. 選擇身分：

| 類型 | 適合 | App Store 上顯示的「賣家」 | 需要 |
|---|---|---|---|
| **Individual（個人）** | 個人開發者（建議） | 你的真實姓名 | 身分證件 |
| Organization（組織） | 公司、團體 | 公司名稱 | D-U-N-S 編號、公司網站、法務授權 |

4. 付款後通常 24–48 小時內開通。開通後會收到「Welcome to the Apple Developer Program」郵件。

> 本 App **免費、無內購**，所以**不需要**簽署付費 App 協議，也**不需要**填銀行與稅務資料。

---

## 2. 確認協議

1. 登入 https://appstoreconnect.apple.com → **Business**（商務）。
2. 若有黃色橫幅要求接受新版 **Apple Developer Program License Agreement**，請先接受，否則無法上傳。
3. Free Apps 協議會自動生效，不需額外操作。

---

## 3. 取得 Team ID

1. 前往 https://developer.apple.com/account → 右上角帳號 → **Membership details**（會員資格詳細資訊）。
2. 複製 **Team ID**（10 碼英數字，例如 `AB12CD34EF`）。
3. 稍後填入 `.asc.env` 的 `APPLE_TEAM_ID`。

---

## 4. 註冊 App ID（Bundle ID）— 手把手

> Bundle ID 一旦有版本上傳後**無法更改**。目前專案使用 `io.github.hauchiehlinops.omniseam3d`。
> 如果你有自己的網域（例如 `example.com`），想改成 `com.example.omniseam3d`，請在**第一次上傳前**同時修改三處：
> `frontend/capacitor.config.ts` 的 `appId`、Xcode 專案的 `PRODUCT_BUNDLE_IDENTIFIER`（Debug 與 Release）、`.asc.env` 的 `BUNDLE_ID`。

1. 前往 https://developer.apple.com/account/resources/identifiers/list
2. 點 **Identifiers** 旁的 **＋**。
3. **Register a new identifier** → 選 **App IDs** → **Continue**。
4. **Select a type** → 選 **App** → **Continue**。
5. 填寫：

| 欄位 | 填入 |
|---|---|
| Description | `OmniSeam 3D` |
| Bundle ID | 選 **Explicit**，填 `io.github.hauchiehlinops.omniseam3d` |
| Platform（若有顯示） | iOS, iPadOS, macOS, tvOS, watchOS, visionOS（預設即可） |
| Capabilities | **全部保持不勾**（本 App 不使用推播、iCloud、Sign in with Apple 等） |
| App Services | 全部不勾 |

6. **Continue** → 確認 → **Register**。

> 憑證（Certificates）與描述檔（Profiles）**不需要手動建立**：上傳腳本使用 Xcode 自動簽署，第一次執行時會自動建立 Apple Distribution 憑證與 App Store 描述檔。

---

## 5. 在 App Store Connect 建立 App

1. https://appstoreconnect.apple.com → **Apps（我的 App）** → 左上 **＋** → **New App（新增 App）**。
2. 填寫：

| 欄位 | 填入 | 說明 |
|---|---|---|
| Platforms | ✅ **iOS** | iPad、Apple silicon Mac、Vision Pro 都由同一個 iOS 版本提供，不必勾其他平台 |
| Name | `OmniSeam 3D` | 30 字內；若已被使用，改用 `OmniSeam 3D Repair` |
| Primary Language | **English (U.S.)** | 其他 5 種語言稍後再新增 |
| Bundle ID | 選 `OmniSeam 3D - io.github.hauchiehlinops.omniseam3d` | 第 4 步註冊的 ID |
| SKU | `omniseam3d-ios` | 內部用，使用者看不到 |
| User Access | **Full Access** | |

3. **Create**。

---

## 6. 建立 App Store Connect API Key（給上傳腳本用）

1. App Store Connect → **Users and Access（使用者與存取權限）** → **Integrations（整合）** → **App Store Connect API**。
2. 第一次使用要按 **Request Access**，同意條款。
3. **Team Keys** → **＋（Generate API Key）**：

| 欄位 | 填入 |
|---|---|
| Name | `OmniSeam release` |
| Access | **Admin**（自動簽署需要建立憑證與描述檔；若選 App Manager，需另外開啟「Certificates, Identifiers & Profiles」存取權） |

4. **Generate** 後記下：
   - **Issuer ID**（頁面上方，UUID 格式）
   - **Key ID**（列表中的 10 碼）
5. 點 **Download**，下載 `AuthKey_<KeyID>.p8`。**只能下載一次**，請妥善保存，**不要放進專案資料夾**：

```bash
mkdir -p ~/.appstoreconnect/private_keys && mv ~/Downloads/AuthKey_*.p8 ~/.appstoreconnect/private_keys/
```

6. 在專案根目錄建立設定檔（已被 `.gitignore` 排除，不會進 Git）：

```bash
cp .asc.env.example .asc.env && open -e .asc.env
```

填入 `APPLE_TEAM_ID`、`ASC_KEY_ID`、`ASC_ISSUER_ID`、`ASC_KEY_PATH`（.p8 的完整路徑）。

---

## 7. 第一次打包上傳

```bash
./scripts/apple-release.sh none
```

- `none`：保持目前版本 4.3.0，只上傳一個新 build（第一次上架建議這樣）。
- 流程：建置網頁 → 同步 Capacitor → Archive（自動簽署）→ 上傳到 App Store Connect。
- 成功後約 5–30 分鐘，**TestFlight** 分頁會出現這個 build（狀態從 Processing 變成 Ready to Submit）。

> 遇到錯誤請看第 15 節。

---

## 8. App 資訊（App Information）

App Store Connect → 你的 App → **General → App Information**：

| 欄位 | 填入 |
|---|---|
| Name／Subtitle | 依 `docs/app-store/metadata.md`，每個語言各填一次 |
| Category | Primary **Productivity**（生產力工具）、Secondary **Graphics & Design**（圖形與設計） |
| Content Rights | **No, it does not contain, show, or access third-party content**（使用者處理自己的檔案） |
| Age Rating | 點 **Edit** 填問卷，見下表 |
| License Agreement | 使用 Apple 標準 EULA（不用改） |

**新增語言**：頁面右上角語言選單 → **＋** → 依序加入 Chinese (Traditional)、Chinese (Simplified)、Japanese、Korean、Thai，每個語言填入 `metadata.md` 對應的名稱與副標題。

### 年齡分級問卷（全部選最低選項）

| 類別 | 回答 |
|---|---|
| 暴力、性、粗口、恐怖、藥物、酒精、菸草、賭博、競賽等所有內容題 | **None** |
| Medical or Treatment Information | **None** |
| Unrestricted Web Access（無限制網頁瀏覽） | **No**（只開啟固定的外部連結，不是瀏覽器） |
| User-Generated Content（使用者生成並分享內容） | **No** |
| Messaging and Chat | **No** |
| Advertising | **No** |
| Parental Controls／Age Assurance | **No** |
| Gambling／Contests | **No** |

結果應為 **4+**。

---

## 9. 價格與供應狀況（Pricing and Availability）

| 欄位 | 填入 |
|---|---|
| Price | **Free（USD 0）** |
| Availability | 所有國家或地區，**但建議取消勾選「中國大陸」**：中國大陸上架需要 ICP 備案號，沒有備案會被擋 |
| iPhone and iPad Apps on Apple Silicon Macs | **先不勾**；在 Apple silicon Mac 上實測後再開啟（Xcode 可選 *My Mac (Designed for iPad)* 測試） |
| Apple Vision Pro | **先不勾**；尚未在 Vision Pro 上測試 |
| Pre-Order | 不使用 |

> 「各平台」：iPhone、iPad 由目前的 build 直接提供；Mac（Apple silicon）與 Vision Pro 只要在上表勾選即可上架，**不需要另外打包**，同一個上傳指令即可涵蓋。

---

## 10. App 隱私（App Privacy）

1. **Privacy Policy URL**：`https://omniseam-3d.vercel.app/privacy.html`
2. **Get Started** → *Do you or your third-party partners collect data from this app?* → **Yes, we collect data from this app**。
3. 只勾 **User Content → Other User Content**，其他全部不勾。
4. Other User Content 的設定：

| 問題 | 回答 |
|---|---|
| Used for | **App Functionality** |
| Linked to the user's identity? | **No** |
| Used for tracking? | **No** |

5. **Publish**。詳細說明見 `docs/app-store/privacy-labels.md`。

---

## 11. 歐盟數位服務法（DSA）交易商身分

App Store Connect → **Business**（或 App 頁面提示）→ **Digital Services Act**：

- **Not a trader（非交易商）**：個人非營利、免費 App 可選此項。
- **Trader（交易商）**：以營業為目的時選此項，地址、電話、Email 會**公開顯示**在歐盟的 App Store 頁面。

未完成此步驟，App 無法在歐盟國家上架。請依你的實際情況選擇。

---

## 12. 版本頁面（Prepare for Submission）

左側 **iOS App → 1.0 Prepare for Submission**：

1. **版本號**：把預設的 `1.0` 改成 **`4.3.0`**（要與上傳的 build 版本一致）。
2. 每個語言填入（內容見 `metadata.md`）：

| 欄位 | 限制 |
|---|---|
| Promotional Text | 170 字 |
| Description | 4000 字 |
| Keywords | 100 字元，逗號分隔；**不可放 SolidWorks 等商標** |
| Support URL | `https://omniseam-3d.vercel.app/support.html` |
| Marketing URL | `https://omniseam-3d.vercel.app` |

3. **截圖**（每個語言；可先上傳英文，其他語言沿用）：

| 裝置 | 尺寸（直式） | 數量 |
|---|---|---|
| iPhone 6.9" | 1320 × 2868 | 3–10 張 |
| iPad 13" | 2064 × 2752 | 3–10 張 |

用模擬器截圖：
```bash
xcrun simctl io booted screenshot ~/Desktop/shot-$(date +%H%M%S).png
```

4. **Build**：點 **＋**，選第 7 步上傳的 build。
5. **General App Information**：Copyright 填 `© 2026 @B&B`；Routing App Coverage File 不用。
6. **App Review Information**：

| 欄位 | 填入 |
|---|---|
| Sign-in required | **不勾** |
| Contact Information | 你的姓名、電話（含國碼，如 +886…）、Email |
| Notes | 複製 `docs/app-store/review-notes.md` 中 Notes 區塊的全文 |
| Attachment | 不需要 |

7. **Version Release**：建議 **Manually release this version**（審核通過後由你決定上架時間）。

---

## 13. TestFlight 實機測試（送審前務必做）

1. **TestFlight** 分頁 → **Internal Testing** → **＋** 建立群組（例如 `Team`）→ 加入自己的 Apple ID。
2. iPhone／iPad 安裝 **TestFlight** App，接受邀請並安裝。
3. 實機測試清單：
   - [ ] 三個範例模型都能載入、轉換
   - [ ] 匯出 → 分享面板 →「儲存到檔案」
   - [ ] AR 按鈕 → AR Quick Look 顯示模型（模擬器無法測，只能實機）
   - [ ] 在「檔案」App 長按 STL → 分享 → OmniSeam 3D 能開啟
   - [ ] 雲端：下載 Review Notes 裡的測試 STEP 檔 → 上傳前出現同意視窗 → 轉換成功
   - [ ] 飛航模式下本地功能正常
   - [ ] iPad 橫向、直向版面
4. 正式截圖可以在這一步順便從實機拍。

---

## 14. 送審與上架

1. 送審前一天：把 `.github/workflows/keep-alive.yml` 的排程改成每 2 小時（`17 */2 * * *`），合併到 `main`，並確認 `https://hauchieh-omniseam-engine.hf.space/api/v1/health` 正常。
2. 版本頁面右上角 **Add for Review** → **Submit to App Review**。
3. 出口合規（加密）問題**不會再出現**，因為 `Info.plist` 已設定 `ITSAppUsesNonExemptEncryption = NO`。
4. 審核通常 1–3 天；狀態變成 **Pending Developer Release** 後，按 **Release This Version** 即上架。
5. 審核期間結束後，把 keep-alive 排程改回每 6 小時。

---

## 15. 之後的更新（一鍵升版、打包、上傳）

```bash
./scripts/apple-release.sh patch --push
```

| 指令 | 用途 |
|---|---|
| `./scripts/apple-release.sh patch` | 4.3.0 → 4.3.1，打包並上傳 |
| `./scripts/apple-release.sh minor` | 4.3.0 → 4.4.0 |
| `./scripts/apple-release.sh major` | 4.3.0 → 5.0.0 |
| `./scripts/apple-release.sh none` | 版本不變，只上傳新 build（修正被退件時常用） |
| `… --push` | 另外提交版本變更、打 Git 標籤 `ios-v<版本>-b<build>` 並推送 |
| `… --git` | 提交與打標籤，但不推送 |
| `… --no-upload` | 只產生 .ipa，不上傳 |
| `./scripts/apple-release.sh --check` | 不需帳號的完整檢查（未簽署 Archive），不升版也不上傳 |
| `npm run release:apple -- patch --push` | 同上，用 npm 執行 |

- 版本號同步更新：`package.json`、`frontend/package.json`、`frontend/src/version.ts`、`backend/app/config.py`。
- Build 號自動使用時間（`YYYYMMDDHHmm`），保證每次遞增。
- Archive 存放在 `~/Library/Developer/Xcode/Archives/OmniSeam3D/`，Xcode **Organizer** 也看得到。
- `--push` 會推送到目前分支；版本變更含 `backend/app/config.py`，推到 `main` 時會順便自動部署 HF 節點。

每次更新上傳後，到 App Store Connect 建立新版本（**＋ Version or Platform → iOS**）、選新 build、填「What's New」，再送審。

---

## 16. 常見錯誤

| 訊息 | 原因與解法 |
|---|---|
| `No Accounts` / `No profiles for '…' were found` | `.asc.env` 的 API Key 權限不足 → 改用 **Admin** 權限的 Key；或第 4 步的 Bundle ID 未註冊 |
| `Bundle identifier … is not available` | Bundle ID 已被其他帳號註冊 → 改用你自己的網域（見第 4 步說明） |
| `The bundle version must be higher than the previously uploaded version` | build 號重複 → 直接重跑腳本（時間戳會變），或加 `--build-number` |
| `Invalid Pre-Release Train` / 版本已關閉 | 該版本已上架 → 用 `patch` 升版後再上傳 |
| `ITMS-91053 Missing API declaration` | 隱私清單缺項 → 檢查 `frontend/ios/App/App/PrivacyInfo.xcprivacy` |
| 簽章錯誤 `resource fork, Finder information, or similar detritus not allowed` | exFAT 磁碟的 `._*` 檔 → 腳本與 Xcode 已自動清除；若仍出現，執行 `find frontend/ios -name '._*' -delete` 後重試 |
| 審核員回報雲端節點無回應 | 確認 HF 節點健康檢查；在 App Store Connect 的 Resolution Center 回覆並請他們稍候重試 |

# 基礎版／專業版：App 內購買設定（方案 A：診斷免費、修復收費）

## 方案內容

| 基礎版（免費、永久） | 專業版（一次買斷） |
|---|---|
| 開啟 STL／OBJ／3MF／PLY／GLB | 包含基礎版全部功能 |
| 模型檢查、缺陷熱圖 | 智慧修復／水密修復策略、專家修復選項（`auto_repair`） |
| 量測、剖面、AR 預覽 | STEP／IGES／BREP／DXF 與原生 CAD／BIM 匯入（`cad_import`） |
| 網格格式直接互轉（不修復、不壓縮） | 雲端處理節點（`cloud_node`） |
| 稽核報告查看 | 風洞流體域（`wind_tunnel`） |
| | 多檔批次與 ZIP 匯出（`batch`） |
| | glTF／Draco 壓縮（`draco`） |
| | 稽核報告 JSON／PDF 匯出（`report_export`） |

規則集中在 `frontend/src/platform/entitlements.ts`（`requiredFeatureForConvert`、`can()`）。要調整哪些功能屬於專業版，只改這個檔案和 `PaywallModal` 的功能清單即可。

## 商品（App Store Connect → 你的 App → 營利 → App 內購買項目）

兩個都是**非消耗型（Non-Consumable）**：

| Reference Name | Product ID | 價格 | 顯示名稱（en / zh-TW） | 說明 |
|---|---|---|---|---|
| Pro Unlock | `io.github.hauchiehlinops.omniseam3d.pro` | 自訂（例如 US$29.99／NT$990） | OmniSeam 3D Pro／OmniSeam 3D 專業版 | 一次買斷全部專業功能 |
| 7-Day Pro Trial | `io.github.hauchiehlinops.omniseam3d.trial7d` | **Free（0 元）** | 7-Day Pro Trial／專業版 7 天免費試用 | 名稱必須寫明期限（準則 3.1.1） |

> 若更改 Bundle ID，Product ID 也要一起改：`entitlements.ts` 的 `PRODUCT_PRO`／`PRODUCT_TRIAL`，以及 `ios/App/App/OmniSeam.storekit`。

每個商品都要：
- 填寫每個語系的顯示名稱與描述。
- 上傳**審核用截圖**（付費頁畫面即可，iPhone 尺寸）。
- 在 App 版本頁的「App 內購買項目」區塊**勾選加入此版本**，跟 App 一起送審。第一個內購項目必須隨新版本一起提交。
- Family Sharing：專業版建議開啟；試用版不要開啟。

## 試用的運作方式

- 使用者「購買」0 元試用商品後，StoreKit 2 會產生一筆交易；App 以這筆交易的購買日期加 7 天作為到期時間。
- 交易綁在 Apple ID 上，刪除 App 重裝也不會重新開始；換一台裝置登入同一個 Apple ID 也一樣。
- 試用不會續訂、不會扣款，到期後自動回到基礎版。購買專業版則永久有效。
- **防止調時鐘延長試用**（`frontend/src/platform/trusted-clock.ts`），App 不會單獨相信裝置時鐘：
  1. **伺服器時間**：每次啟動和回到前景時，讀取 GitHub Pages（`hauchiehlin-ops.github.io/OmniSeam-3D/config.json`）的 HTTPS `Date` 標頭。這是 App 本來就會連線的主機，不新增第三方。
  2. **最晚時間紀錄**：App 看過的最晚時間（伺服器時間、Apple 簽署的試用購買日、App 使用中經過的時間）存在 **Keychain**，刪除 App 重裝也不會清掉。
  3. **單調時鐘**：App 執行期間用 `performance.now()` 推進時間，不受使用中修改日期影響。
  - **離線時**：若裝置時間早於最晚紀錄超過 10 分鐘，試用會**暫停**，付費頁顯示「請連上網路確認日期」，連線後自動恢復。日期正常的離線使用者不受影響。
  - **剩餘漏洞**：一直保持離線，並在每次開 App 前把時鐘調回同一天，可以多用的時間只有每次約 10 分鐘的容許誤差；而且 App 使用時間會累積到最晚紀錄，最後一樣會被擋下。

## 贈送專業版（優惠代碼 Offer Codes）

Apple 已在 2026-03-26 停止為內購產生「促銷代碼（Promo Codes）」，改用**優惠代碼（Offer Codes）**。優惠代碼支援非消耗型項目，可以把專業版設成免費送人。

> ⚠️ **不能自己做序號或啟用碼來開通專業版**。審核準則 3.1.1 禁止用自訂的序號機制解鎖功能，一律要透過 Apple 內購或優惠代碼。

**建立步驟**（專業版必須已經審核通過）：
1. App Store Connect → App → **營利 → App 內購買項目** → 點 **Pro Unlock**。
2. 找到 **優惠代碼（Offer Codes）** 區塊，按 **建立優惠代碼**（或 ＋）。
3. 填寫：
   - 參考名稱：例如 `Gift 2026-12 媒體`。
   - 價格：**免費**。
   - 適用國家或地區。
   - 代碼類型：
     - **一次性代碼**：每組只能用一次。填數量後系統產生，可下載 CSV。適合逐一送給特定的人。
     - **自訂代碼**：例如 `OMNISEAM-PRESS`，可設定兌換次數上限。適合活動。
   - 到期日。
4. 送出。一次性代碼需要一點時間產生，完成後下載 CSV。

**收到代碼的人怎麼兌換**（需 iOS 16.3 以上）：
- 在 App Store → 右上角頭像 → **兌換禮品卡或代碼** → 輸入代碼。
- 或直接點兌換連結：`https://apps.apple.com/redeem?ctx=offercodes&id=<App 的 Apple ID>&code=<代碼>`。

兌換成功後，App 會透過 `Transaction.updates` 自動收到專業版權益，不需要額外的程式。若想在 App 內加一個「兌換代碼」按鈕，可以呼叫 StoreKit 的 `AppStore.presentOfferCodeRedeemSheet(in:)`。

**其他方式**：
- **家人共享**：專業版開啟 Family Sharing 後，你的家庭群組成員（最多 6 人）可以免費使用。
- **TestFlight 測試人員**：在 TestFlight 版本裡購買不會扣款，但只適用於測試版，不是正式贈送。

## 操作手冊

- [IAP-建立步驟.md](./IAP-建立步驟.md)：零基礎建立兩個內購、上傳截圖、加入送審版本。
- [DSA-交易商身分.md](./DSA-交易商身分.md)：零基礎設定歐盟 DSA 交易商身分。

## 程式結構

| 檔案 | 作用 |
|---|---|
| `frontend/ios/App/App/StorePlugin.swift` | StoreKit 2：取得商品、購買、恢復購買、讀取權益；監聽 `Transaction.updates` |
| `frontend/src/platform/entitlements.ts` | 方案狀態（basic／trial／pro）、本機快取（離線可用）、功能門檻規則 |
| `frontend/src/platform/trusted-clock.ts` | 防竄改時鐘：伺服器時間、Keychain 最晚時間紀錄、單調時鐘 |
| `frontend/src/components/PaywallModal.tsx` | 方案頁／付費頁、`ProBadge` |
| `frontend/src/App.tsx` | 首次啟動顯示方案頁；各功能入口呼叫 `requirePro()` |

- 已不提供網頁版；在瀏覽器 dev server 上預設全部功能開放，方便開發測試。
- 截圖模式（`VITE_SCREENSHOT_MODE=1`）一律視為專業版。

## 測試

1. **瀏覽器（最快）**：`npm run dev`，在主控台執行 `localStorage.setItem('omniseam_dev_store','1')` 後重新整理，會使用模擬商店（只在 dev server 有效）。
   - 重置：清除 `omniseam_dev_entitlements`、`omniseam_plan_intro_seen`、`CapacitorStorage.omniseam_entitlements_v1`、`omniseam_dev_secure_trial_high_water`。
   - 模擬調時鐘：`omniseam_dev_clock_offset = "-864000000"`（裝置時鐘往回 10 天）；模擬離線：`omniseam_dev_offline = "1"`。
2. **Xcode 本機 StoreKit**：共用 scheme `App` 已指定 `App/OmniSeam.storekit`。在 Xcode 執行到模擬器即可購買或試用；Debug → StoreKit → Manage Transactions 可刪除交易或退款。
   - 若 Xcode 沒有套用，請到 Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration 選擇 `OmniSeam.storekit`。
   - 用 `simctl` 直接安裝啟動（非 Xcode 執行）時不會載入 StoreKit 設定，付費頁會顯示「無法連線到 App Store」，這是正常的。
3. **沙盒／TestFlight**：在 App Store Connect → 使用者與存取 → 沙盒測試人員建立帳號，於裝置的「設定 → App Store → 沙盒帳號」登入後測試。

## 上架前檢查

- [ ] Paid Apps Agreement、銀行帳戶、稅務表格狀態皆為 Active。
- [ ] 兩個 IAP 已建立、有截圖、已加入此 App 版本。
- [ ] 審核備註已更新（`review-notes.md`），說明方案頁位置與試用方式。
- [ ] 商品頁描述已列出專業版內容（`metadata.md`）。
- [ ] DSA 交易商身分已確認（有收費通常應選 Trader）。
- [ ] App 隱私標籤：使用原生 StoreKit、沒有自建伺服器，不需新增資料類型。

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
- 已知限制：到期時間以裝置時鐘計算，使用者把時間往回調可以延長試用。若要防堵，可改用伺服器時間或 `AppTransaction`，目前的規模不建議為此增加複雜度。

## 程式結構

| 檔案 | 作用 |
|---|---|
| `frontend/ios/App/App/StorePlugin.swift` | StoreKit 2：取得商品、購買、恢復購買、讀取權益；監聽 `Transaction.updates` |
| `frontend/src/platform/entitlements.ts` | 方案狀態（basic／trial／pro）、本機快取（離線可用）、功能門檻規則 |
| `frontend/src/components/PaywallModal.tsx` | 方案頁／付費頁、`ProBadge` |
| `frontend/src/App.tsx` | 首次啟動顯示方案頁；各功能入口呼叫 `requirePro()` |

- 網頁版（Vercel）不受影響，所有功能照舊開放。
- 截圖模式（`VITE_SCREENSHOT_MODE=1`）一律視為專業版。

## 測試

1. **瀏覽器（最快）**：`npm run dev`，在主控台執行 `localStorage.setItem('omniseam_dev_store','1')` 後重新整理，會使用模擬商店（只在 dev server 有效）。
   - 重置：清除 `omniseam_dev_entitlements`、`omniseam_plan_intro_seen`、`CapacitorStorage.omniseam_entitlements_v1`。
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

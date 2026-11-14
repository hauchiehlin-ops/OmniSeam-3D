# 零基礎：建立兩個 App 內購買項目（專業版、7 天試用）並加入送審

> 適用：OmniSeam 3D（Bundle ID `io.github.hauchiehlinops.omniseam3d`）
> 介面文字以 App Store Connect 繁體中文介面為主，括號內為英文介面。Apple 偶爾會調整按鈕位置，名稱大致相同。
> 預計時間：協議與銀行稅務 30–60 分鐘（生效最多約 24 小時），每個商品約 10 分鐘。

---

## 步驟 0：事前準備

| 需要的東西 | 說明 |
|---|---|
| Apple Developer Program 帳號 | 要用**帳號持有人（Account Holder）**登入，才能簽協議 |
| 銀行帳戶資料 | 銀行英文名稱、SWIFT 代碼、帳號、戶名（英文，要和帳號持有人一致）。可向銀行索取「外匯收款英文資料」 |
| 稅務資料 | 個人：身分證字號、英文地址 |
| 審核用截圖 | 付費頁畫面一張，取得方法見步驟 2-5 |
| 已建置含內購程式的新版本 | 第一個內購項目一定要跟**新版本的 App** 一起送審 |

---

## 步驟 1：簽署付費 App 協議，填好銀行與稅務（只做一次）

沒有完成這步，內購在審核和正式環境都**無法購買**，Apple 會以「內購無法使用」退件。

1. 打開 https://appstoreconnect.apple.com 並登入。
2. 點首頁的 **商務（Business）**。
3. 在 **協議（Agreements）** 分頁找到 **付費 App（Paid Apps）**，按 **檢視並同意條款（View and Agree to Terms）**，閱讀後勾選同意並送出。
4. 回到商務頁，在 **銀行帳戶（Bank Accounts）** 按 **新增（Add）**：
   - 選擇國家或地區：台灣。
   - 依畫面填入 SWIFT 代碼、帳號、戶名。
   - 幣別選 TWD 或 USD。不確定的話，請問銀行哪一種收款手續費較低。
5. 在 **稅務表格（Tax Forms）** 按 **填寫（Complete）**。個人開發者通常會被要求填 **美國稅務表格 W-8BEN**：
   - 依序回答「是否為美國公民或居民」（否）、國籍（台灣）、地址等問題。
   - 稅務條約、預扣稅率等欄位，請照表單說明或詢問會計師。這部分屬於稅務專業，我無法替你判斷。
6. 完成後，協議狀態會從「處理中（Processing）」變成 **「有效（Active）」**，通常要幾小時到一天。
   - **變成 Active 之前，後面的內購仍可建立**，但沙盒測試和審核時的購買可能會失敗。

---

## 步驟 2：建立「專業版」（一次買斷）

### 2-1 建立商品
1. 首頁點 **App**，選 **OmniSeam 3D**。
2. 左側選單找到 **營利（Monetization）** → **App 內購買項目（In-App Purchases）**。
3. 按 **建立（Create）**，或「App 內購買項目」標題旁的 **＋**。
4. 依序填入：
   - **類型（Type）**：**非消耗性項目（Non-Consumable）**。
   - **參考名稱（Reference Name）**：`Pro Unlock`。只有你自己看得到，用來辨識。
   - **產品 ID（Product ID）**：`io.github.hauchiehlinops.omniseam3d.pro`。
     - ⚠️ 必須**一字不差**，程式就是用這串來找商品。
     - ⚠️ 建立後**不能修改**，刪除後也**不能再用**。
5. 按 **建立（Create）**，會進入這個商品的詳細頁。

### 2-2 可供應狀況（Availability）
1. 在 **可供應狀況** 按 **設定可供應狀況（Set Up Availability）**。
2. 勾選 **所有國家或地區**，或跟 App 本身的銷售地區相同。若 App 沒有在中國大陸上架，這裡也取消勾選。
3. 儲存。

### 2-3 價格（Price Schedule）
1. 在 **價格表（Price Schedule）** 按 **新增定價（Add Pricing）**。
2. **基準國家或地區**：主要市場在台灣就選 **台灣（TWD）**，否則選 **美國（USD）**。
3. **價格**：從下拉選單選一個價格點，例如 NT$990 或 US$29.99。
4. 按 **下一步**。Apple 會自動換算其他地區的價格，確認後按 **確認**。

### 2-4 App Store 本地化（顯示名稱與描述）
使用者在付款畫面會看到這些文字。每個語言都要填：

1. 在 **App Store 本地化版本（App Store Localization）** 按 **＋**，選語言。
2. 填入：

| 語言 | 顯示名稱（≤30 字） | 描述（≤45 字） |
|---|---|---|
| 繁體中文 | OmniSeam 3D 專業版 | 一次買斷：自動修復、CAD 匯入、風洞、批次匯出 |
| 英文（美國） | OmniSeam 3D Pro | One-time unlock: repair, CAD, batch & more |
| 簡體中文 | OmniSeam 3D 专业版 | 一次买断：自动修复、CAD 导入、风洞、批量导出 |
| 日文 | OmniSeam 3D Pro | 買い切り：自動修復、CAD 読込、風洞、一括書出し |
| 韓文 | OmniSeam 3D Pro | 1회 구매: 자동 복구, CAD 가져오기, 일괄 내보내기 |
| 泰文 | OmniSeam 3D Pro | ซื้อครั้งเดียว: ซ่อมอัตโนมัติ CAD ส่งออกหลายไฟล์ |

### 2-5 審查資訊（Review Information）
1. **截圖（Screenshot）**：上傳一張 App 內付費頁的畫面。**已經做好了，直接上傳即可**：
   - `docs/app-store/screenshots/iap-review/en/01-paywall.png`：英文，建議用這張，審核人員看英文。
   - `docs/app-store/screenshots/iap-review/zh-TW/01-paywall.png`：繁體中文。
   - 規格：1206×2622 PNG，無透明通道。兩個商品都可以用同一張。
   - 改了價格或付費頁之後，重新產生的指令：
     `SCENES=paywall DEVICES=iphone LANGS="en zh-TW" IPHONE_LABEL=iap-review scripts/app-store-screenshots.sh`
     圖中的價格固定是 US$29.99，只是示意；實際價格以 App Store Connect 的設定為準。

   想自己手動截圖的話：
   - 在 Mac 打開 `frontend/ios/App/App.xcodeproj`，上方裝置選任一 iPhone 模擬器，按 ▶︎ 執行。
     - 共用 scheme 已指定 `OmniSeam.storekit`，所以價格會正常顯示。
   - 第一次開啟就會出現「選擇你的方案」畫面。也可以點右上角的皇冠按鈕打開。
   - 在 Simulator 視窗按 **⌘S**，截圖會存到「桌面」。
   - 兩個商品可以用同一張截圖。
2. **審查備註（Review Notes）**，可直接貼上：
   ```
   Pro is a one-time Non-Consumable purchase. Open the plan screen from the crown
   button at the top right (it also appears on first launch), or tap any control
   marked "PRO". Restore Purchases is on the same screen.
   ```

### 2-6 其他設定
- **家人共享（Family Sharing）**：建議**開啟**，同一家庭群組的成員可以免費使用專業版。注意：開啟後**無法關閉**。
- **圖片（Image，選填）**：1024×1024 的推廣圖，只有要在 App Store 推廣內購時才需要，可以跳過。
- **稅務類別（Tax Category）**：保持預設（與 App 相同）。

### 2-7 儲存
按右上角 **儲存（Save）**。狀態從「缺少元資料（Missing Metadata）」變成 **「準備提交（Ready to Submit）」**，就表示資料都填齊了。

---

## 步驟 3：建立「7 天免費試用」（0 元）

做法跟步驟 2 幾乎一樣，只有以下欄位不同：

| 欄位 | 填入 |
|---|---|
| 類型 | **非消耗性項目（Non-Consumable）** |
| 參考名稱 | `7-Day Pro Trial` |
| 產品 ID | `io.github.hauchiehlinops.omniseam3d.trial7d` |
| 價格 | 新增定價時選 **免費（Free／0.00）** |
| 家人共享 | **不要開啟**（試用應該每人各自領一次） |

本地化文字。Apple 規定**名稱要寫明試用期限**（審核準則 3.1.1）：

| 語言 | 顯示名稱 | 描述 |
|---|---|---|
| 繁體中文 | 專業版 7 天免費試用 | 免費試用專業版 7 天，不扣款，到期回到基礎版 |
| 英文（美國） | 7-Day Pro Trial | Try Pro free for 7 days. No charge after. |
| 簡體中文 | 专业版 7 天免费试用 | 免费试用专业版 7 天，不扣款，到期回到基础版 |
| 日文 | Pro 7日間無料体験 | Pro を7日間無料で体験。課金なし、終了後ベーシックに |
| 韓文 | Pro 7일 무료 체험 | Pro를 7일간 무료 체험. 결제 없이 베이직으로 복귀 |
| 泰文 | ทดลองใช้ Pro ฟรี 7 วัน | ทดลอง Pro ฟรี 7 วัน ไม่มีค่าใช้จ่าย จากนั้นกลับเป็น Basic |

審查備註：
```
Price-tier-0 Non-Consumable used as a time-limited free trial (Guideline 3.1.1).
It unlocks all Pro features for 7 days from the purchase date, then the app
returns to Basic. It never renews or charges.
```

截圖用跟專業版同一張即可，最後按 **儲存**。

---

## 步驟 4：上傳含內購程式的新版本

1. 確認 PR 已合併，並跑一次正式發版流程。請依 `docs/app-store/release-ios.md` 或 `scripts/apple-release.sh` 上傳新的建置版本。
2. 回到 App Store Connect → App → 左側 **iOS App** 下，按 **＋** 建立新版本號，例如 `4.5.0`。
3. 在版本頁的 **建置版本（Build）** 區塊，選擇剛上傳的建置版本。

---

## 步驟 5：把兩個內購加入送審的版本

1. 在同一個版本頁往下捲，找到 **App 內購買項目與訂閱項目（In-App Purchases and Subscriptions）**。
2. 按 **選取 App 內購買項目或訂閱項目（Select In-App Purchases or Subscriptions）**。
3. 勾選 **Pro Unlock** 和 **7-Day Pro Trial**，按 **完成（Done）**。
4. 更新同一頁的其他欄位：
   - **App 審查資訊 → 備註**：貼上 `docs/app-store/review-notes.md` 裡新版的 Notes。
   - **描述**：貼上 `docs/app-store/metadata.md` 裡含「方案」段落的新描述。
5. 按右上角 **儲存**，再按 **新增以供審查（Add for Review）** → **提交送審（Submit for Review）**。
6. 內購項目狀態會變成 **「等待審查（Waiting for Review）」**，跟 App 一起審核。

---

## 步驟 6：送審前自己測一次（強烈建議）

1. App Store Connect → **使用者與存取（Users and Access）** → **沙盒（Sandbox）** → **測試人員（Testers）** → **＋**，建立一個沙盒帳號。
   - 要用一個**沒有註冊過 Apple ID** 的 Email，可以用 Gmail 的 `你的帳號+sandbox1@gmail.com` 這種寫法。
2. 在實機 iPhone：**設定 → App Store → 往下捲到「沙盒帳號」** → 登入剛建立的帳號。
3. 用 TestFlight 安裝新版本，依序測試：
   - 開始試用 → 專業功能可以使用。
   - 刪除 App 再重裝 → 按「恢復購買」 → 試用仍在，而且**不會重新計算 7 天**。
   - 購買專業版 → 沙盒不會真的扣款。
   - 換一個新的沙盒帳號 → 測「恢復購買」會顯示「沒有購買紀錄」。

---

## 常見問題

| 狀況 | 原因與處理 |
|---|---|
| 付費頁顯示「無法連線到 App Store」 | Paid Apps 協議尚未 Active、產品 ID 打錯，或內購尚未建立。用 `simctl` 直接啟動（不是從 Xcode 執行）時也會這樣 |
| 審核被退：IAP 無法購買 | 通常是協議或銀行稅務未完成，或沒有把內購加入版本 |
| 審核被退：試用名稱不清楚 | 顯示名稱必須寫出期限，例如「7 天」 |
| 想改價格 | 商品頁 → 價格表 → 新增定價，可以設定生效日期，不需重新送審 |
| 想送專業版給別人 | 見 `in-app-purchases.md` 的「贈送專業版（優惠代碼）」 |

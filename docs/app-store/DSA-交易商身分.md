# 零基礎：設定歐盟 DSA 交易商（Trader）身分

> 歐盟《數位服務法》（DSA）要求 App Store 在歐盟的 App 頁面上公開「交易商」的聯絡資料。
> **所有開發者帳號都必須申報身分**，即使 App 不在歐盟上架也一樣。沒有申報或驗證未通過時，App 在歐盟 27 國都無法下載。

---

## 先決定：要選「交易商」還是「非交易商」？

| 選項 | 適用情況 | 公開的資料 |
|---|---|---|
| **交易商（Trader）** | 以營利為目的：App 有付費內購、付費下載、廣告，或與你的工作或生意有關 | 地址、電話、Email，會顯示在歐盟 App Store 頁面 |
| 非交易商（Not a trader） | 純個人興趣、完全不收費、與生意無關 | 不公開 |

**OmniSeam 3D 加入付費的專業版之後，通常應選「交易商」。** 最終要由你自己判斷；有疑慮時，可參考 Apple 的說明頁或詢問法律專業人士。

> 若選了非交易商但其實符合交易商條件，日後可能被 Apple 要求更正，App 也可能在歐盟下架，直到更正完成。

---

## 事前準備（建議先處理隱私問題）

這些資料會**公開顯示**，建議先準備好：

| 項目 | 建議 |
|---|---|
| **地址** | 個人開發者可以填郵政信箱（PO Box）或商務地址，不一定要用住家地址。請以表單上的說明為準 |
| **電話** | 必須能**接收簡訊驗證碼**。可考慮另外辦一個門號專門給開發者帳號使用 |
| **Email** | 建議使用專用信箱，例如 `support@你的網域` 或另開一個 Gmail，不要用私人信箱 |
| 權限 | 要用**帳號持有人或管理員（Admin）**角色登入 |

---

## 操作步驟

1. 登入 https://appstoreconnect.apple.com。
2. 點首頁的 **商務（Business）**。
3. 在 **協議（Agreements）** 分頁往下捲，找到 **法規遵循（Compliance）** 區塊中的 **數位服務法（Digital Services Act）**。
4. 按 **完成法規遵循要求（Complete Compliance Requirements）**。也可能顯示為「編輯」或「提供交易商身分」。
5. 選擇身分：**「這是交易商帳號」／「I'm a trader」**。
   - 如果畫面讓你選擇「所有 App 共用」或「每個 App 分別設定」，個人開發者選 **所有 App 共用** 最簡單。
6. 依序填入要公開的資料：
   - **地址**：國家（台灣）、城市、郵遞區號、街道地址，或郵政信箱。
   - **電話號碼**：國碼選 +886，手機號碼去掉開頭的 0，例如 `912345678`。
   - **Email**。
7. **驗證聯絡資料**：Apple 會分別寄送驗證碼：
   - Email：到信箱收信，把驗證碼填回畫面。
   - 電話：收到簡訊後，把驗證碼填回畫面。
8. 確認資料無誤後按 **送出（Submit）**。
9. 狀態會顯示 **「審查中（In Review）」**。通過後會變成 **「已驗證（Verified）」**。
   - 一般幾天內完成，但有開發者回報曾卡在 In Review 很久。**審查期間 App 在歐盟可能無法下載**，所以建議在 App 送審前就先完成這一步。
   - 若超過一週沒有變化，可以從 App Store Connect 右上角的「?」→ **聯絡我們（Contact Us）** 詢問。
10. 完成後，可在 App 頁面 → **App 資訊（App Information）** 確認交易商狀態已套用到 OmniSeam 3D。

---

## 之後要修改

回到 **商務 → 協議 → 數位服務法** → **編輯**。修改電話或 Email 後要重新驗證，新資料可能需要重新審查。

---

## 參考
- Apple 公告與文件：App Store Connect 說明 → 「Manage European Union Digital Services Act (DSA) trader requirements」
- 社群整理的操作說明（介面可能隨時間調整）：
  - https://median.co/blog/how-to-update-apple-trader-status-app-store-connect
  - https://www.revenuecat.com/blog/growth/am-i-a-trader-and-other-existential-questions-for-developers

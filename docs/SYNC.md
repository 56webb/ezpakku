# 雲端同步設計（提案，尚未實作）

對齊 `DESIGN.md`：有 Supabase／Google 登入後**以雲為準**；不做 JSON 備份匯出。無環境變數時維持本機示範帳號 + `localStorage`。

## 目標

1. 登入後旅程／包包／清單物品／分類／分享可跨裝置看到同一份。
2. 點數、欄位容量、累計天數以雲端 `users` 為準（前端不可直接改）。
3. 短暫離線仍可勾選、改名；恢復網路後再對齊雲端。
4. 登入前在本機建的清單，登入後有明確合併規則，不默默丟資料。

## 建議架構

```
UI → domain 純函式（仍是真相來源的「規則」）
    → sync 層：樂觀更新 local cache → 寫出站（queue）→ Supabase RPC／表
    → localStorage 當快取 + 離線佇列，不是長期唯一來源
```

- **已登入 + Supabase 已設定**：畫面讀「快取狀態」；每次成功 mutation 後排程上傳；啟動／重新連線時 pull。
- **未設定 Supabase／示範帳號**：行為不變，只寫 `localStorage`。
- **Wizard 草稿**：繼續只放 `sessionStorage`，不進雲端。

## 同步單位

以**一整份旅程**為單位（journey + bags + journey_items + journey_categories + 該 journey 的 share）。

- 比「每個勾選一筆 API」簡單，也符合分享「可編輯看到最新整份」的產品語意。
- 需要在 `journeys` 加 `updated_at`（timestamptz，寫入時 bump）。衝突比對用它。

## 登入前本機資料怎麼合併

Google 登入成功後順序：

1. 讀雲端 profile（points、slot_capacity、total_travel_days）。
2. Pull 自己擁有的旅程 + 自己是 `share_members` 的旅程。
3. 掃本機 `localStorage` 裡、目前 session 可對上的「尚未上雲」旅程：
   - **示範帳號時期建的清單**：不自動掛到 Google 帳號（避免旅人甲的測試資料污染正式帳）。畫面提示「本機還有示範清單，可匯入或丟棄」——**第一版可先只提示丟棄／保留在本機示範身份**，不做自動搬。
   - **同一 Google `sub` 已寫在本機、雲端沒有的**（離線新建）：嘗試 `create_journey` 上傳；若欄位已滿，留在「待上傳」佇列並提示加欄位或刪雲端舊清單。
4. 合併後的工作複本寫回 localStorage 快取。

> 裁決提案：第一版**不做「把旅人甲清單一鍵變成我的 Google 清單」**。示範與正式帳分開，減少意外。若你要一鍵搬，再加明確確認 UI。

## 衝突怎麼處理

| 情境 | 規則 |
| --- | --- |
| 兩台都改同一旅程 | **旅程級 Last-Write-Wins**：`updated_at` 較新的整包覆蓋較舊；較舊端下次 pull 被蓋掉，並 toast「已用其他裝置的版本更新」 |
| 本機離線改、雲端也被改 | 上傳前先比 `updated_at`；若雲端較新 → 丟棄本機這次佇列、pull 雲端 |
| 分享可編輯多人同時改 | 同上 LWW；不做欄位級 merge（第一版） |
| 點數／欄位 | 只經 `buy_slot` 等 RPC；本機顯示以 pull 結果為準 |

不做：Operational Transform、CRDT、逐欄位三方合併。

## 離線怎麼辦

1. mutation 先套用 domain → 更新快取 → push 進 `ezpakku-outbox`（localStorage 佇列：`{ id, journeyId, updatedAt, payload, tries }`）。
2. `navigator.onLine` 與 visibility／focus 時 flush。
3. flush 失敗（網路）留佇列；衝突（雲端較新）丟該筆並 pull。
4. UI：離線時狀態列「尚未同步」；佇列非空顯示小點。

刪除：tombstone 或直接 RPC delete；成功後清快取。欄位規則（刪除不退點）仍由雲端／domain 保證。

## 與現有 RPC／RLS 的關係

已有／將用：

- `create_journey`、`buy_slot`、`open_share`、`set_share_permission`
- RLS：`can_view`／`can_edit`（H1–H3 已修）

還缺（實作時新 migration）：

- `journeys.updated_at` + bump trigger
- `upsert_journey_bundle`（security definer）：整包寫入 bags／items／categories，檢查 `can_edit` 與 `updated_at`
- `fetch_my_journeys` 或前端 select（RLS 已可讀）+ 組 bundle
- 可選：Realtime 訂閱 `journeys`／`journey_items`（第二版再加；第一版靠進頁／回前景 pull）

Catalog／`/rymin`：**不同步進使用者旅程**；catalog 另走讀取 API，管理員寫入之後再做。

## 預估改動檔案

| 檔案 | 用途 |
| --- | --- |
| `docs/SYNC.md` | 本設計（已寫） |
| `supabase/migrations/*_journey_sync.sql` | `updated_at`、upsert bundle RPC |
| `src/lib/sync/client.ts` | pull／push／flush |
| `src/lib/sync/outbox.ts` | 離線佇列 |
| `src/lib/sync/merge.ts` | LWW、登入合併 |
| `src/lib/browser-state.ts` | 快取寫入；佇列 key |
| `src/lib/store.tsx` | 登入後 kick sync；mutation 走 sync |
| `src/lib/domain.ts` | 盡量少改；規則仍本機可測 |
| `src/lib/types.ts` | `updatedAt` 等 |
| `src/components/*` | 少量同步狀態提示 |
| `src/lib/sync/*.test.ts` | merge／LWW 單元測試 |
| `docs/NEXT.md` | 勾掉設計、標實作中 |

**刻意不動（第一版）：** wizard UI、規則引擎、catalog admin、金流。

## 實作切片（確認後才做）

1. Migration：`updated_at` + `upsert_journey_bundle`
2. Pull + 登入後置換快取（先不做離線佇列，線上直寫）
3. Outbox + 離線 flush + 衝突 toast
4. 示範帳與 Google 帳隔離提示（若需要）
5. 測試：merge／LWW／欄位滿待上傳

## 等你拍板的兩點

1. **示範清單要不要一鍵匯入 Google 帳？** 提案＝不要，只要明確提示。
2. **衝突策略 LWW 整包可接受嗎？** 提案＝可；不做細粒度合併。

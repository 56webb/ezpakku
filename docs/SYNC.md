# 雲端同步設計

對齊 `DESIGN.md`：有 Supabase／Google 登入後**以雲為準**；不做 JSON 備份匯出。

## 已拍板（2026-11-04）

1. **示範帳號**：上線後不用。開發／測試改走 **Google 登入（你自己的測試帳）**。不把旅人甲／乙的本機清單匯入 Google。無 Supabase 環境變數時本機示範帳可暫留方便線框，正式上線拿掉（與 DESIGN 一致）。
2. **同時作業**：同一份旅程偵測到 **兩個以上編輯者** 時，**趕走後到的那個**（先到的繼續編；後到的不能寫）。不做多人也同時改、也不做欄位級合併。

## 目標

1. 登入後旅程／包包／清單物品／分類／分享可跨裝置看到同一份。
2. 點數、欄位容量、累計旅行天數以雲端 `users` 為準。
3. 短暫離線仍可勾選、改名；恢復網路後再對齊（僅限**持有編輯鎖**的那一端）。
4. 示範清單不進正式帳；Google 帳離線新建的才進待上傳佇列。

## 架構

```
UI → domain 純函式
   → sync：樂觀更新快取 →（有編輯鎖才）outbox → Supabase
   → localStorage＝快取 + 離線佇列（已登入時）
```

- **已登入 + Supabase**：快取 + pull／push；寫入前要有編輯鎖。
- **未設定 Supabase**：只 `localStorage`（含暫留示範帳）。
- **Wizard 草稿**：仍只 `sessionStorage`。

## 同步單位

整份旅程（journey + bags + journey_items + journey_categories + share 設定）。

- `journeys.updated_at`：寫入 bump；上傳前比對，避免用過期離線稿蓋雲端。
- 持鎖者單線寫入，正常情況不該出現雙寫衝突；`updated_at` 當保險。

## 登入與本機資料

Google 登入後：

1. 拉雲端 profile（points、slot_capacity、total_travel_days）。
2. Pull 自己擁有的 + 自己是 `share_members` 的旅程進快取。
3. **不**搬移示範帳旅程。
4. 同一 Google `sub` 離線新建、雲端尚無的 → 試 `create_journey`；欄位滿則待上傳並提示。

## 編輯鎖（趕走後者）

對象：**同一 `journey_id` 的寫入權**（擁有者或可編輯分享成員都算「編輯者」）。

| 規則 | 說明 |
| --- | --- |
| 鎖內容 | `journey_id`、`holder_user_id`、`holder_session_id`、`heartbeat_at` |
| 取得 | 進入清單並要寫入（或一進可編輯頁）時 `acquire_edit_lock`；成功才允許 mutation／outbox |
| 先到 | 鎖有效（心跳未過期）→ 繼續編 |
| 後到 | 取得失敗 → **踢掉**：不可寫入；可改為唯讀看快取，並提示「其他人正在編輯這份清單」 |
| 心跳 | 持鎖端約每 15–30 秒續命；頁面關閉／登出／逾時（例如 60–90 秒無心跳）釋放 |
| 誰算「後者」 | 鎖已被別人（不同 user，或同 user 不同 session）持有時，再來搶鎖的一方 |
| 擁有者特權？ | **第一版沒有**：先到先贏。若你要「主人可強制踢人」之後再加 |
| 唯讀分享 | 本來就不能寫，不搶鎖 |

與舊文案差異：可編輯分享仍是「同一份資料」，但**同時只允許一人改**；其他人看或等鎖釋放。

實作：新表 `journey_edit_locks`（或 journeys 上的鎖欄位）+ RPC `acquire_edit_lock`／`renew_edit_lock`／`release_edit_lock`（security definer）。Realtime 可選，用來立刻通知後者被踢；第一版輪詢心跳結果也可。

## 離線

1. **僅持鎖者**可把 mutation 進 outbox。
2. 上線 flush；若 `updated_at` 雲端較新 → 丟該筆、pull、提示。
3. 離線過久心跳斷了 → 鎖被別人拿走 → 本地佇列作廢並提示。

## 還缺的 migration／模組

- `journeys.updated_at` + bump  
- `journey_edit_locks` + acquire／renew／release  
- `upsert_journey_bundle`（持鎖 + can_edit + updated_at）  
- `src/lib/sync/*`（client、outbox、lock）  
- store 接入；清單頁鎖狀態 UI  

Catalog／`/rymin` 不走這套。

## 實作切片（可開工）

1. Migration：`updated_at` + 編輯鎖 RPC  
2. 登入 pull + 快取置換  
3. 進清單搶鎖／心跳／後者唯讀提示  
4. 線上直寫 bundle；再加 outbox  
5. 測試：鎖互斥、逾時釋放、示範不匯入  

## 預估檔案

`supabase/migrations/*_journey_sync.sql`、`src/lib/sync/*`、`browser-state.ts`、`store.tsx`、`types.ts`、清單相關 component、`docs/NEXT.md`。

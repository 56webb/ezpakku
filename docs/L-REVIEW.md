# EZpakku 架構健檢（L 的意見，只給建議，沒改任何程式碼）

> 審查對象：`main` 分支 commit `422dae9`（2026-11-04）。這份檔案只放在 `review/l-architecture` 分支，不會進 main。
> 行號以該 commit 為準。不確定的地方我會直接寫「不確定」。

## 1. 整體評價

**地基打得不錯，可以繼續往上蓋；但「雲端同步」其實還沒接上，資料庫權限有 2 個會出事的 bug，要在接雲端前先修。**

- 技術選型：Next.js 16（App Router）+ React 19 + Tailwind 4 + Supabase（只接了 Google 登入）+ MapLibre。
  注意：這跟舊 prototype（56webb/packing-list 用 Astro）不同，目前主專案是 **Next.js**，部署目標看 README 是 Vercel（`https://ezpakku.vercel.app`）。
- 現況：所有旅程資料都存在瀏覽器 localStorage（`src/lib/browser-state.ts`），Supabase 目前只負責登入。`supabase/migrations/` 寫好了完整的資料表和權限，但前端**還沒有任何一行去讀寫這些表**（全專案搜尋不到 `.from(` 或 `.rpc(`）。
- 規模：約 5,300 行 TS/TSX，3 個 commit，沒有測試、沒有 CI。

## 2. 做得好的地方

1. **規格文件很完整**：`DESIGN.md`、`UX.md`、`CATALOG.md`、`PAPER-DOLL.md`、`.cursor/rules/ezpakku.mdc` 把產品規則寫清楚，Cursor 每次都會讀到，這對初學者非常加分。
2. **密鑰處理正確**：`.gitignore` 第 34–35 行擋掉所有 `.env*`，只放行 `.env.example`；`.env.example` 只有空的變數名稱。程式只用 publishable/anon key（`src/lib/supabase/env.ts`），沒有 service role 進前端。**我沒有在 repo 裡找到任何密碼、金鑰或個資。**
3. **沒設 Supabase 也能跑**：`isSupabaseConfigured()` 不成立時用示範帳號「旅人甲／乙」（`src/lib/domain.ts` 第 18–26 行），符合「免登入可用」。
4. **資料庫設計有安全意識**：所有表都開 RLS；寫入用 `private` schema 的 `security definer` 函式；`buy_slot` 用單一 UPDATE 加條件扣點，不會被連點重複扣；`safeNext()`（`src/app/auth/callback/route.ts` 第 5–8 行）有擋 open redirect。
5. **登入 cookie 刷新寫法是官方建議的**（`src/proxy.ts` 用 `getClaims()`）。
6. **規則引擎和資料分離**：`src/data/*.json` + `src/lib/rules/generator.ts`，之後要改品項不用動畫面。

## 3. 風險／問題（依嚴重度排序）

### 🔴 高

**H1. 「改成唯讀分享」一定會失敗**
`supabase/migrations/20261028170519_init_packing.sql` 第 477 行：
`delete from public.share_members where share_id = share_id;`
函式裡有一個叫 `share_id` 的變數，又有一個同名欄位。PL/pgSQL 預設會直接報錯「ambiguous column reference」，所以把分享改成 read_only 時整個函式會失敗。（就算不報錯，`share_id = share_id` 也永遠成立，會刪掉**所有人**的分享成員。）

**H2. 唯讀分享的人其實看不到清單**
同檔第 427 行：只有 `editable` 才把開連結的人加進 `share_members`；而讀取權限 `private.can_edit()`（約第 220–240 行）只認「擁有者」或「editable 成員」。結果：唯讀連結的人通過 RLS 後什麼都讀不到。需要另一個「can_view」規則。

**H3. 被分享可編輯的人，可以把旅程「搶」成自己的**
同檔第 574 行 `grant select, update, delete on table public.journeys to authenticated;` 加上第 591 行 `journeys_update` 只檢查 `can_edit`。可編輯成員能直接 `update journeys set user_id = 自己`，等於偷走別人的清單，也能繞過欄位數上限；也能改 `is_ended` 等欄位。應該限制「可以改哪些欄位」。

### 🟠 中

**M1. 雲端同步還沒做，但 UI／文件可能讓人以為有**：資料只在 localStorage（`src/lib/browser-state.ts` 第 14、49 行）。換手機或清快取就不見。要決定「先上線純本機版」還是「同步做完才上線」。

**M2. `/rymin` 管理頁沒有任何權限檢查**：`src/app/rymin/page.tsx` 直接回傳 `<AdminScreen />`。目前它只改瀏覽器本機的 catalog（`src/lib/catalog/local.ts`），所以**現在不危險**；但之後接上 Supabase 時，要在伺服器端檢查 `is_admin`，並加 `noindex`。

**M3. 點數沒有任何「賺點」途徑**：`users.points` 只有 `buy_slot` 會扣，資料庫沒有加點的函式。之後要加點，一定要在 `private` 函式裡做，不能讓前端直接改（目前 users 只給 select，這點是對的）。

**M4. journey_items 可以指到別的旅程的包包**：`journey_items.bag_id` 只參照 `bags(id)`，沒檢查那個包包屬於同一個旅程（同檔 journey_items 建表段）。不確定前端會不會觸發，但資料庫層沒擋。

**M5. 沒有測試、沒有 CI**：`package.json` 只有 dev/build/start/lint；沒有 `.github/workflows`。規則引擎（`src/lib/rules/generator.ts`）和欄位／點數規則（`src/lib/domain.ts` 677 行）最需要單元測試。

### 🟡 低

**L1. 大檔案**：`src/components/wizard-screen.tsx` 1,076 行、`admin-screen.tsx` 1,006 行、`src/lib/domain.ts` 677 行。Cursor 改大檔容易改壞別的地方，建議拆小。
**L2. 全部畫面都是 `"use client"`**（11 個 component 全部），SEO 和首屏速度吃虧；部落格／介紹頁應該用伺服器渲染。
**L3. SEO 幾乎空白**：只有 `src/app/layout.tsx` 第 22 行的 title/description；沒有 `robots`、`sitemap`、OG 圖，各頁沒有自己的 metadata。preview 環境也沒看到 noindex 設定。
**L4. i18n 還沒準備**：沒有 `[locale]` 路由也沒有翻譯檔，字串直接寫在 component 裡；`lang="zh-Hant"`（建議 `zh-Hant-TW`）。若確定要多語，越早抽字串越便宜。
**L5. Demo 範例聯盟連結**：init migration 第 680–686 行有 `https://example.com/go/...`，上線前要換掉或清空，並在畫面標示「聯盟連結」。
**L6. `next.config.ts` 第 4 行 `allowedDevOrigins: ["*.trycloudflare.com"]`**：只影響開發模式，無害，但不用時可以拿掉。
**L7. 小規格**：`journeys.is_ended` 只在寫入時更新（migration 自己的註解有說），前端要自己再比日期；預設 Next 範例圖（`public/next.svg` 等）可刪。

## 4. 建議改法（每項附可直接貼給 Cursor 的 prompt）

> 建議每個項目開一個新分支、一個 PR，不要一次改全部。資料庫修改請**新增一個 migration**，不要改舊的 migration 檔。

**修 H1**
```
在 supabase/migrations 新增一個 migration，重新 create or replace private.set_share_permission：
把變數 share_id 改名成 v_share_id（宣告和所有使用處都改），刪除語句改成
delete from public.share_members where share_members.share_id = v_share_id;
其他邏輯不要動。改完說明你改了哪幾行。
```

**修 H2**
```
在新 migration 新增 private.can_view(target_journey uuid)：擁有者、或 shares 中 journey_id 相符的分享（read_only 或 editable）的參與者可以讀。
open_share 不論權限都把開啟者加進 share_members（加一個 role 欄位或沿用 permission 判斷可否編輯）。
journeys / bags / journey_categories / journey_items 的 SELECT policy 改用 can_view，INSERT/UPDATE/DELETE 仍用 can_edit。
請拆成分開的 policy（for select / for insert / for update / for delete），不要用 for all。寫出測試 SQL 證明唯讀者能讀不能寫。
```

**修 H3**
```
在新 migration：revoke update on public.journeys from authenticated;
改成只授權可改的欄位：grant update (name, location, purpose, days, start_date, end_date) on public.journeys to authenticated;
並加 trigger 擋 user_id、mode 被修改（mode 依 DESIGN.md 規定不能切換）。說明哪些欄位可改、為什麼。
```

**M1（先決定方向，再請 Cursor 做）**
```
讀 DESIGN.md 和 src/lib/store.tsx、src/lib/browser-state.ts。先不要寫程式，
幫我列出「把 localStorage 資料同步到 Supabase」的設計方案：登入前的本機資料怎麼合併、衝突怎麼處理、離線怎麼辦，
並估計要改哪些檔案。等我確認後再實作。
```

**M2**
```
/rymin 頁加上保護：伺服器端用 src/lib/supabase/server.ts 取得使用者，查 public.users.is_admin，
不是管理員就 notFound()。頁面 metadata 加 robots: { index: false, follow: false }。沒設 Supabase 時（本機開發）保持現在行為。
```

**M5**
```
加入 Vitest，為 src/lib/rules/generator.ts 和 src/lib/domain.ts 寫單元測試，
涵蓋：欄位上限、100 點換一格、刪除不退點、累計天數計算、建立旅程必有出發日。
再新增 .github/workflows/ci.yml：push 和 PR 時跑 npm ci、npm run lint、npx tsc --noEmit、npm test、npm run build。
```

**L1**
```
把 src/components/wizard-screen.tsx 依步驟拆成 src/components/wizard/ 底下多個檔案，每檔不超過 250 行，
行為完全不變，只做搬移和抽 component。拆完跑 npm run build 確認沒壞。
```

**L3**
```
新增 src/app/robots.ts 和 src/app/sitemap.ts。preview（VERCEL_ENV !== 'production'）時 robots 全部 disallow。
每個 page.tsx 加自己的 metadata（title、description、openGraph）。/rymin、/login、/share/[token] 設 noindex。
```

**L4**
```
先不要加多語系路由。把畫面上寫死的中文字串抽到 src/i18n/zh-TW.ts，component 改從那裡讀，
html lang 改成 zh-Hant-TW。每次只改一個畫面檔案。
```

## 5. 優先順序清單

1. **H1、H2、H3**（資料庫權限，一個 migration PR 一起修，接雲端前必修）
2. **M5** 測試 + CI（之後每次改都安心）
3. **M1** 決定同步策略並實作
4. **M2** /rymin 權限（跟 M1 一起，接 Supabase 時必做）
5. **L3** SEO / noindex、**L5** 換掉 example.com 連結（上線前必做）
6. **L1、L2、L4** 重構與多語（有空再做）
7. M3、M4、L6、L7 順手修

—— L

---

## 2026-11-04 複查（權限問題 H1/H2/H3）

**結論：3 個問題都已修好**（修在 `supabase/migrations/20261104070000_fix_share_rls.sql`，不是 `sync_hardening.sql`）。只看程式碼，沒有實際對資料庫跑過，建議上線前在 Supabase 測試環境跑一次。

| 問題 | 狀態 | 證據 |
|---|---|---|
| H1 `share_id` 變數和欄位同名 | ✅ 已修 | `fix_share_rls.sql:78` 變數改名 `v_share_id`，`:105` 刪除時寫全名 `public.share_members.share_id` |
| H2 唯讀連結的人看不到清單 | ✅ 已修 | `:7-27` 新增 `can_view`（擁有者或任何成員）；`:52-56` 打開連結一律加為成員；`:114-162` 讀取改用 `can_view`、寫入仍用 `can_edit`（init `:236` 會檢查 `permission = 'editable'`，唯讀的人不能改） |
| H3 編輯者可把旅程擁有者改成自己 | ✅ 已修 | `:165-166` 只開放改名稱/地點/目的/天數/日期；`:168-191` trigger 擋下改 `user_id`、`mode`、`id` |

### 新發現（依重要度）

1. **免費點數可以無限領**（`sync_hardening.sql:23`）：每次最多 100 點，但沒有次數限制，一直呼叫就能無限累積。現在是示範期沒關係，**接金流前一定要改**。
2. **`/rymin` 在沒設定 Supabase 時完全不擋**（`src/app/rymin/page.tsx:15-28`）：本機開發方便，但如果正式站環境變數漏設，後台就對所有人開放。有登入時的檢查是對的（`:18-22` 讀自己的 `is_admin`，`users` 表只開放 select，使用者改不了自己的 `is_admin`）。
3. **改成唯讀時，原本唯讀的人也被踢掉**（`fix_share_rls.sql:103-106`）：會刪掉全部成員，之前的人要重開一次連結才看得到。不是漏洞，比較像體驗問題；另外連結 token 不會換，被降級的編輯者重開連結仍可唯讀觀看，如果想「真正收回」要加一個「重設連結」功能。

其他：所有 SECURITY DEFINER 函式都有 `set search_path`，也都有檢查 `auth.uid()`；同步 RPC（`journey_sync.sql:189、:65`）都會先檢查 `can_edit` 和編輯鎖。沒看到新的 RLS 漏洞。

### 貼給 Cursor 的指令

**(A) 點數上限（接金流前必做）**
```
supabase/migrations/20261104170000_sync_hardening.sql 的 private.grant_points 讓非 admin 每次領 100 點但沒有次數限制，可無限累積。請新增一個 migration（不要改舊 migration）：非 admin 只能領一次示範點（例如在 users 加 demo_points_claimed boolean 或記錄到 point_ledger），admin 維持原本上限。前端對應調整錯誤訊息。補 Vitest 或 SQL 測試。開新分支並開 PR，不要直接推 main。
```

**(B) /rymin 在正式環境預設關閉**
```
src/app/rymin/page.tsx 在 isSupabaseConfigured() 為 false 時直接顯示後台。請改成：只有 process.env.NODE_ENV === "development" 才允許未設定 Supabase 時進入，其他情況一律 notFound()。不要動其他功能。開新分支並開 PR，不要直接推 main。
```

**(C)（可選）改唯讀時保留成員、可重設連結**
```
supabase/migrations/20261104070000_fix_share_rls.sql 的 set_share_permission 改成 read_only 時會刪掉所有 share_members，連原本唯讀的人也要重開連結。請新增 migration：改唯讀時不要刪成員（can_edit 已經會檢查 permission）；另外新增 owner 專用的 reset_share_token RPC，換 token 並清空成員，用來真正收回分享。開新分支並開 PR，不要直接推 main。
```

---

## 2026-11-04 CI 失敗分析

**結論：不嚴重，是 CI 步驟順序問題，程式本身大概沒寫錯。**

- 失敗點：`src/app/layout.tsx:33` → `TS2304 Cannot find name 'LayoutProps'`。
- 原因：`LayoutProps` 是 Next.js 16 由 typegen 在 build 時才產生的全域型別（放在 `.next/types`），但 CI 在 build 之前先跑 `tsc --noEmit`，那時型別還不存在。
- 今天 3 次 CI 都卡在同一行，後面的測試和 build 都沒跑到。
- 其他提示都只是警告：`<img>` 建議改 `next/image`（`src/components/ui.tsx:60`）、`actions/checkout@v4` 和 `setup-node@v4` 用的 Node 20 即將淘汰、`ubuntu-latest` 版本通知。
- `npm ci` 回報 19 個漏洞（2 個 critical），建議跑一次 `npm audit` 看看。

**(1) 修 CI（必做）**
```
CI 的 typecheck 一直失敗：src/app/layout.tsx(33,50) TS2304 Cannot find name 'LayoutProps'。原因是 LayoutProps/PageProps 是 Next.js 16 由 typegen 產生在 .next/types 的全域型別，而 CI 在 build 之前就跑 tsc --noEmit。請把 package.json 的 "typecheck" 改成 "next typegen && tsc --noEmit"，確認 tsconfig.json 的 include 含有 ".next/types/**/*.ts"（以實際產出路徑為準）。在乾淨環境（刪除 .next 和 next-env.d.ts）跑 npm ci && npm run lint && npm run typecheck && npm test && npm run build 全部通過。不要改 layout.tsx、不要動其他功能。開新分支並開 PR，不要直接推 main。
```

**(2)（可選）清掉警告**
```
請把 .github/workflows 裡的 actions/checkout 和 actions/setup-node 升到支援 Node 24 的版本；把 src/components/ui.tsx:60 的 <img> 改用 next/image 的 <Image />（設好 width/height 或 fill，外部圖片要在 next.config 設 images.remotePatterns）。確認 lint/typecheck/test/build 都通過。開新分支並開 PR，不要直接推 main。
```

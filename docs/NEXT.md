# 接下來做什麼

依 L 架構健檢（`review/l-architecture`／`docs/L-REVIEW.md`，**不進 main**）與 Agent 裁決。技術棧以 **Next.js 16 + React 19** 為準，不是 Astro。資料目前在瀏覽器 `localStorage`；Supabase 先管登入與 schema。

## 已做

- Catalog 後台入口 `/rymin`（本機草稿）
- Catalog schema migration、本機 catalog store
- **H1–H3 分享 RLS 修復** → `supabase/migrations/20261104070000_fix_share_rls.sql`
  - H1：`set_share_permission` 變數改 `v_share_id`，改唯讀不再炸／誤刪全表
  - H2：`can_view`；開連結無論唯讀／可編都進 `share_members`；SELECT 用 `can_view`，寫入仍用 `can_edit`
  - H3：journeys 只允許改名稱／地點／目的／天數／日期；trigger 擋改 `user_id`／`mode`

## 接著做（順序）

1. **測試 + CI（M5）** — Vitest（規則引擎、欄位／點數／天數）+ GitHub Actions（lint／tsc／test／build）
2. **雲端同步策略（M1）** — 先寫設計（合併、衝突、離線），確認後再實作；接寫入前 RLS 已就緒
3. **`/rymin` 管理員鎖（M2）** — 跟雲端 catalog 一起：伺服器查 `is_admin`、`noindex`
4. **上線前** — SEO／robots／sitemap（L3）、換掉 example 導購（L5）
5. **有空再做** — 大檔拆分（L1）、SSR 介紹頁（L2）、抽字串準備 i18n（L4）；M3／M4／L6／L7 順手

## 協作

- Agent 為決策與實作；L 意見經 git 進來，採納與否寫在這裡或 PR 說明，不自動照做。

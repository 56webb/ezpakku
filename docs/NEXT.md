# 接下來做什麼

依 L 架構健檢與 Agent 裁決。技術棧：**Next.js 16 + React 19**。

## 已完成

- Catalog `/rymin`（本機；有 Supabase 時需 `is_admin`，`noindex`）
- H1–H3 分享 RLS + journey sync 鎖／upsert（已套雲端）
- M5 Vitest + CI
- M1 骨架＋尾巴：新建／複製上雲、刪除上雲、衝突 pull、同步狀態列、outbox
- M2：`/rymin` 伺服器 `is_admin` + catalog 雲端讀（失敗 fallback 本機）
- M3：`grant_points` RPC（線框加點走雲端）
- M4：`journey_items` bag 必須同旅程
- L3：robots／sitemap／各頁 metadata；preview disallow
- L4：`src/i18n/zh-TW.ts` 起手、`lang=zh-Hant-TW`
- L5：示意導購文案標明上線前更換
- L6／L7：拿掉 trycloudflare、刪預設 Next SVG

## 還剩（較細）

1. **Realtime** 踢人通知（現在靠進頁搶鎖）
2. **正式金流** 取代示範加點；上線後關非 admin 的 `grant_points` 或改付款 webhook
3. **示範帳** 正式環境完全隱藏（DESIGN：穩定 HTTPS 後拿掉）
4. **L1** wizard／admin／domain 大檔拆分（尚未拆）
5. **L2** 官網真正 SSR 行銷頁（仍是 client + RequireUser）
6. **熱門組合**、導購出現畫面（未定案）
7. Google OAuth 正式審核／上線設定（帳號側）

## 協作

- Agent 決策與實作；L 意見經 git，不自動照做。

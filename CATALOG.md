# Catalog 資料庫

可後台調整的物品／業配／預設箱子／規則。熱門組合之後再做。導購要出現在哪些畫面尚未定案。

## 表

| 表 | 用途 |
| --- | --- |
| `categories` / `items` | 分類與物品（已擴充 template_key、預設包包、數量、標籤、業配） |
| `affiliates` | 業配連結（key、平台、檔期、開關） |
| `item_rules` | 物品出現條件（出國、氣候、類型、行李、電壓、天數） |
| `safety_tags` | 托運／安檢標籤與來源 |
| `bag_presets` + `bag_preset_bags` + `bag_preset_items` | 預設箱子組合 |
| `catalog_meta` | 版本號 |
| `users.is_admin` | 誰能改 catalog |

## 權限

- 登入使用者：讀取上架中的 catalog
- `is_admin = true`：可寫入

## 預覽

營運用：輸入國家／天數／類型／行李方案，模擬會生出哪些包與物品。不是旅人 App 畫面。

## 後台

營運入口：`/rymin`（本機草稿，寫入 `localStorage`）。分頁：物品／業配／預設箱子／規則／預覽。

## 下一步

1. ~~灌入安全標籤、預設兩組箱子、既有物品規則~~
2. ~~後台線框（`/rymin`）~~
3. App 改讀雲端 catalog（失敗才用本機 JSON／localStorage）

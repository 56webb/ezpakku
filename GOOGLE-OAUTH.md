# Google 登入申請步驟

Supabase 專案：`ezpakku`  
專案 URL：`https://qmjuhixpgxevpgaxpaeb.supabase.co`  
Callback（一定要一模一樣）：`https://qmjuhixpgxevpgaxpaeb.supabase.co/auth/v1/callback`

目前 **`https://ezpakku.vercel.app` = 測試站**（還沒正式發佈）。正式網域之後另加。

## 1. Google Cloud Console

1. 打開 https://console.cloud.google.com/apis/credentials
2. 選一個專案，或新建「EZpakku」
3. 「建立憑證」→「OAuth 用戶端 ID」
4. 若第一次，先完成「OAuth 同意畫面」：
   - 使用者類型：外部
   - 應用程式名稱：EZpakku
   - 支援電子郵件：你的 Gmail
   - 授權網域：測試階段可留空；之後有自訂網域再加
   - 測試使用者：先加你自己的 Gmail
5. 應用程式類型：網頁應用程式
6. 名稱：EZpakku Web
7. 已授權的 JavaScript 來源：
   - `http://localhost:3000`
   - `https://ezpakku.vercel.app`（測試站）
8. 已授權的重新導向 URI：
   - `https://qmjuhixpgxevpgaxpaeb.supabase.co/auth/v1/callback`
9. 建立後複製「用戶端 ID」與「用戶端密鑰」

## 2. Supabase Auth

1. 打開 https://supabase.com/dashboard/project/qmjuhixpgxevpgaxpaeb/auth/providers
2. 啟用 Google
3. 貼上 Client ID / Client Secret
4. Site URL（測試期可先用測試站）：
   - `https://ezpakku.vercel.app`
5. Redirect URLs 加入：
   - `http://localhost:3000/auth/callback`
   - `https://ezpakku.vercel.app/auth/callback`
6. 儲存

## 3. 本機

`.env.local` 寫入 URL 與 publishable／anon key。重啟 `npm run dev` 後，登入頁會出現「使用 Google 帳號登入」。

## 4. 測試站（ezpakku.vercel.app）

還沒正式發佈，這台 Vercel 網址當測試用：

1. Vercel 專案環境變數設好 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（或 `ANON_KEY`）
2. 上面 Google／Supabase 已含測試站網域
3. 重新部署後開 https://ezpakku.vercel.app/login 試 Google 登入

示範帳「旅人甲／乙」測試期可留著；**真的正式發佈**（自訂網域／對外）時再拿掉，並把 Site URL、JS 來源改成正式網域。

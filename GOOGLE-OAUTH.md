# Google 登入申請步驟

Supabase 專案：`ezpakku`  
專案 URL：`https://qmjuhixpgxevpgaxpaeb.supabase.co`  
Callback（一定要一模一樣）：`https://qmjuhixpgxevpgaxpaeb.supabase.co/auth/v1/callback`

## 1. Google Cloud Console

1. 打開 https://console.cloud.google.com/apis/credentials
2. 選一個專案，或新建「EZpakku」
3. 「建立憑證」→「OAuth 用戶端 ID」
4. 若第一次，先完成「OAuth 同意畫面」：
   - 使用者類型：外部
   - 應用程式名稱：EZpakku
   - 支援電子郵件：你的 Gmail
   - 授權網域先可留空；正式網域之後再加
   - 測試使用者：先加你自己的 Gmail
5. 應用程式類型：網頁應用程式
6. 名稱：EZpakku Web
7. 已授權的 JavaScript 來源：
   - `http://localhost:3000`
   - （之後正式網域再加）
8. 已授權的重新導向 URI：
   - `https://qmjuhixpgxevpgaxpaeb.supabase.co/auth/v1/callback`
9. 建立後複製「用戶端 ID」與「用戶端密鑰」

## 2. Supabase Auth

1. 打開 https://supabase.com/dashboard/project/qmjuhixpgxevpgaxpaeb/auth/providers
2. 啟用 Google
3. 貼上 Client ID / Client Secret
4. Site URL 先設 `http://localhost:3000`
5. Redirect URLs 加入：
   - `http://localhost:3000/auth/callback`
6. 儲存

## 3. 本機

`.env.local` 已寫入 URL 與 publishable／anon key。重啟 `npm run dev` 後，登入頁會出現「使用 Google 帳號登入」。

正式上線後，把 Site URL、JavaScript 來源、Redirect URLs 改成穩定 HTTPS 網域，再拿掉示範帳號。

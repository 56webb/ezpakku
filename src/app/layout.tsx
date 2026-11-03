import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_TC } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const instant = false;

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const noto = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EZpakku",
  description: "手機優先的旅行打包清單",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${manrope.variable} ${noto.variable}`}>
      <body style={{ fontFamily: "var(--font-manrope), var(--font-noto), sans-serif" }}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}

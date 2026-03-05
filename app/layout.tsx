import type { Metadata } from "next";
import { M_PLUS_1p } from "next/font/google";
import "./globals.css";

// M PLUS 1pフォントの設定
const mPlus1p = M_PLUS_1p({
  weight: ["400", "500", "700", "800"], // 必要な文字の太さを指定
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "よいゆめ 歌データベース",
  description: "よいゆめの歌唱・配信データベース",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      {/* bodyタグにフォントのクラスを適用 */}
      <body className={`${mPlus1p.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
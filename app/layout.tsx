import type { Metadata } from "next";
import { IBM_Plex_Sans_JP } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const ibmPlexSansJp = IBM_Plex_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "よいゆめの歌と演奏を探せるページ │ 非公式ファンサイト",
  description: "にじさんじ所属バンドユニット「今宵、××と夢を見る。」（十河ののは・夜牛詩乃・蝸堂みかる・猫屋敷美紅）の歌枠セトリ・歌ってみた・バンド演奏を曲名やメンバーから探せる非公式ファンデータベースです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={ibmPlexSansJp.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
import { client, Performance } from "@/lib/microcms";
import ClientSongList from "./components/ClientSongList";
import Link from "next/link"; // Linkコンポーネントを追加

async function getPerformances() {
  const data = await client.getList<Performance>({
    endpoint: "performances",
    queries: { limit: 100 },
  });
  return data.contents;
}

export default async function Home() {
  const performances = await getPerformances();

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-gray-800">
      <header className="mb-8 max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-indigo-900 drop-shadow-sm tracking-tight">
          よいゆめ 歌データベース
        </h1>
        {/* 配信一覧へのリンク */}
        <Link href="/videos" className="bg-white border-2 border-indigo-100 text-indigo-700 px-5 py-2.5 rounded-full font-bold shadow-sm hover:bg-indigo-50 transition">
          📺 配信一覧を見る
        </Link>
      </header>

      <ClientSongList initialPerformances={performances} />
    </main>
  );
}
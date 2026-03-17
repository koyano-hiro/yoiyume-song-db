import { client, Performance, Video } from "@/lib/microcms";
import ClientSongList from "./components/ClientSongList";

// ▼ここを追記：キャッシュを無効化し、常に最新のデータを取得する設定▼
export const dynamic = "force-dynamic";

// microCMSは1回のリクエストで最大100件まで。全件取得するためにページネーションする
async function fetchAll<T>(endpoint: string, queries?: Record<string, unknown>): Promise<T[]> {
  const limit = 100;
  let offset = 0;
  let allContents: T[] = [];

  while (true) {
    const data = await client.getList<T>({
      endpoint,
      queries: { ...queries, limit, offset },
    });
    allContents = [...allContents, ...data.contents];

    if (allContents.length >= data.totalCount) break;
    offset += limit;
  }

  return allContents;
}

async function getInitialData() {
  const [performances, videos] = await Promise.all([
    fetchAll<Performance>("performances"),
    fetchAll<Video>("videos", { orders: "-streamingDate" }),
  ]);
  return { performances, videos };
}

export default async function Home() {
  const { performances, videos } = await getInitialData();

  return (
    <main>
      <ClientSongList initialPerformances={performances} initialVideos={videos} />
    </main>
  );
}

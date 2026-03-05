import { client, Performance, Video } from "@/lib/microcms";
import ClientSongList from "./components/ClientSongList";

async function getInitialData() {
  const [performancesData, videosData] = await Promise.all([
    client.getList<Performance>({ endpoint: "performances", queries: { limit: 100 } }),
    client.getList<Video>({ endpoint: "videos", queries: { limit: 100, orders: "-streamingDate" } }),
  ]);
  return {
    performances: performancesData.contents,
    videos: videosData.contents
  };
}

export default async function Home() {
  const { performances, videos } = await getInitialData();

  return (
    <main>
      <ClientSongList initialPerformances={performances} initialVideos={videos} />
    </main>
  );
}
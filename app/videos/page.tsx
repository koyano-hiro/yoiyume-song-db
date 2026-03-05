import { client, Performance, Video } from "@/lib/microcms";
import Link from "next/link";

// 動画一覧と歌唱記録を両方取得する
async function getVideosAndPerformances() {
  const [videosData, performancesData] = await Promise.all([
    client.getList<Video>({ endpoint: "videos", queries: { limit: 100, orders: "-streamingDate" } }),
    client.getList<Performance>({ endpoint: "performances", queries: { limit: 100 } }),
  ]);
  return { videos: videosData.contents, performances: performancesData.contents };
}

export default async function VideosPage() {
  const { videos, performances } = await getVideosAndPerformances();

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-gray-800">
      <header className="mb-8 text-center max-w-4xl mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-700">📺 配信・動画一覧</h1>
        <Link href="/" className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full font-bold hover:bg-indigo-200 transition">
          ← 曲検索に戻る
        </Link>
      </header>

      <div className="max-w-4xl mx-auto grid gap-8">
        {videos.map((video) => {
          // この動画に紐づく歌唱記録を抽出
          const relatedPerformances = performances.filter(p => p.video.id === video.id);

          return (
            <div key={video.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row gap-6">

                {/* 動画情報エリア */}
                <div className="w-full md:w-1/3">
                  {video.isArchived ? (
                    <div className="aspect-video w-full rounded-lg overflow-hidden mb-3">
                      <iframe
                        src={`https://www.youtube.com/embed/${video.youtubeId}`}
                        title={video.title}
                        className="w-full h-full"
                        allowFullScreen
                      ></iframe>
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                      <span className="text-gray-500 font-bold">アーカイブ非公開</span>
                    </div>
                  )}
                  <h2 className="text-lg font-bold text-gray-800 leading-tight">{video.title}</h2>
                  <p className="text-sm text-gray-500 mt-2">📅 {new Date(video.streamingDate).toLocaleDateString()}</p>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {video.type.map(t => (
                      <span key={t} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">{t}</span>
                    ))}
                  </div>
                </div>

                {/* この動画で歌った曲リストエリア */}
                <div className="w-full md:w-2/3">
                  <h3 className="font-bold text-slate-700 border-b pb-2 mb-3">🎵 セットリスト ({relatedPerformances.length}曲)</h3>
                  {relatedPerformances.length > 0 ? (
                    <ul className="space-y-2">
                      {relatedPerformances.sort((a, b) => (a.startSeconds || 0) - (b.startSeconds || 0)).map(perf => (
                        <li key={perf.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div>
                            <p className="font-bold text-sm text-gray-800">{perf.song.title}</p>
                            <p className="text-xs text-gray-500">{perf.song.artist}</p>
                          </div>
                          {perf.startSeconds && video.isArchived && (
                            <a
                              href={`https://youtu.be/${video.youtubeId}?t=${perf.startSeconds}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-white bg-red-400 px-3 py-1.5 rounded-full hover:bg-red-500 transition whitespace-nowrap"
                            >
                              ▶ {Math.floor(perf.startSeconds / 60)}:{String(perf.startSeconds % 60).padStart(2, "0")}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic">歌唱記録が登録されていません</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
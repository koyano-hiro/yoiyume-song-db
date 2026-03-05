"use client";

import { useState, useEffect, useCallback } from "react";
import { Performance } from "@/lib/microcms";

// メンバーの定義に、タグ用・選択時・非選択時（ホバー含む）のクラスを明記する
const MEMBERS = [
  {
    name: "十河ののは",
    emoji: "🦎",
    tagClass: "border-green-300 text-green-700 bg-green-50",
    activeClass: "border-green-400 text-green-800 bg-green-100 ring-2 ring-green-300 ring-offset-1 scale-105",
    inactiveClass: "bg-white text-gray-500 border-gray-200 hover:bg-green-50 hover:border-green-300 hover:text-green-700",
  },
  {
    name: "夜牛詩乃",
    emoji: "🔮",
    tagClass: "border-purple-300 text-purple-700 bg-purple-50",
    activeClass: "border-purple-400 text-purple-800 bg-purple-100 ring-2 ring-purple-300 ring-offset-1 scale-105",
    inactiveClass: "bg-white text-gray-500 border-gray-200 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700",
  },
  {
    name: "蝸堂みかる",
    emoji: "🐌",
    tagClass: "border-yellow-300 text-yellow-700 bg-yellow-50",
    activeClass: "border-yellow-400 text-yellow-800 bg-yellow-100 ring-2 ring-yellow-300 ring-offset-1 scale-105",
    inactiveClass: "bg-white text-gray-500 border-gray-200 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700",
  },
  {
    name: "猫屋敷美紅",
    emoji: "💐",
    tagClass: "border-red-300 text-red-500 bg-red-50",
    activeClass: "border-red-400 text-red-600 bg-red-100 ring-2 ring-red-300 ring-offset-1 scale-105",
    inactiveClass: "bg-white text-gray-500 border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-500",
  },
];

type GroupedSong = {
  songId: string;
  title: string;
  artist: string;
  performances: Performance[];
};

export default function ClientSongList({ initialPerformances }: { initialPerformances: Performance[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<string>("全員");
  const [pickup, setPickup] = useState<Performance | null>(null);

  const shufflePickup = useCallback(() => {
    if (initialPerformances.length > 0) {
      const available = initialPerformances.filter(p => p.video.isArchived);
      if (available.length > 0) {
        const randomIndex = Math.floor(Math.random() * available.length);
        setPickup(available[randomIndex]);
      }
    }
  }, [initialPerformances]);

  useEffect(() => {
    shufflePickup();
  }, [shufflePickup]);

  const groupedSongsMap = new Map<string, GroupedSong>();
  initialPerformances.forEach((perf) => {
    if (!perf.song || !perf.video) return;
    const songId = perf.song.id;
    if (!groupedSongsMap.has(songId)) {
      groupedSongsMap.set(songId, {
        songId: songId,
        title: perf.song.title,
        artist: perf.song.artist,
        performances: [],
      });
    }
    groupedSongsMap.get(songId)?.performances.push(perf);
  });

  const groupedSongs = Array.from(groupedSongsMap.values());

  const filteredSongs = groupedSongs.map((group) => {
    const filteredPerformances = group.performances.filter((perf) => {
      if (selectedMember === "全員") return true;
      return perf.singers?.includes(selectedMember);
    });
    return { ...group, performances: filteredPerformances };
  }).filter((group) => {
    const term = searchTerm.toLowerCase();
    const matchText = group.title.toLowerCase().includes(term) || group.artist.toLowerCase().includes(term);
    return group.performances.length > 0 && matchText;
  });

  const renderMemberTags = (singers: string[] | undefined) => {
    if (!singers || singers.length === 0) return <span className="text-gray-400 text-sm">不明</span>;
    return singers.map(singer => {
      const memberDef = MEMBERS.find(m => m.name === singer);
      if (memberDef) {
        return (
          <span key={singer} className={`border px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-sm ${memberDef.tagClass}`}>
            {memberDef.emoji} {singer}
          </span>
        );
      }
      return <span key={singer} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-bold">{singer}</span>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {pickup && (
        <div className="relative p-6 bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-pink-50 rounded-full blur-3xl -z-10 opacity-70"></div>

          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
              <span className="text-2xl">✨</span> PICK UP
            </h2>
            <div className="flex gap-2">
              <button
                onClick={shufflePickup}
                className="bg-gradient-to-r from-indigo-400 to-purple-400 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:opacity-90 transition flex items-center gap-1"
              >
                🔀 シャッフル
              </button>
              <a
                href={createYouTubeUrl(pickup.video.youtubeId, pickup.startSeconds)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-red-600 transition"
              >
                YouTube
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="w-full md:w-1/2 aspect-video rounded-xl overflow-hidden shadow-md">
              <iframe
                src={`https://www.youtube.com/embed/${pickup.video.youtubeId}${pickup.startSeconds ? `?start=${pickup.startSeconds}` : ''}`}
                title="YouTube video player"
                className="w-full h-full"
                allowFullScreen
              ></iframe>
            </div>
            <div className="w-full md:w-1/2 flex flex-col gap-3">
              <h3 className="text-2xl font-bold text-gray-800 leading-tight">{pickup.song.title}</h3>
              <p className="text-gray-500">Original: {pickup.song.artist}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {renderMemberTags(pickup.singers)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* 検索窓に bg-white を追加 */}
        <input
          type="text"
          placeholder="🔍 曲名・アーティスト・ゲスト名で検索..."
          className="w-full bg-white rounded-full border border-gray-200 px-6 py-4 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition shadow-sm text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex flex-wrap justify-center gap-2 md:gap-4">
          {/* ボタンのホバー判定を追加 */}
          {MEMBERS.map(member => (
            <button
              key={member.name}
              onClick={() => setSelectedMember(member.name)}
              className={`border px-4 py-2 rounded-full text-sm md:text-base font-bold flex items-center gap-1 transition-all ${
                selectedMember === member.name ? member.activeClass : member.inactiveClass
              }`}
            >
              {member.emoji} {member.name}
            </button>
          ))}
          <button
            onClick={() => setSelectedMember("全員")}
            className={`px-6 py-2 rounded-full text-sm md:text-base font-bold transition-all ${
              selectedMember === "全員" ? "bg-gray-900 text-white scale-105 shadow-md border border-gray-900" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            全員
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredSongs.map((group) => (
          <div key={group.songId} className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{group.title}</h3>
              <p className="text-sm text-gray-500 mt-1">Original: {group.artist}</p>
            </div>

            <div className="flex flex-col gap-3">
              {group.performances.map((perf) => (
                <div key={perf.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl">

                  <div className="flex flex-wrap gap-2 items-center">
                    {renderMemberTags(perf.singers)}
                    {perf.collaborators && (
                      <span className="text-sm font-bold text-gray-600 border border-gray-300 rounded-full px-3 py-1 bg-white">
                        🤝 With: {perf.collaborators}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col text-right text-xs text-gray-500">
                      <span className="font-semibold text-gray-700 line-clamp-1 max-w-[200px]">{perf.video.title}</span>
                      <span>{new Date(perf.video.streamingDate).toLocaleDateString()}</span>
                    </div>
                    {perf.video.isArchived ? (
                      <a
                        href={createYouTubeUrl(perf.video.youtubeId, perf.startSeconds)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-red-500 px-5 py-2 text-sm font-bold text-white hover:bg-red-600 transition shadow-sm whitespace-nowrap"
                      >
                        ▶ 再生 {perf.startSeconds ? `(${formatTime(perf.startSeconds)})` : ""}
                      </a>
                    ) : (
                      <span className="rounded-full bg-gray-300 px-5 py-2 text-sm font-bold text-white whitespace-nowrap">
                        非公開
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function createYouTubeUrl(youtubeId: string, startSeconds?: number) {
  const baseUrl = `https://youtu.be/${youtubeId}`;
  if (startSeconds && startSeconds > 0) return `${baseUrl}?t=${startSeconds}`;
  return baseUrl;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
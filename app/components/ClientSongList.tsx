"use client";

import { useState, useEffect, useCallback } from "react";
import { Performance, Video } from "@/lib/microcms";
import Image from "next/image";

type CustomPerformance = Performance & { collaborators?: string };

const MEMBERS = [
  {
    name: "十河ののは",
    emoji: "🦎",
    tagClass: "bg-green-50 outline-green-300 text-green-700",
    activeClass: "bg-green-100 outline-green-400 text-green-900 shadow-inner",
    inactiveClass: "bg-white outline-zinc-200 text-indigo-900",
  },
  {
    name: "夜牛詩乃",
    emoji: "💮",
    tagClass: "bg-purple-50 outline-purple-300 text-violet-700",
    activeClass: "bg-purple-100 outline-purple-400 text-purple-900 shadow-inner",
    inactiveClass: "bg-white outline-zinc-200 text-indigo-900",
  },
  {
    name: "蝸堂みかる",
    emoji: "🐌",
    tagClass: "bg-yellow-50 outline-amber-300 text-yellow-700",
    activeClass: "bg-yellow-100 outline-yellow-400 text-yellow-900 shadow-inner",
    inactiveClass: "bg-white outline-zinc-200 text-indigo-900",
  },
  {
    name: "猫屋敷美紅",
    emoji: "💐",
    tagClass: "bg-rose-50 outline-red-400 text-red-500",
    activeClass: "bg-red-100 outline-red-400 text-red-900 shadow-inner",
    inactiveClass: "bg-white outline-zinc-200 text-indigo-900",
  },
];

const VIDEO_TYPES = ["歌枠(配信)", "歌ってみた", "弾いてみた", "ライブ", "オリジナル", "その他"];

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

type GroupedSong = {
  songId: string;
  title: string;
  artist: string;
  performances: CustomPerformance[];
};

export default function ClientSongList({
  initialPerformances,
  initialVideos
}: {
  initialPerformances: CustomPerformance[];
  initialVideos: Video[];
}) {
  const [activeTab, setActiveTab] = useState<'songs' | 'videos'>('songs');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [pickup, setPickup] = useState<CustomPerformance | null>(null);
  const [isFading, setIsFading] = useState(false);

  const handleTabChange = (tab: 'songs' | 'videos') => {
    setActiveTab(tab);
    setSearchTerm("");
    setSelectedYear("");
    setSelectedMonth("");
    setSelectedMembers([]);
    setSelectedType("");
  };

  const availableYears = Array.from(new Set(initialVideos.map(v => new Date(v.streamingDate).getFullYear().toString()))).sort((a, b) => b.localeCompare(a));
  const availableMonths = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  const shufflePickup = useCallback(() => {
    if (initialPerformances.length > 0) {
      const available = initialPerformances.filter(p => p.video.isArchived);
      if (available.length > 0) {
        setIsFading(true);
        setTimeout(() => {
          const randomIndex = Math.floor(Math.random() * available.length);
          setPickup(available[randomIndex]);
          setIsFading(false);
        }, 300);
      }
    }
  }, [initialPerformances]);

  useEffect(() => {
    shufflePickup();
  }, [shufflePickup]);

  const toggleMember = (memberName: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberName) ? prev.filter((m) => m !== memberName) : [...prev, memberName]
    );
  };

  const groupedSongsMap = new Map<string, GroupedSong>();
  initialPerformances.forEach((perf) => {
    if (!perf.song || !perf.video) return;
    const songId = perf.song.id;
    if (!groupedSongsMap.has(songId)) {
      groupedSongsMap.set(songId, { songId, title: perf.song.title, artist: perf.song.artist, performances: [] });
    }
    groupedSongsMap.get(songId)?.performances.push(perf);
  });
  const groupedSongs = Array.from(groupedSongsMap.values());

  const filteredSongs = groupedSongs.map((group) => {
    const filteredPerformances = group.performances.filter((perf) => {
      const matchMember = selectedMembers.length === 0 || selectedMembers.every(m => perf.singers?.includes(m));
      const matchType = selectedType === "" || perf.video.type?.includes(selectedType);
      return matchMember && matchType;
    });
    return { ...group, performances: filteredPerformances };
  }).filter((group) => {
    const term = searchTerm.toLowerCase();
    const matchText = term === "" ||
      group.title.toLowerCase().includes(term) ||
      group.artist.toLowerCase().includes(term) ||
      group.performances.some(p =>
        p.singers?.some(s => s.toLowerCase().includes(term)) ||
        p.collaborators?.toLowerCase().includes(term) ||
        p.video.title.toLowerCase().includes(term) ||
        p.video.channel?.name?.toLowerCase().includes(term)
      );
    return group.performances.length > 0 && matchText;
  });

  const filteredVideos = initialVideos.filter((video) => {
    let matchMember = true;
    if (selectedMembers.length > 0) {
      matchMember = selectedMembers.every((m) => {
        const isChannelMatch = video.channel?.name === m;
        const relatedPerformances = initialPerformances.filter((p) => p.video.id === video.id);
        const isSingerMatch = relatedPerformances.some((p) => p.singers?.includes(m));
        return isChannelMatch || isSingerMatch;
      });
    }
    const matchType = selectedType === "" || video.type?.includes(selectedType);

    let matchYear = true;
    let matchMonth = true;
    const d = new Date(video.streamingDate);
    if (selectedYear !== "") matchYear = d.getFullYear().toString() === selectedYear;
    if (selectedMonth !== "") matchMonth = (d.getMonth() + 1).toString() === selectedMonth;

    const term = searchTerm.toLowerCase();
    const relatedPerfs = initialPerformances.filter(p => p.video.id === video.id);
    const matchText = term === "" ||
      video.title.toLowerCase().includes(term) ||
      video.channel?.name?.toLowerCase().includes(term) ||
      relatedPerfs.some(p =>
        p.song.title.toLowerCase().includes(term) ||
        p.song.artist.toLowerCase().includes(term) ||
        p.singers?.some(s => s.toLowerCase().includes(term)) ||
        p.collaborators?.toLowerCase().includes(term)
      );

    return matchMember && matchType && matchYear && matchMonth && matchText;
  });

  const renderMemberTags = (singers: string[] | undefined) => {
    if (!singers || singers.length === 0) return null;
    return singers.map(singer => {
      const memberDef = MEMBERS.find(m => m.name === singer);
      if (memberDef) {
        return (
          <div key={singer} className={`px-1.5 py-1 rounded-[120px] outline outline-1 outline-offset-[-1px] flex justify-center items-center gap-2 shadow-sm ${memberDef.tagClass}`}>
            <div className="text-center justify-start text-[10px] md:text-xs font-bold leading-3">
              {memberDef.emoji} {singer}
            </div>
          </div>
        );
      }
      return (
        <div key={singer} className="px-1.5 py-1 bg-slate-50 rounded-[120px] outline outline-1 outline-offset-[-1px] outline-slate-300 shadow-sm flex items-center gap-1">
          <div className="text-center text-[10px] md:text-xs font-bold text-slate-700">🤝 {singer}</div>
        </div>
      );
    });
  };

  return (
    // フッターに被らないよう pb-28 に変更
    <div className="min-h-screen bg-gray-200 pb-28 relative overflow-x-hidden">

      <div className="absolute top-0 left-0 w-full h-[450px] md:h-[500px]">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-indigo-900"></div>
        <img src="https://placehold.co/1200x600/1e1b4b/4c1d95?text=Header+Background" className="w-full h-full object-cover mix-blend-overlay opacity-50" alt="header bg" />
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto pt-10 md:pt-16">

        <div className="flex flex-col items-center gap-1 md:gap-2 mb-8 md:mb-12 px-4 text-center">
          <h1 className="text-white text-lg md:text-3xl font-semibold drop-shadow-md">よいゆめの歌と演奏を探すデータベース</h1>
          <p className="text-white text-xs md:text-sm font-medium drop-shadow-md">非公式ファンサイト</p>
        </div>

        {pickup && (
          <div className="w-[90%] md:max-w-4xl mx-auto px-4 py-4 md:py-6 bg-white/95 backdrop-blur-md rounded-2xl flex flex-col justify-start items-start gap-2 md:gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 mb-8 md:mb-12">
            <div className="w-full flex justify-between items-center">
              <div className="flex justify-start items-center gap-2">
                <div className="w-5 h-5 md:w-6 md:h-6 relative">
                  <Image src="/icon-pickup.svg" alt="PICK UP" fill className="object-contain" />
                </div>
                <div className="text-indigo-800 text-lg md:text-xl font-bold leading-4">PICK UP</div>
              </div>
              <button onClick={shufflePickup} className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-br from-indigo-500 via-indigo-400 to-fuchsia-200 rounded-full flex items-center gap-1.5 hover:opacity-90 hover:scale-105 hover:shadow-md transition-all">
                <div className="w-3.5 h-3.5 md:w-4 md:h-4 relative">
                  <Image src="/icon-shuffle.svg" alt="Shuffle" fill className="object-contain" />
                </div>
                <div className="text-white text-xs md:text-sm font-bold leading-4">シャッフル</div>
              </button>
            </div>
            <div className={`w-full flex flex-col md:flex-row items-start gap-3 md:gap-6 mt-0.5 md:mt-2 transition-opacity duration-300 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              <div className="w-full md:w-1/2 aspect-video rounded-lg overflow-hidden bg-black shrink-0 shadow-inner">
                <iframe
                  key={pickup.id}
                  src={`https://www.youtube.com/embed/${pickup.video.youtubeId}${pickup.startSeconds ? `?start=${pickup.startSeconds}` : ''}`}
                  title={pickup.song.title}
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              </div>
              <div className="w-full md:w-1/2 flex flex-col justify-start items-start gap-2 md:gap-3">
                <div className="flex flex-col gap-1 w-full">
                  <div className="text-neutral-950 text-sm md:text-xl font-bold leading-snug line-clamp-2 md:line-clamp-3">{pickup.song.title}</div>
                  <div className="text-gray-500 text-[10px] md:text-sm font-normal truncate w-full">{pickup.song.artist}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 md:mt-1">
                  {renderMemberTags(pickup.singers)}
                  {pickup.collaborators && (
                    <div className="px-1.5 py-1 bg-slate-50 rounded-[120px] outline outline-1 outline-offset-[-1px] outline-slate-300 shadow-sm flex items-center gap-1">
                      <div className="text-center text-[10px] md:text-xs font-bold text-slate-700">🤝 {pickup.collaborators}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full bg-slate-50 rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] min-h-screen p-4 md:p-8 lg:p-12">
          <div className="max-w-4xl mx-auto flex flex-col items-center">

            <div className="relative p-1.5 bg-gray-200/60 rounded-lg inline-flex justify-center items-center w-full max-w-[400px] mb-8">
              <div
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-gradient-to-br from-indigo-400 to-purple-300 rounded-md shadow-md transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)] ${activeTab === 'songs' ? 'left-1.5' : 'left-[calc(50%+3px)]'}`}
              ></div>
              <button
                onClick={() => handleTabChange('songs')}
                className="relative z-10 flex-1 h-9 md:h-11 rounded-md flex justify-center items-center cursor-pointer"
              >
                <div className={`transition-colors duration-300 text-sm md:text-base font-semibold ${activeTab === 'songs' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}>曲から探す</div>
              </button>
              <button
                onClick={() => handleTabChange('videos')}
                className="relative z-10 flex-1 h-9 md:h-11 rounded-md flex justify-center items-center cursor-pointer"
              >
                <div className={`transition-colors duration-300 text-sm md:text-base font-semibold ${activeTab === 'videos' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}>配信・動画から探す</div>
              </button>
            </div>

            {activeTab === 'songs' ? (
              <div className="w-full max-w-2xl h-12 md:h-14 px-4 bg-white rounded-full outline outline-[1.5px] outline-offset-[-1.5px] outline-gray-200 flex items-center gap-3 shadow-sm hover:outline-indigo-300 transition-all focus-within:outline-indigo-400">
                <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="曲名・アーティスト・ゲスト名で検索"
                  className="bg-transparent border-none outline-none w-full text-gray-700 text-sm md:text-base font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            ) : (
              <div className="w-full max-w-2xl flex gap-3">
                <div className="flex-1 h-12 md:h-14 px-4 bg-white rounded-full outline outline-[1.5px] outline-offset-[-1.5px] outline-gray-200 flex items-center gap-2 shadow-sm hover:outline-indigo-300 transition-all focus-within:outline-indigo-400">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <select
                    className="bg-transparent border-none outline-none w-full text-gray-700 text-xs md:text-base font-medium appearance-none cursor-pointer"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    <option value="">すべての年</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 h-12 md:h-14 px-4 bg-white rounded-full outline outline-[1.5px] outline-offset-[-1.5px] outline-gray-200 flex items-center gap-2 shadow-sm hover:outline-indigo-300 transition-all focus-within:outline-indigo-400">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <select
                    className="bg-transparent border-none outline-none w-full text-gray-700 text-xs md:text-base font-medium appearance-none cursor-pointer"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    <option value="">すべての月</option>
                    {availableMonths.map(month => (
                      <option key={month} value={month}>{month}月</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="w-full mt-8 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {MEMBERS.map((member) => (
                  <button
                    key={member.name}
                    onClick={() => toggleMember(member.name)}
                    className={`h-9 md:h-10 px-4 rounded-full outline outline-1 outline-offset-[-1px] flex items-center transition-all hover:scale-105 hover:shadow-sm ${
                      selectedMembers.includes(member.name) ? member.activeClass : member.inactiveClass
                    }`}
                  >
                    <div className="text-xs md:text-sm font-semibold">{member.emoji} {member.name}</div>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {VIDEO_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(selectedType === type ? "" : type)}
                    className={`h-9 md:h-10 px-5 rounded-full outline outline-1 outline-offset-[-1px] flex items-center transition-all hover:scale-105 hover:shadow-sm ${
                      selectedType === type ? "bg-indigo-100 outline-indigo-400 text-indigo-900" : "bg-white outline-slate-300 text-indigo-900"
                    }`}
                  >
                    <div className="text-xs md:text-sm font-semibold">{type}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full mt-10 flex flex-col gap-5">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="text-indigo-900 text-xl font-bold">{activeTab === 'songs' ? filteredSongs.length : filteredVideos.length}</div>
                <div className="text-indigo-900 text-sm font-bold">{activeTab === 'songs' ? '曲' : '件'}見つかりました!</div>
              </div>

              <div className="flex flex-col gap-6">

                {/* -------------------- 曲から探す -------------------- */}
                {activeTab === 'songs' && filteredSongs.map((group) => (
                  <div key={group.songId} className="p-4 md:p-6 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 flex flex-col">
                      <div className="text-indigo-900 text-lg md:text-xl font-bold leading-tight">{group.title}</div>
                      <div className="text-gray-500 text-xs md:text-sm font-medium mt-1">{group.artist}</div>
                    </div>
                    <div className="w-full md:w-2/3 flex flex-col gap-3">
                      {group.performances.map((perf) => {
                        const playButton = perf.video.isArchived ? (
                          <a href={`https://youtu.be/${perf.video.youtubeId}${perf.startSeconds ? `?t=${perf.startSeconds}` : ''}`} target="_blank" rel="noopener noreferrer" className="h-8 md:h-9 px-6 bg-red-500 hover:bg-red-600 hover:scale-105 transition-all duration-300 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          </a>
                        ) : (
                          <div className="h-8 md:h-9 px-3 bg-gray-300 rounded-full flex items-center justify-center shrink-0">
                            <div className="text-white text-[10px] md:text-xs font-bold whitespace-nowrap">アーカイブ非公開</div>
                          </div>
                        );

                        return (
                          <div key={perf.id} className="p-3 md:p-4 bg-neutral-50 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-3 border border-gray-100 hover:bg-indigo-50/40 transition-colors duration-300">

                            <div className="w-full flex-1 flex flex-col gap-2">
                              <div className="flex flex-col gap-0.5 md:gap-1">
                                <div className="text-indigo-900 text-sm md:text-base font-bold leading-snug line-clamp-1 md:line-clamp-2">{perf.video.title}</div>
                                <div className="text-zinc-500 text-[11px] md:text-xs">{formatDate(perf.video.streamingDate)}</div>
                              </div>

                              <div className="w-full flex flex-row justify-between items-end md:items-center gap-3">
                                <div className="flex flex-wrap items-center gap-1.5 md:mt-1">
                                  {renderMemberTags(perf.singers)}
                                  {perf.collaborators && (
                                    <div className="px-1.5 py-1 bg-slate-50 rounded-[120px] outline outline-1 outline-offset-[-1px] outline-slate-300 shadow-sm flex items-center gap-1">
                                      <div className="text-center text-[10px] md:text-xs font-bold text-slate-700">🤝 {perf.collaborators}</div>
                                    </div>
                                  )}
                                  <div className="px-2 py-1 bg-white rounded border border-gray-200">
                                    <div className="text-gray-600 text-[10px] md:text-xs font-bold">{perf.video.type[0]}</div>
                                  </div>
                                </div>

                                <div className="md:hidden shrink-0">
                                  {playButton}
                                </div>
                              </div>
                            </div>

                            <div className="hidden md:flex shrink-0">
                              {playButton}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* -------------------- 配信・動画から探す -------------------- */}
                {activeTab === 'videos' && filteredVideos.map((video) => {
                  const relatedPerformances = initialPerformances.filter((p) => p.video.id === video.id).sort((a, b) => (a.startSeconds || 0) - (b.startSeconds || 0));

                  return (
                    <div key={video.id} className="p-4 md:p-6 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-1/3 flex flex-col gap-3">

                        {video.isArchived ? (
                          <a href={`https://youtu.be/${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="block w-full aspect-video rounded-lg overflow-hidden bg-black group relative shadow-inner">
                            <img src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100" />
                            <div className="absolute inset-0 bg-black/10 transition-opacity duration-300 group-hover:bg-transparent"></div>
                            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded font-bold backdrop-blur-sm">YouTube</div>
                          </a>
                        ) : (
                          <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                            <div className="text-gray-400 font-bold text-sm">アーカイブ非公開</div>
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <div className="text-indigo-900 text-sm md:text-lg font-bold leading-snug line-clamp-2">
                            {video.isArchived ? (
                              <a href={`https://youtu.be/${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">
                                {video.title}
                              </a>
                            ) : (
                              video.title
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="px-2 py-1 bg-neutral-100 rounded border border-gray-200 shadow-sm">
                              <div className="text-gray-700 text-[10px] md:text-xs font-bold">{video.type[0]}</div>
                            </div>
                            <div className="text-zinc-500 text-xs md:text-sm">{formatDate(video.streamingDate)}</div>
                          </div>
                          <div className="mt-1 flex items-center gap-1 truncate">
                            <span className="text-gray-400 text-xs md:text-sm">📺</span>
                            {video.channel ? (
                              <a href={video.channel.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-400 text-xs md:text-sm font-bold truncate transition-colors">
                                {video.channel.name}
                              </a>
                            ) : (
                              <span className="text-indigo-600 text-xs md:text-sm font-bold">未設定</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-2/3 flex flex-col gap-2">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-1">
                          <div className="flex items-baseline gap-0.5">
                            <div className="text-indigo-900 text-lg font-bold">{relatedPerformances.length}</div>
                            <div className="text-indigo-900 text-sm font-bold">曲</div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {relatedPerformances.length > 0 ? (
                            relatedPerformances.map((perf) => (
                              <div key={perf.id} className="p-3 bg-neutral-50 rounded-xl flex justify-between items-center gap-2 border border-gray-100 hover:bg-indigo-50/40 transition-colors duration-300">
                                <div className="flex-1 flex flex-col">
                                  <div className="text-indigo-900 text-sm md:text-base font-bold leading-tight line-clamp-1">{perf.song.title}</div>
                                  <div className="text-zinc-500 text-[11px] md:text-xs mt-1">{perf.song.artist}</div>
                                </div>

                                {video.isArchived ? (
                                  perf.startSeconds ? (
                                    <a href={`https://youtu.be/${video.youtubeId}?t=${perf.startSeconds}`} target="_blank" rel="noopener noreferrer" className="h-8 md:h-9 px-4 bg-red-500 hover:bg-red-600 hover:scale-105 transition-all duration-300 rounded-full flex items-center justify-center gap-1.5 shrink-0 shadow-sm">
                                      <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                      <div className="text-white text-xs md:text-sm font-bold">{formatTime(perf.startSeconds)}</div>
                                    </a>
                                  ) : (
                                    <a href={`https://youtu.be/${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="h-8 md:h-9 px-6 bg-red-500 hover:bg-red-600 hover:scale-105 transition-all duration-300 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                                      <svg className="w-4 h-4 md:w-5 md:h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    </a>
                                  )
                                ) : (
                                  <div className="h-8 md:h-9 px-3 bg-gray-300 rounded-full flex items-center justify-center shrink-0">
                                    <div className="text-white text-[10px] md:text-xs font-bold whitespace-nowrap">アーカイブ非公開</div>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-400 p-2">データがありません</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 固定フッター */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 py-2.5 px-4 z-50">
        <div className="max-w-4xl mx-auto text-[10px] text-gray-500 leading-snug flex flex-col gap-0.5">
          <p>※ 当サイトは一ファンが運営する非公式データベースです。ご本人や所属事務所様とは一切関係ありません。(動画・楽曲の権利は各権利者様に帰属します)</p>
          <p>※ 手作業で更新しているため、データの抜け漏れや反映の遅れはご容赦ください🙏 サイトのリンク共有や紹介は大歓迎です！</p>
          <p>※ 修正依頼やお問い合わせは <a href="https://x.com/asa_go_han_" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-400 font-bold transition-colors">X（@asa_go_han）</a> までお気軽にどうぞ。</p>
        </div>
      </div>

    </div>
  );
}
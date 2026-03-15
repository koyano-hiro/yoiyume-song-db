"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Performance, Video } from "@/lib/microcms";

type CustomPerformance = Performance & { collaborators?: string };

const MEMBERS = [
  { name: "十河ののは", emoji: "🦎", color: "#ACE0B8" },
  { name: "夜牛詩乃", emoji: "💮", color: "#DDC0FB" },
  { name: "蝸堂みかる", emoji: "🐌", color: "#FFE08A" },
  { name: "猫屋敷美紅", emoji: "💐", color: "#FFB387" },
];

const VIDEO_TYPES = ["ライブ・歌枠", "歌ってみた", "弾いてみた", "オリジナル", "その他"];

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
  const validPerformances = useMemo(() => initialPerformances.filter(p => p.video?.isArchived), [initialPerformances]);
  const validVideos = useMemo(() => initialVideos.filter(v => v.isArchived), [initialVideos]);

  const [activeTab, setActiveTab] = useState<'songs' | 'videos'>('songs');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedArtist, setSelectedArtist] = useState<string>("");

  const [performanceMode, setPerformanceMode] = useState<'all' | 'vocal' | 'inst'>('all');
  const [shortsMode, setShortsMode] = useState<'all' | 'normal' | 'shorts'>('all');

  const [pickup, setPickup] = useState<CustomPerformance | null>(null);
  const [isFading, setIsFading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [randomOrder, setRandomOrder] = useState<Record<string, number>>({});

  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [sortConfigSongs, setSortConfigSongs] = useState({ key: 'default', order: 'desc' });
  const [sortConfigVideos, setSortConfigVideos] = useState({ key: 'default', order: 'desc' });
  const [tempSortConfig, setTempSortConfig] = useState({ key: 'date', order: 'desc' });

  const [isFooterExpanded, setIsFooterExpanded] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<{ id: string; startSeconds: number | null } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab')) setActiveTab(params.get('tab') as 'songs' | 'videos');
      if (params.get('q')) setSearchTerm(params.get('q') || '');
      if (params.get('year')) setSelectedYear(params.get('year') || '');
      if (params.get('month')) setSelectedMonth(params.get('month') || '');
      if (params.get('members')) setSelectedMembers(params.get('members')?.split(',') || []);
      if (params.get('type')) setSelectedType(params.get('type') || '');
      if (params.get('artist')) setSelectedArtist(params.get('artist') || '');
      if (params.get('perf')) setPerformanceMode(params.get('perf') as any || 'all');
      if (params.get('shorts')) setShortsMode(params.get('shorts') as any || 'all');
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    if (searchTerm) params.set('q', searchTerm);
    if (selectedYear) params.set('year', selectedYear);
    if (selectedMonth) params.set('month', selectedMonth);
    if (selectedMembers.length > 0) params.set('members', selectedMembers.join(','));
    if (selectedType) params.set('type', selectedType);
    if (selectedArtist) params.set('artist', selectedArtist);
    if (performanceMode !== 'all') params.set('perf', performanceMode);
    if (shortsMode !== 'all') params.set('shorts', shortsMode);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab, searchTerm, selectedYear, selectedMonth, selectedMembers, selectedType, selectedArtist, performanceMode, shortsMode, isMounted]);

  useEffect(() => {
    setIsMounted(true);
    const order: Record<string, number> = {};
    validPerformances.forEach(p => { if (p.song) order[p.song.id] = Math.random(); });
    validVideos.forEach(v => { order[v.id] = Math.random(); });
    setRandomOrder(order);
  }, [validPerformances, validVideos]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTabChange = (tab: 'songs' | 'videos') => {
    setActiveTab(tab);
    setSearchTerm("");
    setSelectedYear("");
    setSelectedMonth("");
    setSelectedMembers([]);
    setSelectedType("");
    setSelectedArtist("");
    setPerformanceMode('all');
    setShortsMode('all');
    setSortConfigSongs({ key: 'default', order: 'desc' });
    setSortConfigVideos({ key: 'default', order: 'desc' });
    setSortModalOpen(false);
    setPlayingVideo(null);
  };

  const openSortModal = () => {
    const current = activeTab === 'songs' ? sortConfigSongs : sortConfigVideos;
    setTempSortConfig(current.key === 'default' ? { key: 'date', order: 'desc' } : current);
    setSortModalOpen(true);
  };

  const applySort = () => {
    if (activeTab === 'songs') {
      setSortConfigSongs(tempSortConfig);
    } else {
      setSortConfigVideos(tempSortConfig);
    }
    setSortModalOpen(false);
  };

  const resetSort = () => {
    const defaultSort = { key: 'default', order: 'desc' };
    setTempSortConfig({ key: 'date', order: 'desc' });
    if (activeTab === 'songs') {
      setSortConfigSongs(defaultSort);
    } else {
      setSortConfigVideos(defaultSort);
    }
    setSortModalOpen(false);
  };

  const availableYears = Array.from(new Set(validVideos.map(v => new Date(v.streamingDate).getFullYear().toString()))).sort((a, b) => b.localeCompare(a));
  const availableMonths = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const availableArtists = Array.from(new Set(validPerformances.map(p => p.song?.artist).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ja'));

  const shufflePickup = useCallback(() => {
    if (validPerformances.length > 0) {
      setIsFading(true);
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * validPerformances.length);
        setPickup(validPerformances[randomIndex]);
        setIsFading(false);
      }, 300);
    }
  }, [validPerformances]);

  useEffect(() => {
    shufflePickup();
  }, [shufflePickup]);

  const toggleMember = (memberName: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberName) ? prev.filter((m) => m !== memberName) : [...prev, memberName]
    );
  };

  const groupedSongsMap = new Map<string, GroupedSong>();
  validPerformances.forEach((perf) => {
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
      const isInst = perf.video.type?.includes("弾いてみた");
      const matchMode = performanceMode === 'all' ||
                        (performanceMode === 'vocal' && !isInst) ||
                        (performanceMode === 'inst' && isInst);

      return matchMember && matchMode;
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
    const matchArtist = selectedArtist === "" || group.artist === selectedArtist;
    return group.performances.length > 0 && matchText && matchArtist;
  }).sort((a, b) => {
    if (sortConfigSongs.key === 'default') {
      if (!isMounted) return a.songId.localeCompare(b.songId);
      return (randomOrder[a.songId] || 0) - (randomOrder[b.songId] || 0);
    } else if (sortConfigSongs.key === 'date') {
      const dateA = Math.max(...a.performances.map(p => new Date(p.video.streamingDate).getTime()));
      const dateB = Math.max(...b.performances.map(p => new Date(p.video.streamingDate).getTime()));
      return sortConfigSongs.order === 'desc' ? dateB - dateA : dateA - dateB;
    } else {
      return sortConfigSongs.order === 'desc'
        ? b.title.localeCompare(a.title, 'ja')
        : a.title.localeCompare(b.title, 'ja');
    }
  });

  const filteredVideos = validVideos.filter((video) => {
    let matchMember = true;
    if (selectedMembers.length > 0) {
      matchMember = selectedMembers.every((m) => {
        const isChannelMatch = video.channel?.name === m;
        const relatedPerformances = validPerformances.filter((p) => p.video.id === video.id);
        const isSingerMatch = relatedPerformances.some((p) => p.singers?.includes(m));
        return isChannelMatch || isSingerMatch;
      });
    }

    const matchType = selectedType === "" || video.type?.includes(selectedType);

    const isShortsVideo = video.isShorts === true || video.type?.includes("Shorts");
    const matchShorts = shortsMode === 'all'
      ? true
      : shortsMode === 'normal'
        ? !isShortsVideo
        : isShortsVideo;

    let matchYear = true;
    let matchMonth = true;
    const d = new Date(video.streamingDate);
    if (selectedYear !== "") matchYear = d.getFullYear().toString() === selectedYear;
    if (selectedMonth !== "") matchMonth = (d.getMonth() + 1).toString() === selectedMonth;

    const term = searchTerm.toLowerCase();
    const relatedPerfs = validPerformances.filter(p => p.video.id === video.id);
    const matchText = term === "" ||
      video.title.toLowerCase().includes(term) ||
      video.channel?.name?.toLowerCase().includes(term) ||
      relatedPerfs.some(p =>
        p.song.title.toLowerCase().includes(term) ||
        p.song.artist.toLowerCase().includes(term) ||
        p.singers?.some(s => s.toLowerCase().includes(term)) ||
        p.collaborators?.toLowerCase().includes(term)
      );

    return matchMember && matchType && matchShorts && matchYear && matchMonth && matchText && relatedPerfs.length > 0;
  }).sort((a, b) => {
    if (sortConfigVideos.key === 'default') {
      if (!isMounted) return a.id.localeCompare(b.id);
      return (randomOrder[a.id] || 0) - (randomOrder[b.id] || 0);
    } else if (sortConfigVideos.key === 'date') {
      const dateA = new Date(a.streamingDate).getTime();
      const dateB = new Date(b.streamingDate).getTime();
      return sortConfigVideos.order === 'desc' ? dateB - dateA : dateA - dateB;
    } else {
      return sortConfigVideos.order === 'desc'
        ? b.title.localeCompare(a.title, 'ja')
        : a.title.localeCompare(b.title, 'ja');
    }
  });

  const renderSortDropdown = () => (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setSortModalOpen(false)}></div>
      <div className="absolute right-0 top-[calc(100%+8px)] w-[260px] md:w-[280px] bg-white rounded-xl border-[2px] border-[#1C1C1C] p-4 md:p-5 z-50 origin-top-right transition-all animate-in zoom-in-95 fade-in duration-200 shadow-[4px_4px_0px_#1C1C1C]">
        <div className="flex flex-col gap-4 md:gap-5">

          <div className="flex flex-col gap-2">
            <div className="text-xs md:text-sm font-bold text-[#1C1C1C] ml-1">📌 項目</div>
            <div className="relative border-[2px] border-[#1C1C1C] rounded-full bg-white flex w-full h-10 md:h-12 items-center p-0 overflow-hidden">
              <div className={`absolute top-[-2px] bottom-[-2px] left-[0px] w-[calc(50%+2px)] transition-transform duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)] ${tempSortConfig.key === 'title' ? 'translate-x-[calc(100%-4px)]' : 'translate-x-[-2px]'}`}>
                <div className="w-full h-full bg-[#F3F3F3] rounded-full border-[2px] border-[#1C1C1C] shadow-[2px_1px_0px_#1C1C1C]"></div>
              </div>
              <button onClick={() => setTempSortConfig({...tempSortConfig, key: 'date'})} className={`relative z-10 flex-1 h-full flex justify-center items-center cursor-pointer transition-colors duration-300 text-xs md:text-sm font-bold border-r-[2px] border-[#1C1C1C] ${tempSortConfig.key !== 'title' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}>配信日</button>
              <button onClick={() => setTempSortConfig({...tempSortConfig, key: 'title'})} className={`relative z-10 flex-1 h-full flex justify-center items-center cursor-pointer transition-colors duration-300 text-xs md:text-sm font-bold ${tempSortConfig.key === 'title' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}>{activeTab === 'songs' ? 'タイトル' : '配信タイトル'}</button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs md:text-sm font-bold text-[#1C1C1C] ml-1">↕️ 並び順</div>
            <div className="relative border-[2px] border-[#1C1C1C] rounded-full bg-white flex w-full h-10 md:h-12 items-center p-0 overflow-hidden">
              <div className={`absolute top-[-2px] bottom-[-2px] left-[0px] w-[calc(50%+2px)] transition-transform duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)] ${tempSortConfig.order === 'asc' ? 'translate-x-[calc(100%-4px)]' : 'translate-x-[-2px]'}`}>
                <div className="w-full h-full bg-[#F3F3F3] rounded-full border-[2px] border-[#1C1C1C] shadow-[2px_1px_0px_#1C1C1C]"></div>
              </div>
              <button onClick={() => setTempSortConfig({...tempSortConfig, order: 'desc'})} className={`relative z-10 flex-1 h-full flex justify-center items-center cursor-pointer transition-colors duration-300 text-xs md:text-sm font-bold border-r-[2px] border-[#1C1C1C] ${tempSortConfig.order !== 'asc' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}>降順</button>
              <button onClick={() => setTempSortConfig({...tempSortConfig, order: 'asc'})} className={`relative z-10 flex-1 h-full flex justify-center items-center cursor-pointer transition-colors duration-300 text-xs md:text-sm font-bold ${tempSortConfig.order === 'asc' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}>昇順</button>
            </div>
          </div>

          <div className="flex justify-between items-center mt-1 pt-3 border-t-[2px] border-[#1C1C1C] border-dashed">
            <button onClick={resetSort} className="text-xs md:text-sm font-normal text-gray-500 hover:text-[#1C1C1C] transition-colors px-2 py-1">ランダムに戻す</button>
            <button onClick={applySort} className="px-6 py-2 bg-[#7B8FD1] border-[2px] border-[#1C1C1C] rounded-full text-white text-xs md:text-sm font-bold shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all">決定！</button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 selection:bg-gray-200 selection:text-[#1C1C1C] font-['IBM_Plex_Sans_JP'] flex justify-center overflow-x-hidden">

      <div className="w-full max-w-3xl bg-[#F3F3F3] md:border-x-[2px] border-[#1C1C1C] min-h-screen relative flex flex-col shadow-2xl mx-auto overflow-x-hidden">

        <div className="w-full flex justify-between items-start h-[140px] sm:h-[180px] md:h-[220px] bg-[#F3F3F3] border-b-[2px] border-[#1C1C1C] overflow-hidden shrink-0">
          <img
            src="/logo-title.png"
            alt="よいゆめの歌と演奏を探せるページ"
            className="h-full w-auto object-contain object-left"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
          />
          <h1 className="hidden text-[#1C1C1C] text-xl md:text-3xl font-black tracking-tight leading-snug drop-shadow-[2px_2px_0px_rgba(255,255,255,0.8)] mt-4 pl-4">
            よいゆめの<br/>歌と演奏を<br/>探せるページ
          </h1>

          <img
            src="/logo-subtitle.png"
            alt="非公式ファンサイト"
            className="h-full w-auto object-contain object-right"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
          />
          <p className="hidden text-[#1C1C1C] text-xs md:text-sm font-black tracking-widest [writing-mode:vertical-rl] drop-shadow-[2px_2px_0px_rgba(255,255,255,0.8)] mt-4 pr-4">
            非公式ファンサイト
          </p>
        </div>

        <div className="relative z-10 w-full flex flex-col flex-grow">

          {pickup && (
            <div className="w-full -mt-[2px] relative z-20">
              <div className="w-full bg-white border-y-[2px] border-[#1C1C1C] py-3 md:py-4 flex flex-col gap-2 relative">

                <img src="/icon-pickup.png" className="absolute top-0 left-0 w-12 h-12 md:w-16 md:h-16 object-contain object-left-top" alt="" />

                <div className="w-full flex justify-between items-center min-h-[32px] md:min-h-[40px] pr-4 pl-[3.5rem] md:pr-6 md:pl-[4.5rem]">
                  <div className="flex justify-start items-baseline gap-1.5 md:gap-2">
                    <div className="text-[#1C1C1C] text-xl md:text-2xl font-black tracking-tight leading-none mt-0.5">PICK UP</div>
                    <span className="text-gray-500 text-[10px] md:text-xs font-bold leading-none mt-1">ランダムで表示中</span>
                  </div>

                  <button onClick={shufflePickup} className="px-3 py-1.5 bg-white border-[2px] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] rounded-full flex items-center gap-1.5 hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all">
                    <img src="/icon-shuffle.png" className="w-3 h-3 md:w-4 md:h-4 object-contain" alt="" />
                    <div className="text-[#1C1C1C] text-[10px] md:text-xs font-bold">シャッフル</div>
                  </button>
                </div>

                <div className={`w-full flex flex-col md:flex-row items-start gap-4 px-3 md:px-5 transition-opacity duration-300 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                  <div className="w-full md:w-1/2 aspect-video rounded-xl overflow-hidden bg-black shrink-0">
                    <iframe
                      key={pickup.id}
                      src={`https://www.youtube.com/embed/${pickup.video.youtubeId}${pickup.startSeconds ? `?start=${pickup.startSeconds}` : ''}`}
                      title={pickup.song.title}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  </div>
                  <div className="w-full md:w-1/2 flex flex-col justify-start items-start gap-1 md:py-1">
                    <div className="flex flex-col gap-0.5 w-full">
                      <div className="text-[#1C1C1C] text-lg md:text-xl font-bold leading-snug line-clamp-2">{pickup.song.title}</div>
                      <div className="text-gray-600 text-xs md:text-sm font-normal truncate w-full">{pickup.song.artist}</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {pickup.singers?.map(singer => {
                        const memberDef = MEMBERS.find(m => m.name === singer);
                        return (
                          <div key={singer} className="px-1.5 py-[1px] rounded text-[9px] md:text-[10px] font-bold text-[#1C1C1C]" style={{ backgroundColor: memberDef?.color || '#D2DBF8' }}>
                            {memberDef?.emoji} {singer}
                          </div>
                        );
                      })}
                      {pickup.collaborators && (
                        <div className="px-1.5 py-[1px] bg-[#D2DBF8] rounded text-[#1C1C1C] text-[9px] md:text-[10px] font-bold">
                          🤝 {pickup.collaborators}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="w-full px-4 md:px-6 pt-6 pb-28 flex flex-col items-center">

            <div className="relative rounded-full bg-white flex w-full md:max-w-[500px] h-12 md:h-14 items-center mb-6 border-[2px] border-[#1C1C1C] overflow-hidden">
              <div
                className="absolute top-[-2px] bottom-[-2px] left-[0px] w-[calc(50%+2px)] bg-[#F3F3F3] rounded-full border-[2px] border-[#1C1C1C] shadow-[2px_1px_0px_#1C1C1C] transition-transform duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]"
                style={{ transform: activeTab === 'songs' ? 'translateX(-2px)' : 'translateX(calc(100% - 4px))' }}
              />
              <button
                onClick={() => handleTabChange('songs')}
                className={`relative z-10 flex-1 h-full flex justify-center items-center gap-2 font-bold text-sm md:text-base transition-colors duration-300 ${activeTab === 'songs' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}
              >
                曲から探す
              </button>
              <button
                onClick={() => handleTabChange('videos')}
                className={`relative z-10 flex-1 h-full flex justify-center items-center gap-2 font-bold text-sm md:text-base transition-colors duration-300 ${activeTab === 'videos' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}
              >
                配信・動画から探す
              </button>
            </div>

            <div className="w-full flex flex-col gap-3">

              <div className="flex gap-2 relative">
                <div className="flex-1 h-12 bg-white rounded-xl border-[2px] border-[#1C1C1C] flex items-center overflow-hidden">
                  <img src="/icon-search.png" className="h-full w-auto object-cover shrink-0" alt="" />
                  <input
                    type="text"
                    placeholder="曲名・アーティストなどで自由に検索"
                    className="bg-transparent border-none outline-none w-full text-[#1C1C1C] text-sm font-bold placeholder-gray-400 px-3"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  onClick={openSortModal}
                  className={`h-12 w-12 shrink-0 rounded-xl border-[2px] border-[#1C1C1C] flex items-center justify-center transition-all ${sortModalOpen ? 'bg-gray-100 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-[#1C1C1C]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                </button>
                {sortModalOpen && renderSortDropdown()}
              </div>

              {activeTab === 'songs' ? (
                <div className="h-12 bg-white rounded-xl border-[2px] border-[#1C1C1C] flex items-center shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all cursor-pointer overflow-hidden">
                  <img src="/icon-filter-artist.png" className="h-full w-auto object-cover shrink-0" alt="" />
                  <select
                    className="bg-transparent border-none outline-none w-full text-[#1C1C1C] text-sm font-bold appearance-none cursor-pointer px-3"
                    value={selectedArtist}
                    onChange={(e) => setSelectedArtist(e.target.value)}
                  >
                    <option value="">すべての原曲アーティスト</option>
                    {availableArtists.map(artist => (
                      <option key={artist} value={artist}>{artist}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-white rounded-xl border-[2px] border-[#1C1C1C] flex items-center shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all cursor-pointer overflow-hidden">
                    <img src="/icon-filter-calendar.png" className="h-full w-auto object-cover shrink-0" alt="" />
                    <select
                      className="bg-transparent border-none outline-none w-full text-[#1C1C1C] text-xs md:text-sm font-bold appearance-none cursor-pointer px-2 md:px-3"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      <option value="">すべての年</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}年</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 h-12 bg-white rounded-xl border-[2px] border-[#1C1C1C] flex items-center shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all cursor-pointer overflow-hidden">
                    <img src="/icon-filter-calendar.png" className="h-full w-auto object-cover shrink-0" alt="" />
                    <select
                      className="bg-transparent border-none outline-none w-full text-[#1C1C1C] text-xs md:text-sm font-bold appearance-none cursor-pointer px-2 md:px-3"
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
            </div>

            <div className="w-full mt-5 flex flex-col gap-3">
              <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 w-full">
                {MEMBERS.map((member) => {
                  const isActive = selectedMembers.includes(member.name);
                  return (
                    <button
                      key={member.name}
                      onClick={() => toggleMember(member.name)}
                      className={`h-9 px-2 md:px-3 rounded-md flex justify-center md:justify-start items-center gap-1.5 transition-all border-[2px] border-[#1C1C1C] ${isActive ? 'translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none'}`}
                      style={{ backgroundColor: isActive ? member.color : '#FFFFFF' }}
                    >
                      <span className="text-xs">{member.emoji}</span>
                      <span className="text-[#1C1C1C] text-xs font-bold whitespace-nowrap">{member.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 w-full">
                {activeTab === 'songs' ? (
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full">
                    <div className="relative flex w-full md:w-[240px] h-9 border-[2px] border-[#1C1C1C] rounded-md bg-white shadow-[2px_2px_0px_#1C1C1C] overflow-hidden shrink-0">
                      <div
                        className="absolute top-[0px] bottom-[0px] left-[0px] w-[calc(33.333%+2px)] bg-[#1C1C1C] transition-transform duration-300 ease-in-out"
                        style={{ transform: performanceMode === 'all' ? 'translateX(-2px)' : performanceMode === 'vocal' ? 'translateX(calc(100% - 4px))' : 'translateX(calc(200% - 6px))' }}
                      />
                      <button
                        onClick={() => setPerformanceMode('all')}
                        className={`relative z-10 flex-1 flex justify-center items-center text-xs font-bold transition-colors border-r-[2px] border-[#1C1C1C] ${performanceMode === 'all' ? 'text-white border-transparent' : 'text-[#1C1C1C] hover:bg-gray-100'}`}
                      >すべて</button>
                      <button
                        onClick={() => setPerformanceMode('vocal')}
                        className={`relative z-10 flex-1 flex justify-center items-center text-xs font-bold transition-colors border-r-[2px] border-[#1C1C1C] ${performanceMode === 'vocal' ? 'text-white border-transparent' : 'text-[#1C1C1C] hover:bg-gray-100'}`}
                      >歌</button>
                      <button
                        onClick={() => setPerformanceMode('inst')}
                        className={`relative z-10 flex-1 flex justify-center items-center text-xs font-bold transition-colors ${performanceMode === 'inst' ? 'text-white border-transparent' : 'text-[#1C1C1C] hover:bg-gray-100'}`}
                      >演奏</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="grid grid-cols-3 sm:flex sm:flex-nowrap items-center gap-2 w-full">
                      {VIDEO_TYPES.map((type) => {
                        const isActive = selectedType === type;
                        return (
                          <button
                            key={type}
                            onClick={() => setSelectedType(isActive ? "" : type)}
                            className={`h-9 px-2 rounded-md flex-1 flex justify-center items-center font-bold text-xs transition-all border-[2px] border-[#1C1C1C] ${isActive ? 'bg-[#1C1C1C] text-white shadow-none translate-y-[1px] translate-x-[1px]' : 'bg-white text-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none'}`}
                          >
                            <span className="whitespace-nowrap">{type}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="relative flex w-full md:w-[320px] h-9 border-[2px] border-[#1C1C1C] rounded-md bg-white shadow-[2px_2px_0px_#1C1C1C] overflow-hidden shrink-0">
                      <div
                        className="absolute top-[0px] bottom-[0px] left-[0px] w-[calc(33.333%)] bg-[#1C1C1C] transition-transform duration-300 ease-in-out"
                        style={{ transform: shortsMode === 'all' ? 'translateX(0)' : shortsMode === 'normal' ? 'translateX(100%)' : 'translateX(200%)' }}
                      />
                      <button
                        onClick={() => setShortsMode('all')}
                        className={`relative z-10 flex-1 flex justify-center items-center text-xs font-bold transition-colors border-r-[2px] border-[#1C1C1C] ${shortsMode === 'all' ? 'text-white border-transparent' : 'text-[#1C1C1C] hover:bg-gray-100'}`}
                      >すべて</button>
                      <button
                        onClick={() => setShortsMode('normal')}
                        className={`relative z-10 flex-1 flex justify-center items-center text-xs font-bold transition-colors border-r-[2px] border-[#1C1C1C] ${shortsMode === 'normal' ? 'text-white border-transparent' : 'text-[#1C1C1C] hover:bg-gray-100'}`}
                      >Shortsを除外</button>
                      <button
                        onClick={() => setShortsMode('shorts')}
                        className={`relative z-10 flex-1 flex justify-center items-center text-xs font-bold transition-colors ${shortsMode === 'shorts' ? 'text-white border-transparent' : 'text-[#1C1C1C] hover:bg-gray-100'}`}
                      >Shortsのみ</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full mt-8 mb-3 flex items-end justify-between border-b-[2px] border-[#1C1C1C] pb-1">
              <div className="flex items-end gap-1.5">
                <div className="text-[#1C1C1C] text-2xl font-bold">{activeTab === 'songs' ? filteredSongs.length : filteredVideos.length}</div>
                <div className="text-[#1C1C1C] text-sm font-bold mb-0.5">件</div>
              </div>
              <button
                onClick={handleCopyLink}
                className={`mb-1 flex items-center gap-1 text-[10px] md:text-xs font-bold bg-white border-[2px] border-[#1C1C1C] px-2 py-1 rounded-md transition-all ${copied ? 'bg-gray-100 translate-y-[2px] translate-x-[2px] shadow-none' : 'hover:bg-gray-100 shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none'}`}
              >
                <span>🔗</span>
                <span>{copied ? 'URLをコピーしました！' : '結果をシェア'}</span>
              </button>
            </div>

            <div className="w-full flex flex-col gap-4">

              {activeTab === 'songs' && filteredSongs.map((group) => (
                <div key={group.songId} className="w-full bg-white border-[2px] border-[#1C1C1C] rounded-xl flex flex-col overflow-hidden shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
                  <div className="px-3 py-2.5 md:px-4 md:py-3 flex flex-col bg-white">
                    <div className="text-[#1C1C1C] text-base md:text-lg font-bold leading-tight">{group.title}</div>
                    <div className="text-gray-600 text-xs font-normal mt-0.5">{group.artist}</div>
                  </div>

                  <div className="flex flex-col border-t-[2px] border-[#1C1C1C]">
                    {group.performances.map((perf, index) => {
                      const playButton = (
                        <a href={`https://youtu.be/${perf.video.youtubeId}${perf.startSeconds ? `?t=${perf.startSeconds}` : ''}`} target="_blank" rel="noopener noreferrer" className="h-7 px-4 bg-[#FF3366] border-[2px] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all rounded-lg flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </a>
                      );

                      return (
                        <div key={perf.id} className={`px-2.5 py-1.5 md:px-3.5 md:py-2 flex flex-col md:flex-row justify-between items-start gap-1 bg-[#FFFFFF] hover:bg-orange-50 transition-colors ${index !== group.performances.length - 1 ? 'border-b-[2px] border-[#1C1C1C] border-dashed' : ''}`}>

                          <div className="w-full flex-1 flex flex-col gap-0.5">
                            <div className="text-[#1C1C1C] text-[13px] md:text-sm font-bold leading-tight line-clamp-1">{perf.video.title}</div>

                            <div className="w-full flex flex-row justify-between items-start mt-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {perf.singers?.map(singer => {
                                  const memberDef = MEMBERS.find(m => m.name === singer);
                                  return (
                                    <div key={singer} className="px-1.5 py-[1px] rounded text-[9px] md:text-[10px] font-bold text-[#1C1C1C]" style={{ backgroundColor: memberDef?.color || '#D2DBF8' }}>
                                      {memberDef?.emoji} {singer}
                                    </div>
                                  );
                                })}
                                {perf.collaborators && (
                                  <div className="px-1.5 py-[1px] bg-[#D2DBF8] rounded text-[#1C1C1C] text-[9px] md:text-[10px] font-bold">
                                    🤝 {perf.collaborators}
                                  </div>
                                )}
                                <div className="text-[#1C1C1C] bg-[#D2DBF8] rounded text-[9px] md:text-[10px] font-bold px-1.5 py-[1px]">
                                  {perf.video.type[0]}
                                </div>
                                {(perf.video.isShorts === true || perf.video.type?.includes("Shorts")) && (
                                  <div className="px-1.5 py-[1px] bg-gray-200 rounded text-gray-600 text-[9px] md:text-[10px] font-bold">
                                    Shorts
                                  </div>
                                )}
                                <div className="text-gray-500 text-[10px] font-mono ml-1">{formatDate(perf.video.streamingDate)}</div>
                              </div>

                              <div className="md:hidden shrink-0 self-center">
                                {playButton}
                               </div>
                            </div>
                          </div>

                          <div className="hidden md:flex shrink-0 ml-1 self-center">
                            {playButton}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {activeTab === 'videos' && filteredVideos.map((video) => {
                const relatedPerformances = validPerformances.filter((p) => p.video.id === video.id).sort((a, b) => (a.startSeconds || 0) - (b.startSeconds || 0));

                const isShortsVideo = video.isShorts === true || video.type?.includes("Shorts");
                const isCompact = isShortsVideo || video.type?.some(t => ["歌ってみた", "オリジナル", "動画"].includes(t)) || relatedPerformances.length <= 1;

                if (isCompact) {
                  return (
                    <div key={video.id} className="w-full bg-white border-[2px] border-[#1C1C1C] rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,0.1)] flex flex-col md:flex-row overflow-hidden">

                      <div className="w-full md:w-2/5 p-3 md:p-4 flex flex-col gap-2 border-b-[2px] border-dashed md:border-b-0 md:border-r-[2px] md:border-solid border-[#1C1C1C] bg-white">
                        {playingVideo?.id === video.id ? (
                          <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
                            <iframe
                              src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1${playingVideo.startSeconds ? `&start=${playingVideo.startSeconds}` : ''}`}
                              title={video.title}
                              className="w-full h-full border-0"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                            <img
                              src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                              onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`; }}
                              alt={video.title}
                              className="w-full h-full object-cover opacity-95"
                            />
                            <div className="absolute bottom-1.5 right-1.5 bg-[#FF3366] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">YouTube</div>
                          </div>
                        )}

                        <div className="flex flex-col gap-1 px-0.5 mt-0.5">
                          <div className="text-[#1C1C1C] text-sm md:text-base font-bold leading-snug line-clamp-2">
                            <a href={`https://youtu.be/${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors underline decoration-2 underline-offset-2 decoration-transparent hover:decoration-blue-600">
                              {video.title}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="text-[#1C1C1C] bg-[#D2DBF8] rounded text-[9px] md:text-[10px] font-bold px-1.5 py-[1px]">
                              {video.type[0]}
                            </div>
                            {isShortsVideo && (
                              <div className="px-1.5 py-[1px] bg-gray-200 rounded text-gray-600 text-[9px] md:text-[10px] font-bold">
                                Shorts
                              </div>
                            )}
                            <div className="text-gray-500 text-xs font-mono ml-0.5">{formatDate(video.streamingDate)}</div>
                          </div>
                          <div className="flex items-start gap-1.5 mt-1.5">
                            <span className="text-xs shrink-0 mt-[1px]">📺</span>
                            {video.channel ? (
                              <a href={video.channel.url} target="_blank" rel="noopener noreferrer" className="text-[#1C1C1C] hover:text-blue-600 text-xs font-bold transition-colors underline break-words">
                                {video.channel.name}
                              </a>
                            ) : (
                              <span className="text-gray-500 text-xs font-bold mt-[1px]">未設定</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-3/5 flex flex-col bg-white">
                        {relatedPerformances.length === 1 ? (
                          <div className="px-3 py-2 md:px-4 flex justify-between items-center gap-2 bg-[#FFFFFF] hover:bg-orange-50 transition-colors w-full h-full">
                            <div className="flex-1 flex flex-col pr-2">
                              <div className="text-[#1C1C1C] text-[13px] md:text-sm font-bold leading-tight line-clamp-1">{relatedPerformances[0].song.title}</div>
                              <div className="text-gray-500 text-[10px] font-normal mt-0.5">{relatedPerformances[0].song.artist}</div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setPlayingVideo({ id: video.id, startSeconds: relatedPerformances[0]?.startSeconds || null });
                              }}
                              className="h-8 px-8 bg-[#FF3366] border-[2px] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all duration-200 rounded-xl flex items-center justify-center shrink-0"
                            >
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </button>
                          </div>
                        ) : (
                          <div className="px-3 py-2 md:px-4 flex justify-end items-center gap-2 bg-[#FFFFFF] hover:bg-gray-50 transition-colors w-full h-full">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setPlayingVideo({ id: video.id, startSeconds: null });
                              }}
                              className="h-8 px-8 bg-[#FF3366] border-[2px] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all duration-200 rounded-xl flex items-center justify-center shrink-0"
                            >
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={video.id} className="w-full bg-white border-[2px] border-[#1C1C1C] rounded-xl flex flex-col md:flex-row overflow-hidden shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">

                    <div className="w-full md:w-2/5 p-3 md:p-4 flex flex-col gap-2 border-b-[2px] border-dashed md:border-b-0 md:border-r-[2px] md:border-solid border-[#1C1C1C] bg-[#FFFFFF]">

                      {playingVideo?.id === video.id ? (
                        <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
                          <iframe
                            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1${playingVideo.startSeconds ? `&start=${playingVideo.startSeconds}` : ''}`}
                            title={video.title}
                            className="w-full h-full border-0"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                          <img
                            src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                            onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`; }}
                            alt={video.title}
                            className="w-full h-full object-cover opacity-95"
                          />
                          <div className="absolute bottom-1.5 right-1.5 bg-[#FF3366] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">YouTube</div>
                        </div>
                      )}

                      <div className="flex flex-col gap-1 px-0.5 mt-0.5">
                        <div className="text-[#1C1C1C] text-sm md:text-base font-bold leading-snug line-clamp-2">
                          <a href={`https://youtu.be/${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors underline decoration-2 underline-offset-2 decoration-transparent hover:decoration-blue-600">
                            {video.title}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="text-[#1C1C1C] bg-[#D2DBF8] rounded text-[9px] md:text-[10px] font-bold px-1.5 py-[1px]">
                            {video.type[0]}
                          </div>
                          {isShortsVideo && (
                            <div className="px-1.5 py-[1px] bg-gray-200 rounded text-gray-600 text-[9px] md:text-[10px] font-bold">
                              Shorts
                            </div>
                          )}
                          <div className="text-gray-500 text-xs font-mono ml-0.5">{formatDate(video.streamingDate)}</div>
                        </div>
                        <div className="flex items-start gap-1.5 mt-1.5">
                          <span className="text-xs shrink-0 mt-[1px]">📺</span>
                          {video.channel ? (
                            <a href={video.channel.url} target="_blank" rel="noopener noreferrer" className="text-[#1C1C1C] hover:text-blue-600 text-xs font-bold transition-colors underline break-words">
                              {video.channel.name}
                            </a>
                          ) : (
                            <span className="text-gray-500 text-xs font-bold mt-[1px]">未設定</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-3/5 flex flex-col bg-white">
                      <div className="px-3 py-2 md:px-4 border-b-[2px] border-[#1C1C1C] flex items-center gap-1.5 bg-white">
                        <div className="text-[#1C1C1C] text-base font-bold">{relatedPerformances.length}</div>
                        <div className="text-gray-600 text-xs font-normal mt-0.5">曲</div>
                      </div>

                      <div className="flex flex-col max-h-[240px] overflow-y-auto custom-scrollbar">
                        {relatedPerformances.length > 0 ? (
                          relatedPerformances.map((perf, index) => (
                            <div key={perf.id} className={`px-3 py-2 md:px-4 flex justify-between items-center gap-2 bg-[#FFFFFF] hover:bg-orange-50 transition-colors ${index !== relatedPerformances.length - 1 ? 'border-b-[2px] border-[#1C1C1C] border-dashed' : ''}`}>
                              <div className="flex-1 flex flex-col pr-2">
                                <div className="text-[#1C1C1C] text-[13px] md:text-sm font-bold leading-tight line-clamp-1">{perf.song.title}</div>
                                <div className="text-gray-500 text-[10px] font-normal mt-0.5">{perf.song.artist}</div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPlayingVideo({ id: video.id, startSeconds: perf.startSeconds || null });
                                }}
                                className="h-8 px-5 bg-[#FF3366] border-[2px] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all duration-200 rounded-lg flex items-center justify-center gap-1 shrink-0"
                              >
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                {perf.startSeconds && <div className="text-white text-[10px] md:text-xs font-bold font-mono ml-0.5">{formatTime(perf.startSeconds)}</div>}
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs font-normal text-gray-500 p-4 text-center">データがありません</div>
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

      <div className="fixed bottom-0 left-0 w-full z-50 pointer-events-none flex flex-col justify-end">
        <div className="w-full relative pointer-events-auto overflow-hidden">
          <div className={`w-full max-w-3xl mx-auto bg-[#F3F3F3] border-t-[2px] md:border-x-[2px] border-[#1C1C1C] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isFooterExpanded ? 'translate-y-0' : 'translate-y-full absolute bottom-0'}`}>
            <div className="p-4 pb-12 mx-auto text-[10px] text-[#1C1C1C] font-normal leading-relaxed flex flex-col gap-1.5">
              <p>※ このサイトは、ファンが制作・更新している非公式のファンサイトです。ご本人や所属事務所様とは一切関係ありません。各動画・楽曲の権利は各権利者様に帰属します。</p>
              <p>※ 最新の情報を登録・反映するまでには時間がかかることがあります。ゆるりとお待ち下さい。</p>
              <p>※ サイトのシェア・紹介は大歓迎です！ご自由にどうぞ。</p>
              <p>※ お問い合わせ、修正依頼などは <a href="https://x.com/asa_go_han_" target="_blank" rel="noopener noreferrer" className="text-[#FF9900] hover:underline font-bold">X(@asa_go_han_)</a>のDMにてお気軽にご連絡ください。</p>
            </div>
          </div>
          <div className="w-full bg-white relative z-10">
            <button
              onClick={() => setIsFooterExpanded(!isFooterExpanded)}
              className="w-full max-w-3xl mx-auto py-2.5 flex justify-center items-center gap-1.5 font-bold text-[10px] md:text-xs bg-white border-t-[2px] md:border-x-[2px] border-[#1C1C1C] hover:bg-gray-100 transition-colors"
            >
              <span className={`text-[9px] transition-transform duration-300 ${isFooterExpanded ? 'rotate-180' : ''}`}>▲</span>
              このサイトについて
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}